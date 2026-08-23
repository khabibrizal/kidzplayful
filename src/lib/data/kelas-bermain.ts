import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';
const COLS = 'id,judul,sampul_url,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';
// Kolom 0098 dibaca dengan CADANGAN: halaman admin tak boleh mati bila migrasinya
// belum dijalankan di lingkungan tertentu.
const COLS_098 = `${COLS},bulan_kurikulum,urutan,kategori_usia_id`;
// 0105 — `jenis`. Halaman admin memang perlu MELIHAT materi event, jadi tak ada penyaringan
// di sini; yang menyaring adalah katalog pengguna (`publik.ts`).
const COLS_105 = `${COLS_098},jenis`;

async function ambilKelas(urut: 'kurikulum' | 'baru', hanyaAktif: boolean): Promise<KelasBermain[]> {
  const s = await createClient();
  const dasar = (cols: string) => {
    const q = s.from('kelas_bermain');
    return hanyaAktif ? q.select(cols).eq('status', 'aktif') : q.select(cols);
  };
  const urutkan = (cols: string) => (urut === 'kurikulum'
    ? dasar(cols).order('bulan_kurikulum', { ascending: true }).order('urutan', { ascending: true })
    : dasar(cols).order('created_at', { ascending: false }));
  const j105 = await urutkan(COLS_105);
  if (!j105.error) return (j105.data ?? []) as unknown as KelasBermain[];
  const coba = await urutkan(COLS_098);
  if (!coba.error) return (coba.data ?? []) as unknown as KelasBermain[];
  const q2 = s.from('kelas_bermain');
  const mundur = hanyaAktif
    ? await q2.select(COLS).eq('status', 'aktif').order('created_at', { ascending: false })
    : await q2.select(COLS).order('created_at', { ascending: false });
  return (mundur.data ?? []) as unknown as KelasBermain[];
}

export async function getKelasAktif(): Promise<KelasBermain[]> {
  return ambilKelas('kurikulum', true);
}
/** Semua materi untuk halaman admin — diurutkan menurut kurikulum (bulan, urutan). */
export async function getKelasSemua(): Promise<KelasBermain[]> {
  return ambilKelas('kurikulum', false);
}
