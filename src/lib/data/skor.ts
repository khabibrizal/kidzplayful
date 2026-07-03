// src/lib/data/skor.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { hitungBintang } from '@/lib/domain/skor';

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

  // tambah koin (RPC sederhana via update; baca-lalu-tulis cukup utk skala ini)
  const { data: anak } = await supabase.from('anak').select('koin').eq('id', input.anakId).single();
  const koinBaru = (anak?.koin ?? 0) + koinDapat;
  await supabase.from('anak').update({ koin: koinBaru }).eq('id', input.anakId);

  return { bintang, koin: koinBaru, bonus };
}
