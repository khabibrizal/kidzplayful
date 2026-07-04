// src/lib/data/admin-bisnis.ts
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return { supabase, adminId: user.id };
}

export async function aktifkanLangganan(ortuId: string, nominal: number, dibayarVia: string) {
  const { supabase, adminId } = await adminDb();
  const sampai = new Date();
  sampai.setMonth(sampai.getMonth() + 1);
  const aktifSampai = sampai.toISOString().slice(0, 10);
  const { error } = await supabase.from('langganan').update({
    status: 'aktif', nominal: nominal || 0, dibayar_via: dibayarVia || 'manual',
    aktif_sampai: aktifSampai, diaktifkan_oleh: adminId, updated_at: new Date().toISOString(),
  }).eq('ortu_id', ortuId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/langganan');
}

export async function simpanPengaturanBayar(formData: FormData) {
  const { supabase } = await adminDb();
  const nominal = Number(String(formData.get('harga_nominal') ?? '').replace(/[^0-9]/g, '')) || 0;
  const patch = {
    harga_langganan_nominal: nominal,
    harga_langganan_teks: String(formData.get('harga_teks') ?? '').trim() || `Rp ${nominal.toLocaleString('id-ID')} / bulan`,
    bank_teks: String(formData.get('bank_teks') ?? '').trim(),
    qris_url: String(formData.get('qris_url') ?? '').trim(),
    wa_nomor: String(formData.get('wa_nomor') ?? '').replace(/[^0-9]/g, ''),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('pengaturan_pembayaran').update(patch).eq('id', 1);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/pengaturan-bayar');
  revalidatePath('/pengaturan');
}
