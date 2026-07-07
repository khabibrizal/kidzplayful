// src/lib/data/skor.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { hitungBintang } from '@/lib/domain/skor';
import {
  tanggalWIB, evaluasiLencana, lencanaByKode,
  tantanganHariIni, progresTantangan, BONUS_TANTANGAN, type LencanaDef,
} from '@/lib/domain/gamifikasi';

const KOIN_BONUS_CEPAT = 3;

export async function catatHasil(input: {
  anakId: string;
  temaId: string;
  mesin: string;
  areaSkill: string;
  benar: number;
  total: number;
  durasiDetik: number;
  targetDetik?: number | null;   // Mode Tantangan: selesai ≤ target = bonus
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');

  // bonus cepat bila ada target & selesai di bawah/tepat target
  const bonus = !!input.targetDetik && input.targetDetik > 0 && input.durasiDetik > 0 && input.durasiDetik <= input.targetDetik;
  const bintang = Math.min(3, hitungBintang(input.benar, input.total) + (bonus ? 1 : 0));
  const koinDapat = input.benar + (bonus ? KOIN_BONUS_CEPAT : 0);

  const { error } = await supabase.from('hasil_main').insert({
    anak_id: input.anakId,
    tema_id: input.temaId,
    mesin: input.mesin,
    area_skill: input.areaSkill,
    jumlah_coba: input.total,
    selesai: true,
    durasi_detik: input.durasiDetik,
    bintang,
  });
  if (error) throw new Error(error.message);

  const today = tanggalWIB();
  const tantDef = tantanganHariIni(today);
  // hasil default (dipakai bila gamifikasi/migrasi belum tersedia)
  const dflt = {
    bintang, bonus, koin: 0, streak: 0,
    lencanaBaru: [] as LencanaDef[],
    tantangan: { judul: tantDef.judul, emoji: tantDef.emoji, target: tantDef.target, progress: 0, selesai: false, bonusBaru: false },
  };

  try {
    // ===== Gamifikasi: streak, tantangan harian, lencana =====
    const kemarin = tanggalWIB(new Date(Date.now() - 86400000));
    const [{ data: anak }, { data: rows }, { data: lencAda }, { data: tantAda }] = await Promise.all([
      supabase.from('anak').select('koin,streak,streak_terakhir').eq('id', input.anakId).single(),
      supabase.from('hasil_main').select('mesin,bintang,tanggal').eq('anak_id', input.anakId),
      supabase.from('lencana_anak').select('kode').eq('anak_id', input.anakId),
      supabase.from('tantangan_anak').select('selesai').eq('anak_id', input.anakId).eq('tanggal', today).maybeSingle(),
    ]);

    const last = (anak?.streak_terakhir as string | null) ?? null;
    const streakLama = (anak?.streak as number) ?? 0;
    const streakBaru = last === today ? (streakLama || 1) : last === kemarin ? streakLama + 1 : 1;

    const semua = (rows ?? []) as { mesin: string; bintang: number; tanggal: string }[];
    const hariIni = semua.filter((r) => tanggalWIB(new Date(r.tanggal)) === today);
    const progress = Math.min(progresTantangan(tantDef, hariIni), tantDef.target);
    const tantSelesaiBaru = !tantAda?.selesai && progress >= tantDef.target;

    const koinFinal = ((anak?.koin as number) ?? 0) + koinDapat + (tantSelesaiBaru ? BONUS_TANTANGAN : 0);

    const stat = {
      totalSelesai: semua.length,
      koin: koinFinal,
      streak: streakBaru,
      adaBintang3: semua.some((r) => r.bintang >= 3),
      jenisMesin: new Set(semua.map((r) => r.mesin)).size,
    };
    const sudah = new Set((lencAda ?? []).map((l) => l.kode as string));
    const lencanaBaruKode = evaluasiLencana(stat).filter((k) => !sudah.has(k));

    await Promise.all([
      supabase.from('anak').update({ koin: koinFinal, streak: streakBaru, streak_terakhir: today }).eq('id', input.anakId),
      lencanaBaruKode.length
        ? supabase.from('lencana_anak').insert(lencanaBaruKode.map((kode) => ({ anak_id: input.anakId, kode })))
        : Promise.resolve(),
      tantSelesaiBaru
        ? supabase.from('tantangan_anak').upsert({ anak_id: input.anakId, tanggal: today, kode: tantDef.kode, selesai: true })
        : Promise.resolve(),
    ]);

    return {
      bintang, bonus,
      koin: koinFinal,
      streak: streakBaru,
      lencanaBaru: lencanaBaruKode.map((kode) => lencanaByKode(kode)!),
      tantangan: { judul: tantDef.judul, emoji: tantDef.emoji, target: tantDef.target, progress, selesai: progress >= tantDef.target, bonusBaru: tantSelesaiBaru },
    };
  } catch {
    // Fallback (mis. migrasi 0042 belum dijalankan): tetap catat koin dasar agar main tidak rusak.
    const { data: anak } = await supabase.from('anak').select('koin').eq('id', input.anakId).single();
    const koinBaru = (anak?.koin ?? 0) + koinDapat;
    await supabase.from('anak').update({ koin: koinBaru }).eq('id', input.anakId);
    return { ...dflt, koin: koinBaru };
  }
}
