// src/lib/data/konsultasi-actions.ts — aksi konsultasi (daftar, chat, batal) — dipakai ortu & psikolog
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function sesi() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await s.from('profiles').select('nama_tampilan').eq('id', user.id).single();
  const nama = prof?.nama_tampilan?.trim() || 'Pengguna';
  return { s, userId: user.id, nama };
}

/** Customer daftar konsultasi. Validasi kuota/hari via RPC SECURITY DEFINER. */
export async function daftarKonsultasi(input: {
  psikologId: string; anakId: string; tanggal: string; jam: string; keluhan: string; voucherId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s } = await sesi();
    if (!input.psikologId || !input.anakId || !input.tanggal) return { ok: false, error: 'Lengkapi pilihan psikolog, anak, dan tanggal.' };
    const { error } = await s.rpc('daftar_konsultasi', {
      p_psikolog: input.psikologId,
      p_anak: input.anakId,
      p_tanggal: input.tanggal,
      p_keluhan: input.keluhan ?? '',
      p_jam: input.jam ?? '',
      // Harga, diskon member, kuota gratis paket, dan potongan voucher dihitung DI DALAM
      // RPC (SECURITY DEFINER). Klien hanya menyebut id vouchernya — bukan nominalnya.
      p_voucher: input.voucherId ?? null,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath('/konsultasi');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal mendaftar konsultasi.' };
  }
}

/** Kirim pesan chat (peserta sesi = ortu atau psikolog; dibatasi RLS). */
export async function kirimPesan(pendaftaranId: string, teks: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s, userId, nama } = await sesi();
    if (!teks.trim()) return { ok: false, error: 'Pesan kosong.' };
    // Bila pengirim adalah psikolog sesi ini, wajib punya izin fitur "chat".
    const { data: pd } = await s.from('pendaftaran_konsultasi').select('psikolog_id').eq('id', pendaftaranId).maybeSingle();
    if (pd?.psikolog_id === userId) {
      const { getFiturAkses } = await import('./pengaturan-menu');
      const { fiturUntukRole } = await import('@/lib/menu-admin');
      const { data: prof } = await s.from('profiles').select('is_admin,is_psikolog').eq('id', userId).single();
      const boleh = fiturUntukRole(await getFiturAkses(), { is_admin: prof?.is_admin, is_psikolog: prof?.is_psikolog });
      if (!boleh.has('chat')) return { ok: false, error: 'Fitur chat tidak diaktifkan untuk Anda.' };
    }
    const { error } = await s.from('pesan_konsultasi').insert({
      pendaftaran_id: pendaftaranId, pengirim_id: userId, nama, teks: teks.trim(),
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/konsultasi/${pendaftaranId}`);
    revalidatePath(`/psikolog/${pendaftaranId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal mengirim pesan.' };
  }
}

/** Selesaikan sesi (dipakai auto-selesai saat waktu habis; peserta mana pun boleh). Idempoten. */
export async function selesaikanKonsultasi(pendaftaranId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s } = await sesi();
    const { error } = await s.from('pendaftaran_konsultasi')
      .update({ status: 'selesai', updated_at: new Date().toISOString() })
      .eq('id', pendaftaranId).eq('status', 'diterima');
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/konsultasi/${pendaftaranId}`);
    revalidatePath(`/psikolog/${pendaftaranId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' };
  }
}

/** Tandai pesan lawan bicara sebagai dibaca. */
export async function tandaiDibaca(pendaftaranId: string): Promise<void> {
  const { s, userId } = await sesi();
  await s.from('pesan_konsultasi').update({ dibaca_at: new Date().toISOString() })
    .eq('pendaftaran_id', pendaftaranId).is('dibaca_at', null).neq('pengirim_id', userId);
}

/** Customer membatalkan booking yang belum/sudah diterima. */
export async function batalKonsultasi(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s, userId } = await sesi();
    const { error } = await s.from('pendaftaran_konsultasi')
      .update({ status: 'batal', updated_at: new Date().toISOString() })
      .eq('id', id).eq('ortu_id', userId).in('status', ['menunggu', 'diterima']);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/konsultasi');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal membatalkan.' };
  }
}

/**
 * Unggah bukti pembayaran sesi konsultasi.
 *
 * Trigger `cegah_ubah_konsultasi` (0092) yang menegakkan bahwa orang tua hanya boleh
 * menyentuh `bukti_url` — bukan nominal, bukan status. Jadi status TIDAK diubah di sini;
 * admin/psikolog yang memverifikasi.
 */
export async function unggahBuktiKonsultasi(pendaftaranId: string, buktiUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s, userId } = await sesi();
    if (!buktiUrl.trim()) return { ok: false, error: 'Bukti pembayaran kosong.' };
    const { error } = await s.from('pendaftaran_konsultasi')
      .update({ bukti_url: buktiUrl.trim(), updated_at: new Date().toISOString() })
      .eq('id', pendaftaranId).eq('ortu_id', userId).eq('status', 'menunggu_bayar');
    if (error) return { ok: false, error: error.message };
    revalidatePath('/konsultasi');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal mengunggah bukti.' };
  }
}
