// GET /api/pesanan -> daftar pesanan · POST /api/pesanan { penerima, no_hp, alamat, catatan? } -> checkout dari keranjang
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';

const COLS = 'id,status,subtotal,ongkir,total,penerima,no_hp,alamat,bukti_url,no_resi,catatan,created_at';

export async function GET(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { data } = await a.supabase.from('pesanan').select(COLS).eq('ortu_id', a.user.id).order('created_at', { ascending: false });
  return ok(data ?? []);
}

export async function POST(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  let b: { penerima?: string; no_hp?: string; alamat?: string; catatan?: string };
  try { b = await req.json(); } catch { return fail('Body JSON tidak valid'); }
  if (!b.penerima?.trim() || !b.no_hp?.trim() || !b.alamat?.trim()) return fail('penerima, no_hp, alamat wajib');

  const { data: items } = await a.supabase.from('keranjang_item').select('qty, produk:produk_id(id,nama,harga,stok,status)').eq('ortu_id', a.user.id);
  const list = (items ?? []).map((r) => ({ qty: r.qty, p: Array.isArray(r.produk) ? r.produk[0] : r.produk })).filter((x) => x.p);
  if (!list.length) return fail('Keranjang kosong');
  for (const it of list) {
    if (it.p.status !== 'tampil') return fail(`"${it.p.nama}" tidak tersedia`);
    if (it.qty > it.p.stok) return fail(`Stok "${it.p.nama}" tinggal ${it.p.stok}`);
  }
  const subtotal = list.reduce((s, it) => s + it.p.harga * it.qty, 0);
  const { data: pesanan, error: e1 } = await a.supabase.from('pesanan').insert({
    ortu_id: a.user.id, status: 'menunggu_ongkir', subtotal, ongkir: 0, total: subtotal,
    penerima: b.penerima.trim(), no_hp: b.no_hp.trim(), alamat: b.alamat.trim(), catatan: b.catatan?.trim() || null,
  }).select('id').single();
  if (e1 || !pesanan) return fail(e1?.message ?? 'Gagal membuat pesanan');
  const { error: e2 } = await a.supabase.from('item_pesanan').insert(
    list.map((it) => ({ pesanan_id: pesanan.id, produk_id: it.p.id, nama: it.p.nama, harga: it.p.harga, qty: it.qty })),
  );
  if (e2) return fail(e2.message);
  await a.supabase.from('keranjang_item').delete().eq('ortu_id', a.user.id);
  return ok({ id: pesanan.id }, 201);
}
