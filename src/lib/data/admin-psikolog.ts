// src/lib/data/admin-psikolog.ts — kelola akun psikolog (admin)
import { createClient } from '@/lib/supabase/server';

export interface PsikologRow {
  id: string; email: string | null; nama_tampilan: string | null;
  /** tarif per sesi — diatur ADMIN (0092); 0 = pakai tarif bawaan global */
  harga_konsultasi?: number;
  /** diskon member; null = ikut bawaan global */
  diskon_langganan_persen?: number | null;
  /** true bila psikolog sudah membuka jadwal (mempengaruhi bisa/tidaknya dibooking) */
  ada_jadwal?: boolean;
}

export async function getDaftarPsikolog(): Promise<PsikologRow[]> {
  const s = await createClient();
  const { data } = await s.from('profiles').select('id,email,nama_tampilan').eq('is_psikolog', true).order('email');
  const baris = (data ?? []) as unknown as PsikologRow[];
  if (baris.length === 0) return baris;

  // Tarif ada di `jadwal_psikolog` (kolom 0092) tapi DIISI ADMIN. Dibaca terpisah &
  // toleran: bila migrasinya belum dijalankan, daftar psikolog tetap tampil.
  try {
    const { data: jadwal } = await s.from('jadwal_psikolog')
      .select('psikolog_id,harga_konsultasi,diskon_langganan_persen,hari_buka')
      .in('psikolog_id', baris.map((p) => p.id));
    const peta = new Map((jadwal ?? []).map((j) => [j.psikolog_id as string, j]));
    for (const p of baris) {
      const j = peta.get(p.id);
      p.harga_konsultasi = (j?.harga_konsultasi as number | undefined) ?? 0;
      p.diskon_langganan_persen = (j?.diskon_langganan_persen as number | null | undefined) ?? null;
      p.ada_jadwal = ((j?.hari_buka as number[] | undefined) ?? []).length > 0;
    }
  } catch { /* migrasi 0092 belum dijalankan */ }
  return baris;
}
