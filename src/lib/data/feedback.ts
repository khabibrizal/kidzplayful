// src/lib/data/feedback.ts — baca masukan (admin)
import { createClient } from '@/lib/supabase/server';

export interface FeedbackRow { id: string; rating: number | null; pesan: string; dibuat_at: string; email: string | null; }
type Raw = { id: string; rating: number | null; pesan: string; dibuat_at: string; ortu: { email: string | null } | { email: string | null }[] | null };

export async function getFeedbackAdmin(): Promise<FeedbackRow[]> {
  const s = await createClient();
  const { data } = await s
    .from('feedback')
    .select('id,rating,pesan,dibuat_at,ortu:ortu_id(email)')
    .order('dibuat_at', { ascending: false })
    .limit(200);
  return ((data ?? []) as unknown as Raw[]).map((f) => ({
    id: f.id, rating: f.rating, pesan: f.pesan, dibuat_at: f.dibuat_at,
    email: (Array.isArray(f.ortu) ? f.ortu[0] : f.ortu)?.email ?? null,
  }));
}
