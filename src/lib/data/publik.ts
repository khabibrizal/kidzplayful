// src/lib/data/publik.ts — katalog publik dengan cache lintas-user (unstable_cache).
// Pakai client anon (tanpa cookie) supaya bisa di-cache. Invalidasi via revalidateTag('katalog').
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import type { EventKelas, Produk, KelasBermain } from '@/lib/game/tipe';

const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

const E = 'id,judul,lokasi,tanggal,jam_mulai,jam_selesai,deskripsi,gambar_url,harga_per_anak,diskon_langganan_persen,status';
const P = 'id,nama,deskripsi,kategori,harga,diskon_trial_persen,diskon_langganan_persen,berat_gram,stok,terjual,gambar_url,status';
const K = 'id,judul,sampul_url,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';

// Kolom migrasi 0089. Dibaca dengan CADANGAN: bila migrasinya belum dijalankan, `select`
// dengan kolom ini gagal 42703 — dan katalog tidak boleh mati hanya karena itu.
const E_089 = `${E},diskon_paket`;
const P_089 = `${P},diskon_paket`;
const K_089 = `${K},worksheet_terbuka`;
// Kolom migrasi 0098 (kurikulum bulanan). URUTANNYA pun ikut berubah, jadi ini tak cukup
// ditangani `pilihToleran` yang hanya menukar daftar kolom — lihat `getKelasAktifCached`.
const K_098 = `${K_089},bulan_kurikulum,urutan`;

/**
 * Coba `select` dengan kolom baru; bila gagal (mis. 42703 karena migrasi 0089 belum
 * dijalankan), ulangi tanpa kolom itu. `ambil` menerima daftar kolom dan mengembalikan
 * hasil query yang sudah tersaring & terurut.
 */
async function pilihToleran<T>(
  ambil: (cols: string) => PromiseLike<{ data: unknown; error: unknown }>,
  colsBaru: string,
  colsLama: string,
): Promise<T[]> {
  const coba = await ambil(colsBaru);
  if (!coba.error) return ((coba.data ?? []) as T[]);
  const lagi = await ambil(colsLama);
  return ((lagi.data ?? []) as T[]);
}

export const getEventTampilCached = unstable_cache(
  async (): Promise<EventKelas[]> => {
    return pilihToleran<EventKelas>(
      (cols) => anon.from('event').select(cols).eq('status', 'tampil').order('tanggal', { ascending: true }),
      E_089, E);
  },
  ['katalog-event'], { tags: ['katalog'], revalidate: 60 },
);

export const getProdukTampilCached = unstable_cache(
  async (): Promise<Produk[]> => {
    return pilihToleran<Produk>(
      (cols) => anon.from('produk').select(cols).eq('status', 'tampil').order('created_at', { ascending: false }),
      P_089, P);
  },
  ['katalog-produk'], { tags: ['katalog'], revalidate: 60 },
);

export const getKelasAktifCached = unstable_cache(
  async (): Promise<KelasBermain[]> => {
    // Urutan kurikulum: bulan lalu urutan di dalam bulan. Bila kolom 0098 belum ada,
    // `order('bulan_kurikulum')` ikut gagal — bukan hanya `select`-nya — jadi cadangannya
    // memakai urutan lama (created_at). Tema tanpa `bulan_kurikulum` dianggap TERBUKA oleh
    // `statusTema`, sehingga katalog tetap utuh sampai migrasinya dijalankan.
    const baru = await anon.from('kelas_bermain').select(K_098).eq('status', 'aktif')
      .order('bulan_kurikulum', { ascending: true }).order('urutan', { ascending: true });
    if (!baru.error) return (baru.data ?? []) as unknown as KelasBermain[];
    return pilihToleran<KelasBermain>(
      (cols) => anon.from('kelas_bermain').select(cols).eq('status', 'aktif').order('created_at', { ascending: false }),
      K_089, K);
  },
  ['katalog-kelas'], { tags: ['katalog'], revalidate: 60 },
);

// —— Teaser publik (halaman /coba/*): metadata ringan, tanpa butir/materi penuh ——
export async function getKelasPublik(id: string): Promise<{ id: string; judul: string; tujuan: string | null; usia_min: number; usia_max: number; sampul_url: string | null } | null> {
  const { data } = await anon.from('kelas_bermain')
    .select('id,judul,tujuan,usia_min,usia_max,sampul_url')
    .eq('id', id).eq('status', 'aktif').maybeSingle();
  return (data ?? null) as { id: string; judul: string; tujuan: string | null; usia_min: number; usia_max: number; sampul_url: string | null } | null;
}

export async function getTemaPublik(id: string): Promise<{ id: string; nama: string; sampul: string | null; game: string[] } | null> {
  const [{ data: tema }, { data: paket }] = await Promise.all([
    anon.from('tema').select('id,nama,sampul').eq('id', id).eq('status', 'disetujui').maybeSingle(),
    anon.from('paket_aset').select('judul').eq('tema_id', id).eq('status', 'disetujui').order('urutan'),
  ]);
  if (!tema) return null;
  return { id: tema.id as string, nama: tema.nama as string, sampul: (tema.sampul as string) ?? null, game: (paket ?? []).map((p) => p.judul as string) };
}
