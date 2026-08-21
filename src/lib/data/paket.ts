// src/lib/data/paket.ts — baca master paket langganan.
//
// TOLERAN: tabel `paket_langganan` (migrasi 0089) mungkin belum ada saat kode ini tayang,
// karena migrasi dijalankan MANUAL setelah deploy. Bila belum ada, kembalikan daftar kosong —
// seluruh aplikasi harus tetap hidup, hanya belum mengenal paket apa pun (semua anak jatuh ke
// jalur trial).
import { createClient } from '@/lib/supabase/server';
import type { PaketLangganan } from '@/lib/game/tipe';

const COLS = 'id,kode,nama,deskripsi,benefit,harga_bulanan,diskon_keluarga,akses_ide_bermain,'
  + 'akses_game,akses_video,akses_komunitas,worksheet,konsultasi_gratis_jumlah,'
  + 'konsultasi_gratis_satuan,rapor_bulanan,urutan,aktif';
// Kolom kuota worksheet (0091) dibaca dengan cadangan: paket harus tetap terbaca bila
// migrasinya belum dijalankan.
const COLS_091 = `${COLS},worksheet_kuota_jumlah,worksheet_kuota_satuan`;

/** true bila error karena tabel/kolom paket belum ada (migrasi 0089 belum dijalankan). */
export function paketBelumSiap(err?: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === '42P01' || err.code === '42703' || /paket_langganan/.test(err.message ?? '');
}

export async function getPaketSemua(): Promise<PaketLangganan[]> {
  const s = await createClient();
  const coba = await s.from('paket_langganan').select(COLS_091).order('urutan');
  if (!coba.error) return (coba.data ?? []) as unknown as PaketLangganan[];

  const { data, error } = await s.from('paket_langganan').select(COLS).order('urutan');
  if (error) {
    // Jangan telan galat yang BUKAN soal migrasi — itu tanda ada masalah lain.
    if (!paketBelumSiap(error)) console.error('getPaketSemua:', error.message);
    return [];
  }
  // Tanpa kolom 0091: anggap tanpa batas, supaya perilaku lama (boolean worksheet) tetap.
  return (data ?? []).map((p) => ({
    ...(p as object), worksheet_kuota_jumlah: 0, worksheet_kuota_satuan: 'bulan',
  })) as unknown as PaketLangganan[];
}

/** Hanya paket aktif — untuk halaman pilih paket & form diskon per paket. */
export async function getPaketAktif(): Promise<PaketLangganan[]> {
  return (await getPaketSemua()).filter((p) => p.aktif);
}

/** Peta id → paket, dipakai modul hak akses. */
export async function getPaketMap(): Promise<Map<string, PaketLangganan>> {
  return new Map((await getPaketSemua()).map((p) => [p.id, p]));
}
