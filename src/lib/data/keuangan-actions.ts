// src/lib/data/keuangan-actions.ts — input manual keuangan (expense) & aset (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return { s, adminId: user.id };
}

const int = (v: FormDataEntryValue | null) => Math.max(0, Math.floor(Number(String(v ?? '').replace(/[^0-9]/g, '')) || 0));

export async function catatPengeluaran(formData: FormData) {
  const { s, adminId } = await adminDb();
  const jumlah = int(formData.get('jumlah'));
  if (jumlah <= 0) throw new Error('Nominal wajib diisi.');
  const { error } = await s.from('transaksi_keuangan').insert({
    arah: 'keluar',
    kategori: String(formData.get('kategori') ?? 'lainnya'),
    jumlah,
    tanggal: String(formData.get('tanggal') ?? '') || new Date().toISOString().slice(0, 10),
    metode: String(formData.get('metode') ?? '').trim() || null,
    keterangan: String(formData.get('keterangan') ?? '').trim() || null,
    lampiran_url: String(formData.get('lampiran_url') ?? '').trim() || null,
    pic: String(formData.get('pic') ?? '').trim() || null,
    ref_tipe: 'manual',
    dibuat_oleh: adminId,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/keuangan/expense');
  revalidatePath('/admin/keuangan');
}

export async function hapusTransaksi(id: string) {
  const { s } = await adminDb();
  const { error } = await s.from('transaksi_keuangan').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/keuangan/expense');
  revalidatePath('/admin/keuangan/transaksi');
  revalidatePath('/admin/keuangan');
}

export async function simpanAset(formData: FormData) {
  const { s, adminId } = await adminDb();
  const nama = String(formData.get('nama') ?? '').trim();
  if (!nama) throw new Error('Nama aset wajib diisi.');
  const hargaBeli = int(formData.get('harga_beli'));
  const tanggalBeli = String(formData.get('tanggal_beli') ?? '') || null;
  const { data, error } = await s.from('aset').insert({
    nama,
    kategori: String(formData.get('kategori') ?? '').trim() || null,
    harga_beli: hargaBeli,
    tanggal_beli: tanggalBeli,
    umur_manfaat_bulan: int(formData.get('umur_manfaat_bulan')) || null,
    lokasi: String(formData.get('lokasi') ?? '').trim() || null,
    invoice_url: String(formData.get('invoice_url') ?? '').trim() || null,
    catatan: String(formData.get('catatan') ?? '').trim() || null,
  }).select('id').single();
  if (error) throw new Error(error.message);
  // opsi: catat pembelian aset sebagai pengeluaran di ledger
  if (formData.get('catat_pengeluaran') && hargaBeli > 0) {
    await s.from('transaksi_keuangan').insert({
      arah: 'keluar', kategori: 'aset', jumlah: hargaBeli,
      tanggal: tanggalBeli || new Date().toISOString().slice(0, 10),
      keterangan: `Pembelian aset: ${nama}`, ref_tipe: 'aset', ref_id: data.id, dibuat_oleh: adminId,
    });
  }
  revalidatePath('/admin/keuangan/aset');
  revalidatePath('/admin/keuangan');
}

export async function hapusAset(id: string) {
  const { s } = await adminDb();
  const { error } = await s.from('aset').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/keuangan/aset');
}

export async function tambahKategoriAset(formData: FormData) {
  const { s } = await adminDb();
  const nama = String(formData.get('nama') ?? '').trim();
  if (!nama) throw new Error('Nama kategori wajib diisi.');
  const { error } = await s.from('kategori_aset').insert({ nama });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/keuangan/aset');
}

export async function hapusKategoriAset(id: string) {
  const { s } = await adminDb();
  const { error } = await s.from('kategori_aset').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/keuangan/aset');
}
