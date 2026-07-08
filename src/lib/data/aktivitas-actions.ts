// src/lib/data/aktivitas-actions.ts — catat aktivitas buka fitur (ringan, fire-and-forget)
'use server';
import { createClient } from '@/lib/supabase/server';

export async function catatAktivitas(fitur: string, anakId?: string | null) {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;
    await s.from('aktivitas').insert({ ortu_id: user.id, fitur, anak_id: anakId ?? null });
  } catch { /* abaikan (mis. migrasi 0046 belum jalan) */ }
}
