// POST /api/hasil-main — catat hasil main game (mobile) → skor, koin, streak, lencana, tantangan
// Body: { anak_id, tema_id, paket_id?, mesin, area_skill, benar, total, durasi_detik, target_detik? }
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';
import { catatHasilCore } from '@/lib/data/skor-core';

export async function POST(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  let b: {
    anak_id?: string; tema_id?: string; paket_id?: string | null;
    mesin?: string; area_skill?: string;
    benar?: number; total?: number; durasi_detik?: number; target_detik?: number | null;
  };
  try { b = await req.json(); } catch { return fail('Body JSON tidak valid'); }
  if (!b.anak_id || !b.tema_id || !b.mesin || !b.area_skill) return fail('anak_id, tema_id, mesin, area_skill wajib');
  const benar = Math.max(0, Math.floor(Number(b.benar) || 0));
  const total = Math.max(1, Math.floor(Number(b.total) || 0));
  const durasi = Math.max(0, Math.floor(Number(b.durasi_detik) || 0));
  if (benar > total) return fail('benar tidak boleh melebihi total');

  // pastikan anak milik user (RLS anak = ortu sendiri)
  const { data: anak } = await a.supabase.from('anak').select('id').eq('id', b.anak_id).maybeSingle();
  if (!anak) return fail('Anak tidak ditemukan / bukan milik Anda', 404);

  try {
    const hasil = await catatHasilCore(a.supabase, {
      anakId: b.anak_id,
      temaId: b.tema_id,
      paketId: b.paket_id ?? null,
      mesin: b.mesin,
      areaSkill: b.area_skill,
      benar, total,
      durasiDetik: durasi,
      targetDetik: b.target_detik ?? null,
    });
    return ok(hasil, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Gagal mencatat hasil main');
  }
}
