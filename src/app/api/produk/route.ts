// GET /api/produk -> daftar produk tampil
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';

const COLS = 'id,nama,deskripsi,kategori,harga,stok,gambar_url,status';

export async function GET(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { data } = await a.supabase.from('produk').select(COLS).eq('status', 'tampil').order('created_at', { ascending: false });
  return ok(data ?? []);
}
