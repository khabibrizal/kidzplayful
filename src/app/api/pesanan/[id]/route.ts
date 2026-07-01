// GET /api/pesanan/[id] -> detail pesanan + item
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';

const COLS = 'id,status,subtotal,ongkir,total,penerima,no_hp,alamat,bukti_url,no_resi,catatan,created_at';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { id } = await params;
  const { data } = await a.supabase.from('pesanan').select(`${COLS}, item:item_pesanan(id,produk_id,nama,harga,qty)`).eq('id', id).maybeSingle();
  if (!data) return fail('Tidak ditemukan', 404);
  return ok(data);
}
