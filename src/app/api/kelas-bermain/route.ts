// GET /api/kelas-bermain -> daftar kelas bermain aktif
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';

const COLS = 'id,judul,aktivitas,bahan,link_ide,worksheet_url,status';

export async function GET(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { data } = await a.supabase.from('kelas_bermain').select(COLS).eq('status', 'aktif').order('created_at', { ascending: false });
  return ok(data ?? []);
}
