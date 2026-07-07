// src/lib/data/skor.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { hitungBintang } from '@/lib/domain/skor';
import {
  tanggalWIB, evaluasiLencana, lencanaByKode,
  tantanganHariIni, progresTantangan, BONUS_TANTANGAN, type LencanaDef,
} from '@/lib/domain/gamifikasi';
import { progresTantanganKustom, type SyaratItem, type RowMain } from '@/lib/domain/tantangan-kustom';

const KOIN_BONUS_CEPAT = 3;

export async function catatHasil(input: {
  anakId: string;
  temaId: string;
  paketId?: string | null;
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

  const bonus = !!input.targetDetik && input.targetDetik > 0 && input.durasiDetik > 0 && input.durasiDetik <= input.targetDetik;
  const bintang = Math.min(3, hitungBintang(input.benar, input.total) + (bonus ? 1 : 0));
  const koinDapat = input.benar + (bonus ? KOIN_BONUS_CEPAT : 0);

  const { data: ins, error } = await supabase.from('hasil_main').insert({
    anak_id: input.anakId,
    tema_id: input.temaId,
    mesin: input.mesin,
    area_skill: input.areaSkill,
    jumlah_coba: input.total,
    selesai: true,
    durasi_detik: input.durasiDetik,
    bintang,
  }).select('id').single();
  if (error) throw new Error(error.message);

  const today = tanggalWIB();
  const tantDef = tantanganHariIni(today);
  const dflt = {
    bintang, bonus, koin: 0, streak: 0,
    lencanaBaru: [] as LencanaDef[],
    tantangan: { judul: tantDef.judul, emoji: tantDef.emoji, target: tantDef.target, progress: 0, selesai: false, bonusBaru: false },
    kustomBaru: [] as { judul: string; emoji: string }[],
  };

  try {
    // catat game yang diselesaikan (resilient: kolom paket_id ada sejak migrasi 0044)
    if (input.paketId && ins?.id) {
      await supabase.from('hasil_main').update({ paket_id: input.paketId }).eq('id', ins.id);
    }
    const kemarin = tanggalWIB(new Date(Date.now() - 86400000));
    const [{ data: anak }, { data: rows }, { data: lencAda }, { data: tantAda }, { data: kustomDef }, { data: kustomDone }] = await Promise.all([
      supabase.from('anak').select('koin,streak,streak_terakhir').eq('id', input.anakId).single(),
      supabase.from('hasil_main').select('mesin,bintang,tanggal,tema_id,paket_id').eq('anak_id', input.anakId),
      supabase.from('lencana_anak').select('kode').eq('anak_id', input.anakId),
      supabase.from('tantangan_anak').select('selesai').eq('anak_id', input.anakId).eq('tanggal', today).maybeSingle(),
      supabase.from('tantangan_kustom').select('id,judul,lencana_kode,bonus_koin,syarat').eq('aktif', true),
      supabase.from('tantangan_kustom_anak').select('tantangan_id').eq('anak_id', input.anakId),
    ]);

    // streak
    const last = (anak?.streak_terakhir as string | null) ?? null;
    const streakLama = (anak?.streak as number) ?? 0;
    const streakBaru = last === today ? (streakLama || 1) : last === kemarin ? streakLama + 1 : 1;

    const allRows = (rows ?? []) as (RowMain & { tanggal: string })[];
    const hariIni = allRows.filter((r) => tanggalWIB(new Date(r.tanggal)) === today);

    // tantangan harian
    const progress = Math.min(progresTantangan(tantDef, hariIni), tantDef.target);
    const tantSelesaiBaru = !tantAda?.selesai && progress >= tantDef.target;

    // lencana otomatis
    const sudah = new Set((lencAda ?? []).map((l) => l.kode as string));
    const lencanaOtomatis = evaluasiLencana({
      totalSelesai: allRows.length,
      koin: (anak?.koin as number) ?? 0, // dievaluasi ulang di bawah utk koin100
      streak: streakBaru,
      adaBintang3: allRows.some((r) => r.bintang >= 3),
      jenisMesin: new Set(allRows.map((r) => r.mesin)).size,
    }).filter((k) => !sudah.has(k));

    // tantangan kustom (quest admin)
    type KustomDef = { id: string; judul: string; lencana_kode: string; bonus_koin: number; syarat: SyaratItem[] };
    const doneSet = new Set((kustomDone ?? []).map((k) => k.tantangan_id as string));
    const kustomBaru: KustomDef[] = ((kustomDef ?? []) as KustomDef[]).filter(
      (k) => !doneSet.has(k.id) && progresTantanganKustom(k.syarat ?? [], allRows).selesai,
    );
    const bonusKustom = kustomBaru.reduce((a, k) => a + (k.bonus_koin || 0), 0);

    // koin final: game + bonus cepat + bonus tantangan harian + bonus tantangan kustom
    const koinFinal = ((anak?.koin as number) ?? 0) + koinDapat + (tantSelesaiBaru ? BONUS_TANTANGAN : 0) + bonusKustom;

    // lencana koin100 dievaluasi dgn koin final; gabung semua lencana yang harus diberikan
    const set = new Set<string>(lencanaOtomatis);
    if (koinFinal >= 100 && !sudah.has('koin100')) set.add('koin100');
    for (const k of kustomBaru) if (!sudah.has(k.lencana_kode)) set.add(k.lencana_kode);
    const lencanaBeri = [...set];

    await Promise.all([
      supabase.from('anak').update({ koin: koinFinal, streak: streakBaru, streak_terakhir: today }).eq('id', input.anakId),
      lencanaBeri.length ? supabase.from('lencana_anak').upsert(lencanaBeri.map((kode) => ({ anak_id: input.anakId, kode }))) : Promise.resolve(),
      tantSelesaiBaru ? supabase.from('tantangan_anak').upsert({ anak_id: input.anakId, tanggal: today, kode: tantDef.kode, selesai: true }) : Promise.resolve(),
      kustomBaru.length ? supabase.from('tantangan_kustom_anak').upsert(kustomBaru.map((k) => ({ anak_id: input.anakId, tantangan_id: k.id }))) : Promise.resolve(),
    ]);

    return {
      bintang, bonus,
      koin: koinFinal,
      streak: streakBaru,
      lencanaBaru: lencanaBeri.map((kode) => lencanaByKode(kode)).filter((x): x is LencanaDef => !!x),
      tantangan: { judul: tantDef.judul, emoji: tantDef.emoji, target: tantDef.target, progress, selesai: progress >= tantDef.target, bonusBaru: tantSelesaiBaru },
      kustomBaru: kustomBaru.map((k) => ({ judul: k.judul, emoji: lencanaByKode(k.lencana_kode)?.emoji ?? '🏅' })),
    };
  } catch {
    const { data: anak } = await supabase.from('anak').select('koin').eq('id', input.anakId).single();
    const koinBaru = (anak?.koin ?? 0) + koinDapat;
    await supabase.from('anak').update({ koin: koinBaru }).eq('id', input.anakId);
    return { ...dflt, koin: koinBaru };
  }
}
