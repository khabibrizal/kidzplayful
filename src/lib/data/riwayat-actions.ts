// src/lib/data/riwayat-actions.ts — server action utk dipanggil dari Client (Mode Anak)
'use server';
import { rekamRiwayat } from './riwayat-kelas';

export async function catatRiwayatKelas(kelasId: string): Promise<void> {
  await rekamRiwayat(kelasId);
}
