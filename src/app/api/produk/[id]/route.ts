// GET /api/produk/[id] -> detail produk
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';

const COLS = 'id,nama,deskripsi,kategori,harga,stok,gambar_url,status';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { id } = await params;
  const { data } = await a.supabase.from('produk').select(COLS).eq('id', id).maybeSingle();
  if (!data) return fail('Tidak ditemukan', 404);
  return ok(data);
}
