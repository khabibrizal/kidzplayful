// GET /api/anak/[id]/gamifikasi — ringkasan gamifikasi anak (streak, koin, lencana, tantangan)
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';
import { getGamifikasiAnakDengan } from '@/lib/data/gamifikasi';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { id } = await params;

  // pastikan anak milik user (RLS anak = ortu sendiri)
  const { data: anak } = await a.supabase.from('anak').select('id,nama').eq('id', id).maybeSingle();
  if (!anak) return fail('Anak tidak ditemukan / bukan milik Anda', 404);

  const g = await getGamifikasiAnakDengan(a.supabase, id);
  return ok({ anak_id: id, nama: anak.nama, ...g });
}
