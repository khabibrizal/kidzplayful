// src/lib/data/keranjang-actions.ts — ubah keranjang + checkout
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getJumlahKeranjang } from './keranjang';
import { getStatusLangganan } from './langganan-status';
import { hargaProdukUntuk } from '@/lib/domain/harga';
import { nilaiVoucherById } from './voucher';

/** Untuk badge keranjang di bottom nav (dipanggil dari Client). */
export async function jumlahKeranjang(): Promise<number> {
  return getJumlahKeranjang();
}

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
export async function checkout(input: { penerima: string; noHp: string; alamat: string; catatan?: string; voucherId?: string | null }): Promise<string> {
  const { s, user } = await userDb();
  if (!input.penerima.trim() || !input.noHp.trim() || !input.alamat.trim()) throw new Error('Lengkapi nama penerima, no HP, dan alamat.');

  const { data: items } = await s
    .from('keranjang_item')
    .select('qty, produk:produk_id(id,nama,harga,diskon_trial_persen,diskon_langganan_persen,stok,status)')
    .eq('ortu_id', user.id);
  const list = (items ?? []).map((r) => ({ qty: r.qty, p: Array.isArray(r.produk) ? r.produk[0] : r.produk })).filter((x) => x.p);
  if (!list.length) throw new Error('Keranjang kosong.');
  for (const it of list) {
    if (it.p.status !== 'tampil') throw new Error(`"${it.p.nama}" tidak tersedia.`);
    if (it.qty > it.p.stok) throw new Error(`Stok "${it.p.nama}" tinggal ${it.p.stok}.`);
  }
  // harga aktual sesuai status langganan (aktif=diskon langganan, selain itu=diskon trial)
  const status = await getStatusLangganan(s, user.id);
  const hargaItem = (p: typeof list[number]['p']) => hargaProdukUntuk(p, status);
  const subtotal = list.reduce((a, it) => a + hargaItem(it.p) * it.qty, 0);

  let potonganVoucher = 0; let vId: string | null = null;
  if (input.voucherId) {
    const rv = await nilaiVoucherById(s, input.voucherId, 'produk', subtotal, user.id);
    if (!rv.ok) throw new Error(rv.error ?? 'Voucher tidak valid.');
    potonganVoucher = rv.potongan ?? 0; vId = input.voucherId;
  }

  // Anti pesanan dobel: bila sudah ada pesanan IDENTIK berstatus 'menunggu_ongkir'
  // yang dibuat < 10 menit lalu (mis. user submit lagi karena mengira gagal),
  // pakai pesanan itu — jangan buat duplikat. (Re-order sungguhan tetap bisa
  // setelah 10 menit atau setelah admin mengisi ongkir.)
  const tandaItem = (arr: { produk_id: string; qty: number }[]) =>
    arr.map((i) => `${i.produk_id}:${i.qty}`).sort().join('|');
  const tandaBaru = tandaItem(list.map((it) => ({ produk_id: it.p.id, qty: it.qty })));
  const sejak = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: terkini } = await s
    .from('pesanan')
    .select('id, subtotal, item:item_pesanan(produk_id, qty)')
    .eq('ortu_id', user.id)
    .eq('status', 'menunggu_ongkir')
    .gte('created_at', sejak);
  const kembar = (terkini ?? []).find(
    (o) => o.subtotal === subtotal && tandaItem((o.item ?? []) as { produk_id: string; qty: number }[]) === tandaBaru,
  );
  if (kembar) {
    await s.from('keranjang_item').delete().eq('ortu_id', user.id);
    revalidatePath('/keranjang'); revalidatePath('/pesanan');
    return kembar.id as string; // arahkan ke pesanan yang sudah ada, bukan bikin baru
  }

  const { data: pesanan, error: e1 } = await s.from('pesanan').insert({
    ortu_id: user.id, status: 'menunggu_ongkir',
    subtotal, ongkir: 0, total: Math.max(0, subtotal - potonganVoucher),
    voucher_id: vId, potongan_voucher: potonganVoucher,
    penerima: input.penerima.trim(), no_hp: input.noHp.trim(), alamat: input.alamat.trim(),
    catatan: input.catatan?.trim() || null,
  }).select('id').single();
  if (e1 || !pesanan) throw new Error(e1?.message ?? 'Gagal membuat pesanan.');

  const { error: e2 } = await s.from('item_pesanan').insert(
    list.map((it) => ({ pesanan_id: pesanan.id, produk_id: it.p.id, nama: it.p.nama, harga: hargaItem(it.p), qty: it.qty })),
  );
  if (e2) throw new Error(e2.message);

  if (vId) await s.from('voucher_redeem').insert({ voucher_id: vId, ortu_id: user.id, ref_tipe: 'pesanan', ref_id: pesanan.id, potongan: potonganVoucher });

  await s.from('keranjang_item').delete().eq('ortu_id', user.id);
  revalidatePath('/keranjang'); revalidatePath('/pesanan');
  return pesanan.id;
}
