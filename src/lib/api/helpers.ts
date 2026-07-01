// src/lib/api/helpers.ts — util untuk REST API (dipakai aplikasi mobile Flutter)
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** JSON sukses. */
export function ok(data: unknown, status = 200) {
  return Response.json({ ok: true, data }, { status });
}
/** JSON error. */
export function fail(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

/** Client Supabase anonim (untuk login/register — belum ada token). */
export function anonClient(): SupabaseClient {
  return createClient(URL, ANON, { auth: { persistSession: false } });
}

/**
 * Ambil user dari header Authorization: Bearer <access_token>.
 * Mengembalikan client Supabase yang ter-scope token itu (RLS berlaku) + user.
 */
export async function getAuth(req: Request): Promise<
  | { supabase: SupabaseClient; user: User }
  | { error: string; status: number }
> {
  const authz = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = authz.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { error: 'Token tidak ada (kirim header Authorization: Bearer <access_token>)', status: 401 };
  const supabase = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Token tidak valid / kedaluwarsa', status: 401 };
  return { supabase, user };
}

/** True bila hasil getAuth berupa error. */
export function isAuthErr(a: Awaited<ReturnType<typeof getAuth>>): a is { error: string; status: number } {
  return 'error' in a;
}
