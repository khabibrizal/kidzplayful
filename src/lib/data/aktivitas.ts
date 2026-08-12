// src/lib/data/aktivitas.ts — baca ringkasan aktivitas untuk analitik (admin)
import { createClient } from '@/lib/supabase/server';
import { tanggalWIB } from '@/lib/domain/gamifikasi';

export const FITUR_LABEL: Record<string, string> = {
  beranda: 'Beranda', game: 'Game', store: 'Store', event: 'Event',
  komunitas: 'Komunitas', kelas: 'Ide Bermain', pesanan: 'Pesanan', rapor: 'Rapor', video: 'Video',
};
export const labelFitur = (f: string) => FITUR_LABEL[f] ?? f;

export interface AktivitasRingkas {
  perUser: { email: string; fitur: string; waktu: string }[];
  populerHariIni: { fitur: string; n: number }[];
  populer7h: { fitur: string; n: number }[];
  totalHariIni: number;
}

type RawEv = { fitur: string; dibuat_at: string; ortu_id: string; ortu: { email: string | null } | { email: string | null }[] | null };

export async function getAktivitasRingkas(): Promise<AktivitasRingkas> {
  const kosong: AktivitasRingkas = { perUser: [], populerHariIni: [], populer7h: [], totalHariIni: 0 };
  try {
    const s = await createClient();
    const d7 = new Date(Date.now() - 7 * 864e5).toISOString();
    const cutoffHariIni = new Date(tanggalWIB() + 'T00:00:00+07:00').toISOString();
    const { data } = await s
      .from('aktivitas')
      .select('fitur,dibuat_at,ortu_id,ortu:ortu_id(email)')
      .gte('dibuat_at', d7)
      .order('dibuat_at', { ascending: false })
      .limit(3000);
    const rows = (data ?? []) as unknown as RawEv[];
    const hariIni = rows.filter((r) => r.dibuat_at >= cutoffHariIni);

    const hitung = (arr: RawEv[]) => {
      const m = new Map<string, number>();
      for (const r of arr) m.set(r.fitur, (m.get(r.fitur) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([fitur, n]) => ({ fitur, n }));
    };

    // aktivitas terakhir per user hari ini (rows sudah desc → yang pertama = terbaru)
    const seen = new Set<string>();
    const perUser: AktivitasRingkas['perUser'] = [];
    for (const r of hariIni) {
      if (seen.has(r.ortu_id)) continue;
      seen.add(r.ortu_id);
      const email = (Array.isArray(r.ortu) ? r.ortu[0] : r.ortu)?.email ?? '—';
      perUser.push({ email, fitur: r.fitur, waktu: r.dibuat_at });
    }

    return { perUser, populerHariIni: hitung(hariIni), populer7h: hitung(rows), totalHariIni: hariIni.length };
  } catch {
    return kosong;
  }
}
