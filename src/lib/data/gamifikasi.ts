// src/lib/data/gamifikasi.ts — baca ringkasan gamifikasi anak (streak, lencana, tantangan hari ini)
import { createClient } from '@/lib/supabase/server';
import { tanggalWIB, LENCANA, tantanganHariIni, progresTantangan } from '@/lib/domain/gamifikasi';

export interface GamifikasiAnak {
  streak: number;
  koin: number;
  lencana: (typeof LENCANA[number] & { dapat: boolean })[];
  jumlahLencana: number;
  tantangan: { judul: string; emoji: string; target: number; progress: number; selesai: boolean };
}

export async function getGamifikasiAnak(anakId: string): Promise<GamifikasiAnak> {
  const today = tanggalWIB();
  const t0 = tantanganHariIni(today);
  // fallback bila migrasi 0042 belum dijalankan
  const kosong: GamifikasiAnak = {
    streak: 0, koin: 0,
    lencana: LENCANA.map((l) => ({ ...l, dapat: false })), jumlahLencana: 0,
    tantangan: { judul: t0.judul, emoji: t0.emoji, target: t0.target, progress: 0, selesai: false },
  };
  try {
    const s = await createClient();
    const [{ data: anak, error: e1 }, { data: rows }, { data: lenc }] = await Promise.all([
      s.from('anak').select('streak,koin').eq('id', anakId).single(),
      s.from('hasil_main').select('mesin,bintang,tanggal').eq('anak_id', anakId),
      s.from('lencana_anak').select('kode').eq('anak_id', anakId),
    ]);
    if (e1) return kosong;
    return hitung(anak, rows, lenc, today);
  } catch {
    return kosong;
  }
}

function hitung(
  anak: { streak?: number; koin?: number } | null,
  rows: { mesin: string; bintang: number; tanggal: string }[] | null,
  lenc: { kode: string }[] | null,
  today: string,
): GamifikasiAnak {
  const hariIni = (rows ?? []).filter((r) => tanggalWIB(new Date(r.tanggal as string)) === today);
  const earned = new Set((lenc ?? []).map((l) => l.kode as string));
  const t = tantanganHariIni(today);
  const progress = progresTantangan(t, hariIni as { mesin: string; bintang: number }[]);

  return {
    streak: (anak?.streak as number) ?? 0,
    koin: (anak?.koin as number) ?? 0,
    lencana: LENCANA.map((l) => ({ ...l, dapat: earned.has(l.kode) })),
    jumlahLencana: earned.size,
    tantangan: { judul: t.judul, emoji: t.emoji, target: t.target, progress: Math.min(progress, t.target), selesai: progress >= t.target },
  };
}
