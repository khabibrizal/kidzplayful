// src/lib/data/skor.ts — Server Action catat hasil main (web); logika inti di skor-core.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { catatHasilCore, type InputHasil } from './skor-core';

export async function catatHasil(input: InputHasil) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  return catatHasilCore(supabase, input);
}
