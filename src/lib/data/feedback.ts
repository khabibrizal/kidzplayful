// src/lib/data/feedback.ts — baca masukan (admin)
import { createClient } from '@/lib/supabase/server';
import type { JawabanFeedback } from '@/lib/feedback-tipe';

export interface FeedbackRow { id: string; dibuat_at: string; email: string | null; jawaban: Partial<JawabanFeedback>; pesan: string; }
type Raw = { id: string; pesan: string; dibuat_at: string; jawaban: Partial<JawabanFeedback> | null; ortu: { email: string | null } | { email: string | null }[] | null };

export async function getFeedbackAdmin(): Promise<FeedbackRow[]> {
  const s = await createClient();
  const { data } = await s
    .from('feedback')
    .select('id,pesan,dibuat_at,jawaban,ortu:ortu_id(email)')
    .order('dibuat_at', { ascending: false })
    .limit(200);
  return ((data ?? []) as unknown as Raw[]).map((f) => ({
    id: f.id, dibuat_at: f.dibuat_at, pesan: f.pesan, jawaban: f.jawaban ?? {},
    email: (Array.isArray(f.ortu) ? f.ortu[0] : f.ortu)?.email ?? null,
  }));
}
