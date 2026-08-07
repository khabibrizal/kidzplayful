// src/lib/data/admin-psikolog-actions.ts — jadikan/cabut psikolog (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) throw new Error('Bukan admin');
  return s;
}

/** Jadikan psikolog berdasarkan email (akun harus sudah terdaftar). */
export async function jadikanPsikolog(email: string): Promise<void> {
  const s = await adminDb();
  const e = email.trim().toLowerCase();
  if (!e) throw new Error('Email wajib diisi.');
  const { data: prof } = await s.from('profiles').select('id').eq('email', e).maybeSingle();
  if (!prof) throw new Error('Email belum terdaftar. Minta psikolog daftar dulu di halaman Daftar.');
  const { error } = await s.from('profiles').update({ is_psikolog: true }).eq('id', prof.id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/psikolog');
}

export async function cabutPsikolog(id: string): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('profiles').update({ is_psikolog: false }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/psikolog');
}

export interface InputProfilPsikolog {
  psikologId: string;
  nama: string;
  badge?: string;
  spesialisasi?: string;
  fotoUrl?: string;
  pendidikanS1?: string;
  pendidikanProfesi?: string;
  noStr?: string;
  pengalaman?: string;
  urutan?: number;
  aktif?: boolean;
}

const bersih = (v?: string) => (v ?? '').trim() || null;

/**
 * Simpan master profil psikolog (upsert satu baris per psikolog).
 * Mengembalikan {ok,error} — BUKAN throw — karena pesan error yang dilempar
 * ter-redact di production sehingga admin hanya melihat "an error occurred".
 */
export async function simpanProfilPsikolog(inp: InputProfilPsikolog): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    if (!inp.psikologId) return { ok: false, error: 'Psikolog tidak dikenali.' };
    const nama = (inp.nama ?? '').trim();
    if (!nama) return { ok: false, error: 'Nama wajib diisi.' };

    const { error } = await s.from('psikolog_profil').upsert({
      psikolog_id: inp.psikologId,
      nama,
      badge: bersih(inp.badge),
      spesialisasi: bersih(inp.spesialisasi),
      foto_url: bersih(inp.fotoUrl),
      pendidikan_s1: bersih(inp.pendidikanS1),
      pendidikan_profesi: bersih(inp.pendidikanProfesi),
      no_str: bersih(inp.noStr),
      pengalaman: bersih(inp.pengalaman),
      urutan: Number.isFinite(Number(inp.urutan)) ? Math.floor(Number(inp.urutan)) : 0,
      aktif: inp.aktif !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'psikolog_id' });
    if (error) {
      // Tabel belum ada = migrasi 0087 belum dijalankan. Beri pesan yang bisa ditindaklanjuti.
      if (error.code === '42P01') return { ok: false, error: 'Tabel psikolog_profil belum ada — jalankan migrasi 0087_psikolog_profil.sql di Supabase SQL Editor.' };
      return { ok: false, error: error.message };
    }

    // Nama juga didenormalisasi ke jadwal_psikolog (dipakai daftar & chat) agar konsisten.
    await s.from('jadwal_psikolog').update({ nama }).eq('psikolog_id', inp.psikologId);

    revalidatePath('/admin/psikolog');
    revalidatePath('/konsultasi');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan profil.' };
  }
}
