// src/lib/data/tagihan-actions.ts — orang tua membuat & membayar tagihan langganan.
//
// SEMUA nominal dihitung ULANG di sini dari master paket. Angka apa pun yang dikirim browser
// hanya pratinjau — kalau nominal dipercaya dari klien, orang tua bisa berlangganan Rp 0.
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getPaketMap } from './paket';
import { nilaiVoucherByKode } from './voucher';
import { hitungTagihan, type ItemTagihan } from '@/lib/domain/langganan-harga';

export interface HasilTagihanBaru {
  ok: boolean;
  error?: string;
  tagihanId?: string;
  total?: number;
}

/**
 * Buat tagihan dari pilihan paket per anak.
 * `pilihan` = { anakId: paketId }. Anak yang tidak dipilih tidak ikut ditagih.
 */
export async function buatTagihan(input: {
  pilihan: Record<string, string>;
  bulan?: number;
  kodeVoucher?: string;
}): Promise<HasilTagihanBaru> {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return { ok: false, error: 'Harus login.' };

    const anakIds = Object.keys(input.pilihan ?? {}).filter((k) => input.pilihan[k]);
    if (anakIds.length === 0) return { ok: false, error: 'Pilih paket untuk minimal satu anak.' };

    // Hanya anak milik ortu yang login — jangan percaya daftar id dari browser.
    const { data: anak } = await s.from('anak').select('id').in('id', anakIds).eq('ortu_id', user.id);
    const sah = new Set((anak ?? []).map((a) => a.id as string));
    if (sah.size === 0) return { ok: false, error: 'Anak tidak valid.' };

    const paketMap = await getPaketMap();
    const item: ItemTagihan[] = [];
    for (const anakId of anakIds) {
      if (!sah.has(anakId)) continue;
      const p = paketMap.get(input.pilihan[anakId]);
      if (!p || !p.aktif) return { ok: false, error: 'Paket tidak tersedia.' };
      item.push({ anakId, paket: p });
    }
    if (item.length === 0) return { ok: false, error: 'Pilih paket untuk minimal satu anak.' };

    const bulan = Math.max(1, Math.floor(input.bulan ?? 1));

    // Voucher: dinilai server (aktif, rentang tanggal, cakupan `langganan`, kuota) atas
    // nilai SETELAH diskon keluarga — sama seperti perhitungan yang ditampilkan ke ortu.
    const tanpaVoucher = hitungTagihan({ item, bulan });
    let voucherId: string | null = null;
    let voucherTipe: 'nominal' | 'persen' | null = null;
    let voucherNilai = 0;
    const kode = (input.kodeVoucher ?? '').trim();
    if (kode) {
      const dasar = Math.max(0, tanpaVoucher.subtotal - tanpaVoucher.diskonKeluarga);
      const rv = await nilaiVoucherByKode(s, kode, 'langganan', dasar, user.id);
      if (!rv.ok) return { ok: false, error: rv.error ?? 'Voucher tidak valid.' };
      voucherId = rv.voucher_id ?? null;
      // Potongan final dihitung ulang oleh `hitungTagihan` agar satu rumus saja yang berlaku.
      voucherTipe = 'nominal';
      voucherNilai = rv.potongan ?? 0;
    }

    const hasil = hitungTagihan({
      item, bulan,
      voucher: voucherTipe ? { tipe: voucherTipe, nilai: voucherNilai } : null,
    });

    const { data: tagihan, error } = await s.from('tagihan_langganan').insert({
      ortu_id: user.id,
      status: 'menunggu_bayar',
      subtotal: hasil.subtotal,
      diskon_keluarga: hasil.diskonKeluarga,
      voucher_id: voucherId,
      potongan_voucher: hasil.potonganVoucher,
      total: hasil.total,
      bulan,
    }).select('id').single();
    if (error) return { ok: false, error: error.message };

    const { error: eItem } = await s.from('tagihan_langganan_item').insert(
      item.map((it) => ({
        tagihan_id: tagihan.id, anak_id: it.anakId, paket_id: it.paket.id,
        harga: it.paket.harga_bulanan * bulan,
      })),
    );
    if (eItem) return { ok: false, error: eItem.message };

    if (voucherId) {
      await s.from('voucher_redeem').insert({
        voucher_id: voucherId, ortu_id: user.id, ref_tipe: 'langganan',
        ref_id: tagihan.id, potongan: hasil.potonganVoucher,
      });
    }

    revalidatePath('/langganan');
    return { ok: true, tagihanId: tagihan.id as string, total: hasil.total };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal membuat tagihan.' };
  }
}

/** Unggah bukti transfer → tagihan masuk antrean verifikasi admin. */
export async function unggahBuktiTagihan(tagihanId: string, buktiUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return { ok: false, error: 'Harus login.' };
    if (!buktiUrl.trim()) return { ok: false, error: 'Bukti pembayaran kosong.' };
    // Trigger `cegah_ubah_tagihan` (0090) yang menegakkan bahwa ortu hanya boleh menyentuh
    // bukti_url + transisi menunggu_bayar → menunggu_verifikasi.
    const { error } = await s.from('tagihan_langganan')
      .update({ bukti_url: buktiUrl.trim(), status: 'menunggu_verifikasi', updated_at: new Date().toISOString() })
      .eq('id', tagihanId).eq('ortu_id', user.id).eq('status', 'menunggu_bayar');
    if (error) return { ok: false, error: error.message };
    revalidatePath('/langganan');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal mengunggah bukti.' };
  }
}

/** Batalkan tagihan yang belum dibayar (mis. salah pilih paket). */
export async function batalkanTagihan(tagihanId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return { ok: false, error: 'Harus login.' };
    // Hapus baris redeem-nya dulu supaya kuota vouchernya kembali.
    await s.from('voucher_redeem').delete().eq('ref_tipe', 'langganan').eq('ref_id', tagihanId);
    const { error } = await s.from('tagihan_langganan').delete()
      .eq('id', tagihanId).eq('ortu_id', user.id).eq('status', 'menunggu_bayar');
    if (error) return { ok: false, error: error.message };
    revalidatePath('/langganan');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal membatalkan.' };
  }
}

/**
 * Pilih paket untuk periode BERIKUTNYA (turun/naik kelas yang berlaku saat perpanjangan).
 * Hak paket berjalan TIDAK berubah — itu sengaja: orang tua sudah membayar periode ini.
 */
export async function setPaketBerikutnya(anakId: string, paketId: string | null): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return { ok: false, error: 'Harus login.' };
    const { data: anak } = await s.from('anak').select('id').eq('id', anakId).eq('ortu_id', user.id).maybeSingle();
    if (!anak) return { ok: false, error: 'Anak tidak valid.' };
    // Trigger `cegah_ubah_langganan_anak` (0090) memastikan hanya kolom ini yang bisa
    // disentuh ortu — paket_id & aktif_sampai tetap milik admin.
    const { error } = await s.from('langganan_anak')
      .update({ paket_berikutnya_id: paketId, updated_at: new Date().toISOString() })
      .eq('anak_id', anakId).eq('ortu_id', user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/langganan');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan pilihan.' };
  }
}
