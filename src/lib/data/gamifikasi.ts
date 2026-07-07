// src/lib/data/gamifikasi.ts — baca ringkasan gamifikasi anak (streak, lencana, tantangan harian + kustom)
import { createClient } from '@/lib/supabase/server';
import { tanggalWIB, LENCANA, lencanaByKode, tantanganHariIni, progresTantangan } from '@/lib/domain/gamifikasi';
import { progresTantanganKustom, type SyaratItem, type RowMain } from '@/lib/domain/tantangan-kustom';
import { umurTahun } from '@/lib/domain/anak';

export interface TantanganKustomRingkas { id: string; judul: string; deskripsi: string; emoji: string; done: number; total: number; selesai: boolean; }

export interface GamifikasiAnak {
  streak: number;
  koin: number;
  lencana: (typeof LENCANA[number] & { dapat: boolean })[];
  jumlahLencana: number;
  tantangan: { judul: string; emoji: string; target: number; progress: number; selesai: boolean };
  kustom: TantanganKustomRingkas[];
}

type RawKustom = { id: string; judul: string; deskripsi: string; lencana_kode: string; syarat: SyaratItem[]; usia_min: number; usia_max: number };

export async function getGamifikasiAnak(anakId: string): Promise<GamifikasiAnak> {
  const today = tanggalWIB();
  const t0 = tantanganHariIni(today);
  const kosong: GamifikasiAnak = {
    streak: 0, koin: 0,
    lencana: LENCANA.map((l) => ({ ...l, dapat: false })), jumlahLencana: 0,
    tantangan: { judul: t0.judul, emoji: t0.emoji, target: t0.target, progress: 0, selesai: false },
    kustom: [],
  };
  try {
    const s = await createClient();
    const [{ data: anak, error: e1 }, { data: rows }, { data: lenc }, { data: kustomDef }, { data: kustomDone }] = await Promise.all([
      s.from('anak').select('streak,koin,tanggal_lahir').eq('id', anakId).single(),
      s.from('hasil_main').select('mesin,bintang,tanggal,tema_id,paket_id').eq('anak_id', anakId),
      s.from('lencana_anak').select('kode').eq('anak_id', anakId),
      s.from('tantangan_kustom').select('id,judul,deskripsi,lencana_kode,syarat,usia_min,usia_max').eq('aktif', true),
      s.from('tantangan_kustom_anak').select('tantangan_id').eq('anak_id', anakId),
    ]);
    if (e1) return kosong;

    const umur = anak?.tanggal_lahir ? umurTahun(new Date((anak.tanggal_lahir as string) + 'T00:00:00Z'), new Date()) : 0;

    const allRows = (rows ?? []) as (RowMain & { tanggal: string })[];
    const hariIni = allRows.filter((r) => tanggalWIB(new Date(r.tanggal)) === today);
    const earned = new Set((lenc ?? []).map((l) => l.kode as string));
    const t = tantanganHariIni(today);
    const progress = Math.min(progresTantangan(t, hariIni), t.target);
    const doneSet = new Set((kustomDone ?? []).map((k) => k.tantangan_id as string));

    const kustom: TantanganKustomRingkas[] = ((kustomDef ?? []) as RawKustom[])
      .filter((k) => umur >= (k.usia_min ?? 0) && umur <= (k.usia_max ?? 99))
      .map((k) => {
      const p = progresTantanganKustom(k.syarat ?? [], allRows);
      return {
        id: k.id, judul: k.judul, deskripsi: k.deskripsi ?? '',
        emoji: lencanaByKode(k.lencana_kode)?.emoji ?? '🏅',
        done: p.done, total: p.total,
        selesai: doneSet.has(k.id) || p.selesai,
      };
    });

    return {
      streak: (anak?.streak as number) ?? 0,
      koin: (anak?.koin as number) ?? 0,
      lencana: LENCANA.map((l) => ({ ...l, dapat: earned.has(l.kode) })),
      jumlahLencana: earned.size,
      tantangan: { judul: t.judul, emoji: t.emoji, target: t.target, progress, selesai: progress >= t.target },
      kustom,
    };
  } catch {
    return kosong;
  }
}
