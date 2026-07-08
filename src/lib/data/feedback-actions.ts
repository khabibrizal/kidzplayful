// src/lib/data/feedback-actions.ts — kirim masukan/feedback aplikasi
'use server';
import { createClient } from '@/lib/supabase/server';

export async function kirimFeedback(rating: number, pesan: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const p = pesan.trim();
  if (!p) throw new Error('Tulis masukan Anda dulu ya.');
  const r = rating >= 1 && rating <= 5 ? rating : null;
  const { error } = await supabase.from('feedback').insert({ ortu_id: user.id, rating: r, pesan: p.slice(0, 2000) });
  if (error) throw new Error(error.message);
}
