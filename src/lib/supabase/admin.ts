// src/lib/supabase/admin.ts — Supabase client SERVICE ROLE (server-only, bypass RLS)
// HANYA untuk operasi admin sensitif (mis. buat user). JANGAN pernah dipakai di client.
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server (env). Fitur buat user nonaktif sampai key diisi.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
