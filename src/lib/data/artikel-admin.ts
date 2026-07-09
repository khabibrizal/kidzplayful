// src/lib/data/artikel-admin.ts — CRUD artikel (admin)
'use server';
import { revalidatePath, updateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/slug';

async function adminDb() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return supabase;
}

/** Buat artikel draf baru dari judul → kembalikan id untuk lanjut edit. */
export async function buatArtikel(judul: string): Promise<string> {
  const supabase = await adminDb();
  const j = judul.trim();
  if (!j) throw new Error('Judul wajib diisi.');
  const dasar = slugify(j) || 'artikel';
  // pastikan slug unik
  let slug = dasar;
  for (let i = 2; i < 50; i++) {
    const { data: ada } = await supabase.from('artikel').select('id').eq('slug', slug).maybeSingle();
    if (!ada) break;
    slug = `${dasar}-${i}`;
  }
  const { data, error } = await supabase
    .from('artikel')
    .insert({ judul: j, slug, status: 'draf' })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/admin/artikel');
  return data.id as string;
}

export async function simpanArtikel(input: {
  id: string; judul: string; slug: string; ringkasan: string; isi: string; sampulUrl: string; status: 'draf' | 'terbit';
}) {
  const supabase = await adminDb();
  const judul = input.judul.trim();
  if (!judul) throw new Error('Judul wajib diisi.');
  const slug = slugify(input.slug) || slugify(judul);
  if (!slug) throw new Error('Slug tidak valid.');
  // cek slug unik (selain diri sendiri)
  const { data: bentrok } = await supabase.from('artikel').select('id').eq('slug', slug).neq('id', input.id).maybeSingle();
  if (bentrok) throw new Error('Slug sudah dipakai artikel lain.');

  // set terbit_pada saat pertama kali terbit
  const patch: Record<string, unknown> = {
    judul, slug,
    ringkasan: input.ringkasan.trim(),
    isi: input.isi,
    sampul_url: input.sampulUrl.trim() || null,
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.status === 'terbit') {
    const { data: lama } = await supabase.from('artikel').select('terbit_pada').eq('id', input.id).single();
    if (!lama?.terbit_pada) patch.terbit_pada = new Date().toISOString();
  }
  const { error } = await supabase.from('artikel').update(patch).eq('id', input.id);
  if (error) throw new Error(error.message);
  updateTag('artikel'); // invalidasi cache publik (unstable_cache)
  revalidatePath('/admin/artikel');
  revalidatePath('/artikel');
  revalidatePath(`/artikel/${slug}`);
}

export async function hapusArtikel(id: string) {
  const supabase = await adminDb();
  const { error } = await supabase.from('artikel').delete().eq('id', id);
  if (error) throw new Error(error.message);
  updateTag('artikel'); // invalidasi cache publik
  revalidatePath('/admin/artikel');
  revalidatePath('/artikel');
}
