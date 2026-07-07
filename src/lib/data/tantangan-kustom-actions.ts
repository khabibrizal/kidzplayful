// src/lib/data/tantangan-kustom-actions.ts — CRUD tantangan kustom (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { SyaratItem } from '@/lib/domain/tantangan-kustom';

async function adminDb() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return supabase;
}

function bersihkanSyarat(syarat: SyaratItem[]): SyaratItem[] {
  return (syarat ?? [])
    .filter((it) => it && (it.tipe === 'apa' || it.ref))
    .map((it) => ({
      tipe: it.tipe,
      ref: it.tipe === 'apa' ? null : (it.ref ?? null),
      jumlah: Math.max(1, Math.floor(Number(it.jumlah) || 1)),
      minBintang: Math.min(3, Math.max(0, Math.floor(Number(it.minBintang) || 0))),
    }));
}

export async function simpanTantangan(input: {
  id?: string; judul: string; deskripsi: string; lencanaKode: string; bonusKoin: number; syarat: SyaratItem[]; aktif: boolean;
}) {
  const s = await adminDb();
  const judul = input.judul.trim();
  if (!judul) throw new Error('Judul tantangan wajib diisi.');
  const syarat = bersihkanSyarat(input.syarat);
  if (syarat.length === 0) throw new Error('Tambahkan minimal 1 syarat game.');
  const baris = {
    judul,
    deskripsi: input.deskripsi.trim(),
    lencana_kode: input.lencanaKode,
    bonus_koin: Math.max(0, Math.floor(Number(input.bonusKoin) || 0)),
    syarat,
    aktif: input.aktif,
  };
  const q = input.id
    ? s.from('tantangan_kustom').update(baris).eq('id', input.id)
    : s.from('tantangan_kustom').insert(baris);
  const { error } = await q;
  if (error) throw new Error(error.message);
  revalidatePath('/admin/tantangan');
}

export async function setAktifTantangan(id: string, aktif: boolean) {
  const s = await adminDb();
  const { error } = await s.from('tantangan_kustom').update({ aktif }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/tantangan');
}

export async function hapusTantangan(id: string) {
  const s = await adminDb();
  const { error } = await s.from('tantangan_kustom').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/tantangan');
}
