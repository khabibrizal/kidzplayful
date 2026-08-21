// src/lib/data/tagihan-admin-actions.ts — admin memverifikasi / menolak tagihan langganan.
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { catatLedger, hapusLedgerRef } from './ledger';
import { setPaketAnak } from './langganan-anak-actions';

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
      .select('id,ortu_id,status,total,bulan,bukti_url').eq('id', tagihanId).maybeSingle();
    if (!t) return { ok: false, error: 'Tagihan tidak ditemukan.' };
    if (t.status === 'diterima') return { ok: true };   // idempoten

    const { data: item } = await s.from('tagihan_langganan_item')
      .select('anak_id,paket_id').eq('tagihan_id', tagihanId);
    if (!item?.length) return { ok: false, error: 'Tagihan tidak punya rincian anak.' };

    const bulan = (t.bulan as number) ?? 1;
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
