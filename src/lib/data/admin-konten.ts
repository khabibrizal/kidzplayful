// src/lib/data/admin-konten.ts
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Mesin } from '@/lib/game/tipe';
import { validasiButir } from '@/lib/game/butir';

async function db() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return supabase;
}

export async function buatTema(nama: string, sampul: string) {
  const supabase = await db();
  if (!nama.trim()) throw new Error('Nama tema wajib diisi.');
  const { error } = await supabase.from('tema').insert({ nama: nama.trim(), sampul: sampul.trim() || '🎈', status: 'draf' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function hapusTema(id: string) {
  const supabase = await db();
  const { error } = await supabase.from('tema').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function setStatusTema(id: string, status: 'draf' | 'disetujui') {
  const supabase = await db();
  const { error } = await supabase.from('tema').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin'); revalidatePath(`/admin/tema/${id}`);
}

export async function setMingguIni(id: string) {
  const supabase = await db();
  await supabase.from('tema').update({ is_minggu_ini: false }).neq('id', id); // hanya 1 minggu ini
  const { error } = await supabase.from('tema').update({ is_minggu_ini: true, status: 'disetujui' }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin'); revalidatePath(`/admin/tema/${id}`);
}

export async function buatPaket(input: {
  temaId: string; mesin: Mesin; judul: string; areaSkill: string; usiaMin: number; usiaMax: number; butir: unknown;
}) {
  const supabase = await db();
  const err = validasiButir(input.mesin, input.butir);
  if (err) throw new Error(err);
  const { error } = await supabase.from('paket_aset').insert({
    tema_id: input.temaId, mesin: input.mesin, judul: input.judul.trim() || 'Game',
    area_skill: input.areaSkill, usia_min: input.usiaMin, usia_max: input.usiaMax,
    sumber: 'manual', status: 'disetujui', butir: input.butir,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tema/${input.temaId}`);
}

export async function hapusPaket(id: string, temaId: string) {
  const supabase = await db();
  const { error } = await supabase.from('paket_aset').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tema/${temaId}`);
}

export async function buatVideo(input: { judul: string; youtubeId: string; kategori: 'baby' | 'toddler'; durasiDetik: number }) {
  const supabase = await db();
  const yid = await ekstrakYoutubeId(input.youtubeId);
  if (!yid) throw new Error('Link/ID YouTube tidak valid.');
  const { error } = await supabase.from('video').insert({
    tema_id: null, judul: input.judul.trim() || 'Video', youtube_id: yid,
    kategori: input.kategori, durasi_detik: input.durasiDetik || 0, status: 'disetujui', link_ok: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/video');
}

export async function hapusVideo(id: string) {
  const supabase = await db();
  const { error } = await supabase.from('video').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/video');
}

export async function simpanPanduan(input: { temaId: string; judul: string; aktivitas: string; bahan: string; caraMembuat: string; langkah: string[]; linkIde: string; worksheetUrl: string | null }) {
  const supabase = await db();
  const { error } = await supabase.from('panduan').upsert({
    tema_id: input.temaId,
    judul: input.judul.trim() || null,
    aktivitas: input.aktivitas.trim() || null,
    bahan: input.bahan.trim() || null,
    cara_membuat: input.caraMembuat.trim() || null,
    langkah: input.langkah.filter((x) => x.trim()),
    link_ide: input.linkIde.trim() || null,
    worksheet_url: input.worksheetUrl?.trim() || null,
    status: 'disetujui',
  }, { onConflict: 'tema_id' });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/kelas-bermain/${input.temaId}`);
}

export async function ekstrakYoutubeId(s: string): Promise<string | null> {
  const t = s.trim();
  if (!t) return null;
  // ID mentah (11 karakter)
  if (/^[\w-]{11}$/.test(t)) return t;
  // Semua format URL umum: watch?v=, youtu.be/, embed/, shorts/, live/, /v/
  const m = t.match(/(?:v=|vi=|youtu\.be\/|embed\/|shorts\/|live\/|\/v\/)([\w-]{11})/);
  if (m) return m[1];
  // Fallback aman: kalau ini memang URL YouTube, ambil token 11 karakter pertama yang valid
  if (/youtu/i.test(t)) {
    const any = t.match(/[\w-]{11}/);
    if (any) return any[0];
  }
  return null;
}
