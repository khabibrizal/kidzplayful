// GET /api/keranjang -> isi keranjang · POST /api/keranjang { produk_id, qty } -> tambah/ubah
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';

const PCOLS = 'id,nama,deskripsi,kategori,harga,stok,gambar_url,status';

export async function GET(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { data } = await a.supabase.from('keranjang_item')
    .select(`produk_id, qty, produk:produk_id(${PCOLS})`).eq('ortu_id', a.user.id).order('created_at');
  const items = (data ?? []).map((r) => ({ produk_id: r.produk_id, qty: r.qty, produk: Array.isArray(r.produk) ? r.produk[0] : r.produk }));
  const subtotal = items.reduce((s, it) => s + (it.produk?.harga ?? 0) * it.qty, 0);
  return ok({ items, subtotal });
}

export async function POST(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  let b: { produk_id?: string; qty?: number };
  try { b = await req.json(); } catch { return fail('Body JSON tidak valid'); }
  if (!b.produk_id) return fail('produk_id wajib');
  const qty = Math.max(1, Math.floor(b.qty ?? 1));
  const { data: p } = await a.supabase.from('produk').select('stok,status').eq('id', b.produk_id).maybeSingle();
  if (!p || p.status !== 'tampil') return fail('Produk tidak tersedia', 404);
  const { data: ada } = await a.supabase.from('keranjang_item').select('qty').eq('ortu_id', a.user.id).eq('produk_id', b.produk_id).maybeSingle();
  const baru = Math.min((ada?.qty ?? 0) + qty, Math.max(1, p.stok));
  if (ada) await a.supabase.from('keranjang_item').update({ qty: baru }).eq('ortu_id', a.user.id).eq('produk_id', b.produk_id);
  else await a.supabase.from('keranjang_item').insert({ ortu_id: a.user.id, produk_id: b.produk_id, qty: baru });
  return ok({ produk_id: b.produk_id, qty: baru });
}
