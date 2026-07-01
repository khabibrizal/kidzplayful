// GET /api/kelas-bermain/[id] -> detail kelas bermain
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';

const COLS = 'id,judul,aktivitas,bahan,link_ide,worksheet_url,status';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { id } = await params;
  const { data } = await a.supabase.from('kelas_bermain').select(COLS).eq('id', id).maybeSingle();
  if (!data) return fail('Tidak ditemukan', 404);
  return ok(data);
}
