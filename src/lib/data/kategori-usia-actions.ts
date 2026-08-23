// src/lib/data/kategori-usia-actions.ts — CRUD master Kategori Usia (admin)
'use server';
import { revalidatePath, updateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return s;
}

function segarkan() {
  revalidatePath('/admin/kategori-usia');
  revalidatePath('/admin/tema', 'layout');        // form game memuat daftar kategori
  revalidatePath('/admin/kelas-bermain');         // kartu Ide Bermain menampilkan rentangnya
  updateTag('katalog');                           // katalog publik ter-cache (publik.ts)
}

function bersihkanRange(min: number, max: number): { min: number; max: number } {
  const lo = Math.max(0, Math.min(12, Math.floor(Number(min) || 0)));
  const hi = Math.max(0, Math.min(12, Math.floor(Number(max) || 0)));
  return lo <= hi ? { min: lo, max: hi } : { min: hi, max: lo };
}

export async function buatKategoriUsia(nama: string, usiaMin: number, usiaMax: number, urutan: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const n = nama.trim();
    if (!n) return { ok: false, error: 'Nama kategori wajib diisi.' };
    const { min, max } = bersihkanRange(usiaMin, usiaMax);
    const { error } = await s.from('kategori_usia').insert({ nama: n, usia_min: min, usia_max: max, urutan: Math.floor(urutan) || 0 });
    if (error) return { ok: false, error: error.message };
    segarkan();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menambah kategori.' };
  }
}

/**
 * Ubah satu kategori usia.
 *
 * `ikut` = berapa materi/game yang snapshot rentang usianya ikut disegarkan. Dilaporkan
 * supaya admin tahu perubahannya menjalar, bukan berhenti di baris master.
 */
export async function updateKategoriUsia(id: string, patch: { nama?: string; usiaMin?: number; usiaMax?: number; urutan?: number; aktif?: boolean }): Promise<{ ok: boolean; error?: string; ikut?: number }> {
  try {
    const s = await adminDb();
    const upd: Record<string, unknown> = {};
    if (patch.nama !== undefined) { const n = patch.nama.trim(); if (!n) return { ok: false, error: 'Nama kategori wajib diisi.' }; upd.nama = n; }
    if (patch.usiaMin !== undefined || patch.usiaMax !== undefined) {
      const cur = await s.from('kategori_usia').select('usia_min,usia_max').eq('id', id).single();
      const { min, max } = bersihkanRange(patch.usiaMin ?? cur.data?.usia_min ?? 0, patch.usiaMax ?? cur.data?.usia_max ?? 6);
      upd.usia_min = min; upd.usia_max = max;
    }
    if (patch.urutan !== undefined) upd.urutan = Math.floor(patch.urutan) || 0;
    if (patch.aktif !== undefined) upd.aktif = patch.aktif;
    if (!Object.keys(upd).length) return { ok: true };
    const { error } = await s.from('kategori_usia').update(upd).eq('id', id);
    if (error) return { ok: false, error: error.message };

    // 🐞 Rentang berubah → SNAPSHOT di materi & game kategori ini ikut disegarkan.
    //
    // Sebelumnya master diubah sendirian, dan snapshot di `kelas_bermain`/`paket_aset`
    // tertinggal di angka lama. Admin melihat kategori sudah "2–3 th" tapi kartu Ide
    // Bermain tetap menulis "1–3 th", dan menyimpan ulang materinya pun tak menolong
    // (form mengirim balik nilai lamanya). Angka yang membangkang tanpa galat adalah cara
    // tercepat membuat orang berhenti percaya pada halaman admin.
    //
    // Migrasi 0101 sengaja TIDAK mengikat snapshot ke master supaya materi yang sudah
    // tayang tak berubah diam-diam. Yang berubah di sini bukan prinsip itu: penyegaran
    // hanya terjadi saat admin MEMANG mengubah rentangnya — tindakan sadar, bukan efek
    // samping. Jumlah baris yang ikut berubah dilaporkan balik supaya tak senyap.
    let ikut = 0;
    if (upd.usia_min !== undefined) {
      const rentang = { usia_min: upd.usia_min as number, usia_max: upd.usia_max as number };
      for (const tabel of ['kelas_bermain', 'paket_aset'] as const) {
        // Toleran: kolomnya bisa belum ada (0079/0101 belum dijalankan di lingkungan itu),
        // dan itu tak boleh menggagalkan penyimpanan kategorinya.
        const r = await s.from(tabel).update(rentang).eq('kategori_usia_id', id).select('id');
        if (!r.error) ikut += (r.data ?? []).length;
      }
    }
    segarkan();
    return { ok: true, ikut };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan.' };
  }
}

/** Hapus kategori. Game yang memakainya di-set null (usia_min/max snapshot tetap ada). */
export async function hapusKategoriUsia(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const { error } = await s.from('kategori_usia').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    segarkan();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menghapus.' };
  }
}
