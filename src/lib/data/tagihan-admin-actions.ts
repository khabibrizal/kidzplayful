// src/lib/data/tagihan-admin-actions.ts — admin memverifikasi / menolak tagihan langganan.
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { catatLedger, hapusLedgerRef } from './ledger';
import { setPaketAnak } from './langganan-anak-actions';
import { getPaketMap } from './paket';
import { hitungPotongan } from '@/lib/domain/voucher';
import { hitungTagihan, type ItemTagihan } from '@/lib/domain/langganan-harga';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser,nama_tampilan,email').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) throw new Error('Bukan admin');
  const oleh = (prof.nama_tampilan as string | null)?.trim() || (prof.email as string | null) || null;
  return { s, adminId: user.id, oleh };
}

/**
 * Verifikasi tagihan: setiap ITEM diaktifkan pada anaknya masing-masing.
 *
 * Sengaja memanggil `setPaketAnak` (sub-proyek A1) alih-alih menulis `langganan_anak`
 * langsung, supaya aturan "perpanjang dari max(hari ini, aktif_sampai)" hanya ada di SATU
 * tempat. Menyalinnya ke sini akan membuat dua jalur yang bisa lepas sinkron.
 *
 * Ledger dicatat SEBESAR `total` (net setelah diskon keluarga & voucher) — sama seperti
 * jalur event & store, karena laporan keuangan berbasis kas: yang masuk rekening itulah
 * yang dicatat.
 */
