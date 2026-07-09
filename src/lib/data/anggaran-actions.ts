// src/lib/data/anggaran-actions.ts — kelola anggaran per bulan & kategori (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return { s };
}

const int = (v: FormDataEntryValue | null) => Math.max(0, Math.floor(Number(String(v ?? '').replace(/[^0-9]/g, '')) || 0));

export async function simpanAnggaran(formData: FormData) {
  const { s } = await adminDb();
  const ym = String(formData.get('ym') ?? '').trim();
  const kategori = String(formData.get('kategori') ?? '').trim();
  const jumlah = int(formData.get('jumlah'));
  if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error('Periode tidak valid.');
  if (!kategori) throw new Error('Kategori wajib dipilih.');
  // upsert berdasarkan (ym, kategori)
  const { error } = await s.from('anggaran').upsert({ ym, kategori, jumlah }, { onConflict: 'ym,kategori' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/keuangan/anggaran');
}

export async function hapusAnggaran(id: string) {
  const { s } = await adminDb();
  const { error } = await s.from('anggaran').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/keuangan/anggaran');
}
