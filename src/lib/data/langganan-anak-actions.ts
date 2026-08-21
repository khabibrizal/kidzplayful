// src/lib/data/langganan-anak-actions.ts — admin menetapkan paket & periode PER ANAK.
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { tanggalWIB } from '@/lib/domain/gamifikasi';
import { tambahHari } from '@/lib/domain/entitlement';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) throw new Error('Bukan admin');
  return s;
}

/**
 * Aktifkan / perpanjang langganan seorang anak selama `bulan` bulan.
 *
 * Perpanjangan dihitung dari **max(hari ini, aktif_sampai)** — BUKAN dari hari ini. Perilaku
 * lama `aktifkanLangganan` menyetel `hari ini + 1 bulan`, sehingga orang tua yang membayar
 * lebih awal KEHILANGAN sisa harinya. Dengan langganan per anak, kekeliruan itu akan sering
 * terasa dan langsung terbaca sebagai kecurangan.
 */
export async function setPaketAnak(
  anakId: string, paketId: string, bulan = 1,
): Promise<{ ok: boolean; error?: string; aktifSampai?: string }> {
  try {
    const s = await adminDb();
    const { data: anak } = await s.from('anak').select('id,ortu_id').eq('id', anakId).maybeSingle();
    if (!anak) return { ok: false, error: 'Anak tidak ditemukan.' };

    const { data: lama, error: eBaca } = await s.from('langganan_anak')
      .select('aktif_sampai').eq('anak_id', anakId).maybeSingle();
    if (eBaca) return { ok: false, error: 'Tabel langganan per anak belum ada — jalankan migrasi 0089 dulu.' };

    // Tanggal dihitung dalam WIB. Dengan `new Date()` mentah, aktivasi antara 00:00–07:00
    // WIB memakai tanggal UTC yang masih KEMARIN sehingga periodenya kurang satu hari.
    const hariIni = tanggalWIB();
    const lamaSampai = (lama?.aktif_sampai as string | null) ?? null;
    const mulai = lamaSampai && lamaSampai > hariIni ? lamaSampai : hariIni;
    const sampai = new Date(mulai + 'T00:00:00Z');
    sampai.setUTCMonth(sampai.getUTCMonth() + Math.max(1, Math.floor(bulan)));
    const aktifSampai = sampai.toISOString().slice(0, 10);

    const { error } = await s.from('langganan_anak').upsert({
      anak_id: anakId, ortu_id: anak.ortu_id as string, paket_id: paketId,
      aktif_sampai: aktifSampai, updated_at: new Date().toISOString(),
    }, { onConflict: 'anak_id' });
    if (error) return { ok: false, error: error.message };

    revalidatePath('/admin/langganan'); revalidatePath('/pilih-anak');
    return { ok: true, aktifSampai };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menetapkan paket.' };
  }
}

/**
 * Hentikan langganan seorang anak — berlaku SEKARANG.
 *
 * Dua hal yang dulu membuat tombol ini seolah tak berfungsi:
 *
 * 1. `aktif_sampai` disetel ke **hari ini**, dan hari itu masih dihitung sebagai hari aktif
 *    (`aktif_sampai >= current_date` di RPC konsultasi) — jadi anak yang baru "dihentikan"
 *    tetap memakai kuota konsultasi gratis & diskon membernya. Sekarang periodenya diakhiri
 *    **kemarin** menurut WIB.
 * 2. `paket_id` dibiarkan terisi, sehingga anak itu jatuh ke masa **tenggang** dan hak
 *    berbayarnya tetap PENUH selama TENGGANG_HARI hari. Penghentian bukan kelupaan bayar,
 *    jadi `paket_id` dikosongkan supaya tenggang tak berlaku. Riwayat pembayaran tetap utuh
 *    di `pembayaran_langganan` & `tagihan_langganan` — tabel ini menyimpan keadaan SEKARANG,
 *    bukan riwayat.
 *
 * `paket_berikutnya_id` tidak disentuh: itu pilihan orang tua untuk periode depan dan tak
 * memberi hak apa pun sampai ada tagihan yang diverifikasi.
 */
export async function hentikanPaketAnak(anakId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const { data, error } = await s.from('langganan_anak')
      .update({
        paket_id: null,
        aktif_sampai: tambahHari(tanggalWIB(), -1),
        updated_at: new Date().toISOString(),
      })
      .eq('anak_id', anakId)
      .select('anak_id');
    if (error) return { ok: false, error: error.message };
    // 0 baris = tak ada langganan yang dihentikan. Dulu tetap dilaporkan "dihentikan",
    // sehingga admin percaya sesuatu berubah padahal tidak.
    if (!data || data.length === 0) {
      return { ok: false, error: 'Anak ini belum punya baris langganan — tak ada yang dihentikan.' };
    }
    revalidatePath('/admin/langganan'); revalidatePath('/pilih-anak'); revalidatePath('/langganan');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' };
  }
}