export async function verifikasiTagihan(tagihanId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s, adminId, oleh } = await adminDb();
    const { data: t } = await s.from('tagihan_langganan')
      .select('id,ortu_id,status,subtotal,diskon_keluarga,voucher_id,potongan_voucher,total,bulan,bukti_url')
      .eq('id', tagihanId).maybeSingle();
    if (!t) return { ok: false, error: 'Tagihan tidak ditemukan.' };
    if (t.status === 'diterima') return { ok: true };   // idempoten

    const { data: item } = await s.from('tagihan_langganan_item')
      .select('anak_id,paket_id,harga').eq('tagihan_id', tagihanId);
    if (!item?.length) return { ok: false, error: 'Tagihan tidak punya rincian anak.' };

    const bulan = (t.bulan as number) ?? 1;

    // ——— Buktikan ULANG nominalnya sebelum apa pun diberikan ———
    //
    // Policy INSERT hanya memastikan `ortu_id = auth.uid()`, jadi orang tua BISA memasukkan
    // baris tagihan langsung lewat REST dengan angka karangan (mis. total 0). Trigger 0090
    // hanya menjaga UPDATE. Verifikasi adalah satu-satunya titik di mana uang dicatat dan hak
    // akses diberikan — jadi di sinilah angkanya wajib dibuktikan ulang.
    //
    // Dasarnya HARGA SNAPSHOT di rincian (`item.harga`), bukan harga master saat ini: kalau
    // memakai harga master, mengubah harga paket akan membuat tagihan LAMA yang sah ikut
    // ditolak padahal orang tua sudah membayar harga yang berlaku saat itu. Aturan diskon
    // keluarga tetap diambil dari master, dan snapshot harga yang tak wajar tetap terlihat
    // admin karena rinciannya ditampilkan per anak di antrean verifikasi.
    const paketMap = await getPaketMap();
    const itemHitung: ItemTagihan[] = [];
    for (const it of item) {
      const p = it.paket_id ? paketMap.get(it.paket_id as string) : undefined;
      if (!p) return { ok: false, error: 'Paket pada tagihan ini sudah tidak ada — minta orang tua membuat tagihan baru.' };
      // `bulan` sudah termasuk di dalam snapshot harga, jadi hitung dengan bulan = 1.
      itemHitung.push({ anakId: it.anak_id as string, paket: { ...p, harga_bulanan: (it.harga as number) ?? 0 } });
    }
    const dasar = hitungTagihan({ item: itemHitung, bulan: 1 });

    // Potongan voucher juga dihitung ulang dari baris vouchernya; tanpa voucher harus 0.
    let potonganSah = 0;
    const voucherId = (t as { voucher_id?: string | null }).voucher_id ?? null;
    if (voucherId) {
      const { data: v } = await s.from('voucher').select('tipe,nilai').eq('id', voucherId).maybeSingle();
      if (!v) return { ok: false, error: 'Voucher pada tagihan ini tidak ditemukan.' };
      potonganSah = hitungPotongan(
        { tipe: v.tipe as 'nominal' | 'persen', nilai: (v.nilai as number) ?? 0 },
        Math.max(0, dasar.subtotal - dasar.diskonKeluarga),
      );
    }
    const totalSah = Math.max(0, dasar.subtotal - dasar.diskonKeluarga - potonganSah);
    const tersimpan = {
      subtotal: (t.subtotal as number) ?? 0,
      diskon: (t.diskon_keluarga as number) ?? 0,
      voucher: (t.potongan_voucher as number) ?? 0,
      total: (t.total as number) ?? 0,
    };
    if (tersimpan.subtotal !== dasar.subtotal || tersimpan.diskon !== dasar.diskonKeluarga
        || tersimpan.voucher !== potonganSah || tersimpan.total !== totalSah) {
      return {
        ok: false,
        error: `Nominal tagihan tidak cocok dengan harga paket saat ini (tersimpan ${tersimpan.total}, seharusnya ${totalSah}). `
             + 'Jangan diverifikasi — minta orang tua membuat tagihan baru.',
      };
    }
    for (const it of item) {
      const paketId = it.paket_id as string | null;
      if (!paketId) continue;
      const r = await setPaketAnak(it.anak_id as string, paketId, bulan);
      if (!r.ok) return { ok: false, error: `Gagal mengaktifkan salah satu anak: ${r.error}` };
      // Pilihan "paket berikutnya" sudah terpakai pada perpanjangan ini → dikosongkan.
      await s.from('langganan_anak').update({ paket_berikutnya_id: null }).eq('anak_id', it.anak_id as string);
    }

    const { error } = await s.from('tagihan_langganan').update({
      status: 'diterima', alasan_tolak: null,
      diverifikasi_pada: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', tagihanId);
    if (error) return { ok: false, error: error.message };

    // Riwayat pembayaran membership + pemasukan (basis kas).
    try {
      await s.from('pembayaran_langganan').insert({
        ortu_id: t.ortu_id as string, nominal: (t.total as number) ?? 0,
        periode_mulai: new Date().toISOString().slice(0, 10), metode: 'transfer',
      });
    } catch { /* abaikan bila tabel 0052 belum ada */ }
    await catatLedger(s, {
      arah: 'masuk', kategori: 'membership', jumlah: (t.total as number) ?? 0,
      ref_tipe: 'tagihan_langganan', ref_id: tagihanId,
      keterangan: `Langganan ${item.length} anak (${bulan} bln)`,
      metode: 'transfer', lampiran_url: (t.bukti_url as string | null) ?? null,
      pic: oleh, dibuat_oleh: adminId,
    });

    revalidatePath('/admin/langganan'); revalidatePath('/langganan'); revalidatePath('/pilih-anak');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal memverifikasi.' };
  }
}

/** Tolak tagihan: ledger dihapus & kuota voucher dilepas. */
export async function tolakTagihan(tagihanId: string, alasan: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s } = await adminDb();
    const alsn = alasan.trim();
    if (!alsn) return { ok: false, error: 'Alasan penolakan wajib diisi (tampil ke orang tua).' };
    const { error } = await s.from('tagihan_langganan').update({
      status: 'ditolak', alasan_tolak: alsn, updated_at: new Date().toISOString(),
    }).eq('id', tagihanId);
    if (error) return { ok: false, error: error.message };
    await hapusLedgerRef(s, 'tagihan_langganan', tagihanId);
    // Kuota voucher dilepas supaya kodenya bisa dipakai lagi — pola yang sama dengan
    // penolakan pendaftaran event.
    await s.from('voucher_redeem').delete().eq('ref_tipe', 'langganan').eq('ref_id', tagihanId);
    revalidatePath('/admin/langganan'); revalidatePath('/langganan');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menolak.' };
  }
}
