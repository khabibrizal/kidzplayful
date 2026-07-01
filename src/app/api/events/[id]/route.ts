// GET /api/events/[id] -> detail event
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';

const COLS = 'id,judul,lokasi,tanggal,jam_mulai,jam_selesai,deskripsi,gambar_url,harga_per_anak,status';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { id } = await params;
  const { data } = await a.supabase.from('event').select(COLS).eq('id', id).maybeSingle();
  if (!data) return fail('Tidak ditemukan', 404);
  return ok(data);
}
