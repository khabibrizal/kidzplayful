// src/lib/data/admin-bisnis.ts
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { catatLedger } from './ledger';
import { tanggalWIB } from '@/lib/domain/gamifikasi';

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
  // riwayat pembayaran membership + catat pemasukan (basis kas)
  try {
    await supabase.from('pembayaran_langganan').insert({ ortu_id: ortuId, nominal: nominal || 0, periode_mulai: tanggalWIB(), periode_sampai: aktifSampai, metode: dibayarVia || 'manual' });
  } catch { /* abaikan bila migrasi 0052 belum jalan */ }
  await catatLedger(supabase, { arah: 'masuk', kategori: 'membership', jumlah: nominal || 0, ref_tipe: 'langganan', ref_id: ortuId, keterangan: 'Aktivasi/perpanjang langganan', metode: dibayarVia || 'manual', dibuat_oleh: adminId });
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
    wa_event: String(formData.get('wa_event') ?? '').replace(/[^0-9]/g, ''),
    wa_store: String(formData.get('wa_store') ?? '').replace(/[^0-9]/g, ''),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('pengaturan_pembayaran').update(patch).eq('id', 1);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/pengaturan-bayar');
  revalidatePath('/pengaturan');
}

export async function simpanMenuAkses(akses: { admin: string[]; investor: string[]; guru: string[] }): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await supabase.from('profiles').select('is_superuser').eq('id', user.id).single();
  if (!prof?.is_superuser) throw new Error('Hanya Super User.');
  const uniq = (a: string[]) => Array.from(new Set((a ?? []).filter((k) => typeof k === 'string' && k)));
  const bersih = { admin: uniq(akses.admin), investor: uniq(akses.investor), guru: uniq(akses.guru) };
  const { error } = await supabase.from('pengaturan_menu').update({ akses: bersih, updated_at: new Date().toISOString() }).eq('id', 1);
  if (error) throw new Error(error.message);
  revalidatePath('/admin', 'layout');
}

export async function simpanFiturAkses(fitur: { guru: string[]; psikolog: string[] }): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await supabase.from('profiles').select('is_superuser').eq('id', user.id).single();
  if (!prof?.is_superuser) throw new Error('Hanya Super User.');
  const uniq = (a: string[]) => Array.from(new Set((a ?? []).filter((k) => typeof k === 'string' && k)));
  const bersih = { guru: uniq(fitur.guru), psikolog: uniq(fitur.psikolog) };
  const { error } = await supabase.from('pengaturan_menu').update({ fitur: bersih, updated_at: new Date().toISOString() }).eq('id', 1);
  if (error) throw new Error(error.message);
  revalidatePath('/admin', 'layout');
  revalidatePath('/psikolog', 'layout');
  revalidatePath('/guru', 'layout');
}

export async function simpanPengaturanTrial(formData: FormData) {
  const { supabase } = await adminDb();
  const patch = {
    trial_komunitas: formData.get('trial_komunitas') === '1',
    trial_maks_anak: Math.max(0, Number(String(formData.get('trial_maks_anak') ?? '').replace(/[^0-9]/g, '')) || 0),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('pengaturan_trial').update(patch).eq('id', 1);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/pengaturan-trial');
  revalidatePath('/pilih-anak');
}
