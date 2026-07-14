// src/lib/data/admin-users-actions.ts — kelola role user (admin/super user)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const KOLOM: Record<string, 'is_superuser' | 'is_admin' | 'is_guru' | 'is_investor'> = {
  superuser: 'is_superuser', admin: 'is_admin', guru: 'is_guru', investor: 'is_investor',
};
const ROLE_TINGGI = new Set(['superuser', 'admin']); // hanya super user yang boleh atur

async function pengelola() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) throw new Error('Tidak berwenang.');
  return { s, uid: user.id, isSuperuser: !!prof.is_superuser };
}

async function terapkanRole(userId: string, role: string, value: boolean) {
  const kolom = KOLOM[role];
  if (!kolom) throw new Error('Role tidak dikenal.');
  const { s, uid, isSuperuser } = await pengelola();
  if (ROLE_TINGGI.has(role) && !isSuperuser) throw new Error('Hanya Super User yang dapat mengatur role Admin / Super User.');
  if (role === 'superuser' && !value && userId === uid) throw new Error('Tidak dapat mencabut Super User dari diri sendiri.');

  // Set super user otomatis juga jadikan admin (agar bisa akses panel admin)
  const patch: Record<string, boolean> = { [kolom]: value };
  if (role === 'superuser' && value) patch.is_admin = true;

  const { error } = await s.from('profiles').update(patch).eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/users');
}

/** Toggle role via form (userId, role, value). */
export async function setRole(formData: FormData) {
  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '');
  const value = String(formData.get('value') ?? '') === '1';
  if (!userId) throw new Error('User tidak valid.');
  await terapkanRole(userId, role, value);
}

/** Buat user baru (akun auth) + tetapkan role. Butuh SUPABASE_SERVICE_ROLE_KEY.
 *  Mengembalikan {ok,error} (bukan throw) agar pesan tak diredaksi Next.js di produksi. */
export async function buatUser(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const { isSuperuser } = await pengelola();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '');
    const nama = String(formData.get('nama') ?? '').trim();
    const role = String(formData.get('role') ?? '');
    if (!email || !/.+@.+\..+/.test(email)) return { ok: false, error: 'Email tidak valid.' };
    if (password.length < 6) return { ok: false, error: 'Kata sandi minimal 6 karakter.' };
    if (role && !KOLOM[role]) return { ok: false, error: 'Role tidak dikenal.' };
    if (ROLE_TINGGI.has(role) && !isSuperuser) return { ok: false, error: 'Hanya Super User yang dapat membuat Admin / Super User.' };

    const admin = createAdminClient();
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: nama ? { nama_tampilan: nama } : undefined,
    });
    if (error) return { ok: false, error: `Auth: ${error.message}` };
    const uid = created.user?.id;
    if (!uid) return { ok: false, error: 'Gagal membuat user (tanpa id).' };

    // Profil dibuat otomatis oleh trigger DB. Set nama + role via service role (bypass RLS/trigger).
    const patch: Record<string, unknown> = {};
    if (nama) patch.nama_tampilan = nama;
    if (role) { patch[KOLOM[role]] = true; if (role === 'superuser') patch.is_admin = true; }
    if (Object.keys(patch).length) {
      const { error: e2 } = await admin.from('profiles').update(patch).eq('id', uid);
      if (e2) return { ok: false, error: `Profil: ${e2.message}` };
    }
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal membuat user.' };
  }
}

/** Tambah role berdasarkan email (akun harus sudah terdaftar). */
export async function tambahUserRole(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? '');
  if (!email) throw new Error('Email wajib diisi.');
  const { s } = await pengelola();
  const { data: prof } = await s.from('profiles').select('id').eq('email', email).maybeSingle();
  if (!prof) throw new Error('Email belum terdaftar. Minta user mendaftar dulu di halaman Daftar, lalu tetapkan role di sini.');
  await terapkanRole(prof.id, role, true);
}
