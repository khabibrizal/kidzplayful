// GET /api/events -> daftar event tampil
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';

const COLS = 'id,judul,lokasi,tanggal,jam_mulai,jam_selesai,deskripsi,gambar_url,harga_per_anak,status';

export async function GET(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { data } = await a.supabase.from('event').select(COLS).eq('status', 'tampil').order('tanggal', { ascending: true });
  return ok(data ?? []);
}
