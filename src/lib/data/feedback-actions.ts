// src/lib/data/feedback-actions.ts — kirim survei feedback aplikasi
'use server';
import { createClient } from '@/lib/supabase/server';
import type { JawabanFeedback } from '@/lib/feedback-tipe';

export async function kirimFeedback(j: JawabanFeedback) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  if (!j.apa?.trim() && !j.saran?.trim()) throw new Error('Isi minimal pertanyaan pertama atau saran ya.');

  const jawaban: JawabanFeedback = {
    apa: (j.apa ?? '').trim().slice(0, 1000),
    fitur: j.fitur ?? '',
    fiturLain: (j.fiturLain ?? '').trim().slice(0, 200),
    bingung: (j.bingung ?? '').trim().slice(0, 1000),
    kurang: (j.kurang ?? '').trim().slice(0, 1000),
    bersedia: j.bersedia ?? '',
    harga: j.harga ?? '',
    nps: j.nps && j.nps >= 1 && j.nps <= 10 ? j.nps : null,
    saran: (j.saran ?? '').trim().slice(0, 2000),
  };
  // pesan = ringkas untuk tampilan cepat admin (Q8 → Q1)
  const pesan = (jawaban.saran || jawaban.apa || '(tanpa teks)');
  const { error } = await supabase.from('feedback').insert({ ortu_id: user.id, jawaban, pesan, rating: null });
  if (error) throw new Error(error.message);
}
