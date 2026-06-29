// src/lib/data/keranjang-actions.ts — ubah keranjang + checkout
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function userDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  return { s, user };
}

export async function tambahKeranjang(produkId: string, qty = 1): Promise<void> {
  const { s, user } = await userDb();
  const { data: produk } = await s.from('produk').select('stok,status').eq('id', produkId).maybeSingle();
  if (!produk || produk.status !== 'tampil') throw new Error('Produk tidak tersedia.');
  const { data: ada } = await s.from('keranjang_item').select('qty').eq('ortu_id', user.id).eq('produk_id', produkId).maybeSingle();
  const baru = Math.min((ada?.qty ?? 0) + qty, Math.max(1, produk.stok));
  if (ada) await s.from('keranjang_item').update({ qty: baru }).eq('ortu_id', user.id).eq('produk_id', produkId);
  else await s.from('keranjang_item').insert({ ortu_id: user.id, produk_id: produkId, qty: baru });
  revalidatePath('/keranjang');
}

export async function setQtyKeranjang(produkId: string, qty: number): Promise<void> {
  const { s, user } = await userDb();
  if (qty <= 0) {
    await s.from('keranjang_item').delete().eq('ortu_id', user.id).eq('produk_id', produkId);
  } else {
    await s.from('keranjang_item').update({ qty }).eq('ortu_id', user.id).eq('produk_id', produkId);
  }
  revalidatePath('/keranjang');
}

export async function hapusKeranjang(produkId: string): Promise<void> {
  const { s, user } = await userDb();
  await s.from('keranjang_item').delete().eq('ortu_id', user.id).eq('produk_id', produkId);
  revalidatePath('/keranjang');
}

/** Buat pesanan dari isi keranjang. Mengembalikan id pesanan. */
export async function checkout(input: { penerima: string; noHp: string; alamat: string; catatan?: string }): Promise<string> {
  const { s, user } = await userDb();
  if (!input.penerima.trim() || !input.noHp.trim() || !input.alamat.trim()) throw new Error('Lengkapi nama penerima, no HP, dan alamat.');

  const { data: items } = await s
    .from('keranjang_item')
    .select('qty, produk:produk_id(id,nama,harga,stok,status)')
    .eq('ortu_id', user.id);
  const list = (items ?? []).map((r) => ({ qty: r.qty, p: Array.isArray(r.produk) ? r.produk[0] : r.produk })).filter((x) => x.p);
  if (!list.length) throw new Error('Keranjang kosong.');
  for (const it of list) {
    if (it.p.status !== 'tampil') throw new Error(`"${it.p.nama}" tidak tersedia.`);
    if (it.qty > it.p.stok) throw new Error(`Stok "${it.p.nama}" tinggal ${it.p.stok}.`);
  }
  const subtotal = list.reduce((a, it) => a + it.p.harga * it.qty, 0);

  const { data: pesanan, error: e1 } = await s.from('pesanan').insert({
    ortu_id: user.id, status: 'menunggu_ongkir',
    subtotal, ongkir: 0, total: subtotal,
    penerima: input.penerima.trim(), no_hp: input.noHp.trim(), alamat: input.alamat.trim(),
    catatan: input.catatan?.trim() || null,
  }).select('id').single();
  if (e1 || !pesanan) throw new Error(e1?.message ?? 'Gagal membuat pesanan.');

  const { error: e2 } = await s.from('item_pesanan').insert(
    list.map((it) => ({ pesanan_id: pesanan.id, produk_id: it.p.id, nama: it.p.nama, harga: it.p.harga, qty: it.qty })),
  );
  if (e2) throw new Error(e2.message);

  await s.from('keranjang_item').delete().eq('ortu_id', user.id);
  revalidatePath('/keranjang'); revalidatePath('/pesanan');
  return pesanan.id;
}
