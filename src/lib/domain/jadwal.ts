// src/lib/domain/jadwal.ts — teks jadwal kelas ("1 Agustus 2026 · 09.00-11.00 WIB").
// Dipakai saat mencatat snapshot `pendaftaran_event.kelas_jadwal` (pendaftaran & pindah kelas).
import { formatTanggal } from '@/lib/format';

export function jadwalTeks(tgl: string | null, jm: string | null, js: string | null): string | null {
  const t = tgl ? formatTanggal(tgl) : '';
  const jam = jm || js ? `${jm ?? ''}${js ? `-${js}` : ''} WIB` : '';
  const gab = [t, jam].filter(Boolean).join(' · ');
  return gab || null;
}
