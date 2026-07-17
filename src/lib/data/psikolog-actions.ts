// src/lib/data/psikolog-actions.ts — aksi area Psikolog (jadwal, status konsultasi, rekomendasi)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ButirRekomendasi, StatusKonsultasi } from '@/lib/game/tipe';

// Guard: user harus psikolog. Kembalikan client + id + nama.
async function psikolog() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_psikolog,nama_tampilan').eq('id', user.id).single();
  if (!prof?.is_psikolog) throw new Error('Tidak berwenang.');
  return { s, id: user.id, nama: (prof.nama_tampilan as string) || 'Psikolog' };
}

/** Simpan jadwal & kuota psikolog (upsert satu baris per psikolog). */
export async function simpanJadwal(input: {
  hariBuka: number[]; jamMulai: string; jamSelesai: string; maksPerHari: number; durasiMenit: number; aktif: boolean; catatan: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s, id, nama } = await psikolog();
    const { error } = await s.from('jadwal_psikolog').upsert({
      psikolog_id: id,
      nama,
      hari_buka: input.hariBuka.filter((h) => h >= 0 && h <= 6),
      jam_mulai: input.jamMulai.trim() || null,
      jam_selesai: input.jamSelesai.trim() || null,
      maks_per_hari: Math.max(0, Math.floor(input.maksPerHari || 0)),
      durasi_menit: Math.max(0, Math.floor(input.durasiMenit || 0)),
      aktif: input.aktif,
      catatan: input.catatan.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'psikolog_id' });
    if (error) return { ok: false, error: error.message };
    revalidatePath('/psikolog/jadwal');
    revalidatePath('/psikolog');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan jadwal.' };
  }
}

/** Ubah status pendaftaran konsultasi (terima/tolak/selesai). */
export async function setStatusKonsultasi(id: string, status: StatusKonsultasi): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s } = await psikolog();
    if (!['diterima', 'ditolak', 'selesai'].includes(status)) return { ok: false, error: 'Status tidak valid.' };
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'diterima') patch.diverifikasi_pada = new Date().toISOString();
    const { error } = await s.from('pendaftaran_konsultasi').update(patch).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/psikolog');
    revalidatePath(`/psikolog/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal mengubah status.' };
  }
}

/** Mulai sesi konsultasi (psikolog): set waktu mulai + snapshot durasi dari jadwal. */
export async function mulaiKonsultasi(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s, id: uid } = await psikolog();
    const { data: j } = await s.from('jadwal_psikolog').select('durasi_menit').eq('psikolog_id', uid).maybeSingle();
    const durasi = Math.max(0, Math.floor((j?.durasi_menit as number) ?? 0));
    const { error } = await s.from('pendaftaran_konsultasi')
      .update({ dimulai_pada: new Date().toISOString(), durasi_menit: durasi, updated_at: new Date().toISOString() })
      .eq('id', id).eq('psikolog_id', uid).eq('status', 'diterima').is('dimulai_pada', null);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/psikolog/${id}`);
    revalidatePath(`/konsultasi/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal memulai sesi.' };
  }
}

/** Simpan/kirim rekomendasi ("resep") untuk seorang anak. */
export async function simpanRekomendasi(input: {
  anakId: string; ortuId: string; pendaftaranId: string | null;
  judul: string; isi: string; butir: ButirRekomendasi[];
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s, id, nama } = await psikolog();
    const butir = (input.butir ?? [])
      .map((b) => ({ judul: b.judul.trim(), isi: b.isi.trim() }))
      .filter((b) => b.judul || b.isi);
    if (!input.judul.trim() && !input.isi.trim() && butir.length === 0) {
      return { ok: false, error: 'Rekomendasi masih kosong.' };
    }
    const { error } = await s.from('rekomendasi_psikolog').insert({
      anak_id: input.anakId,
      ortu_id: input.ortuId,
      psikolog_id: id,
      pendaftaran_id: input.pendaftaranId,
      judul: input.judul.trim() || null,
      isi: input.isi.trim() || null,
      butir,
      dinilai_oleh: nama,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/psikolog/${input.pendaftaranId ?? ''}`);
    revalidatePath(`/anak/${input.anakId}/laporan`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan rekomendasi.' };
  }
}
