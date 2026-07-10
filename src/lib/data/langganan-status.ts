// src/lib/data/langganan-status.ts — ambil status langganan user (untuk harga diskon)
import { createClient } from '@/lib/supabase/server';
import { statusLangganan } from '@/lib/domain/trial';

type Supa = Awaited<ReturnType<typeof createClient>>;

export async function getStatusLangganan(s: Supa, userId: string): Promise<string> {
  const { data: lang } = await s.from('langganan').select('trial_mulai,aktif_sampai').eq('ortu_id', userId).maybeSingle();
  if (!lang) return 'kadaluarsa';
  return statusLangganan(
    { trialMulai: new Date((lang.trial_mulai as string) + 'T00:00:00Z'), aktifSampai: lang.aktif_sampai ? new Date((lang.aktif_sampai as string) + 'T00:00:00Z') : null },
    new Date(),
  );
}

/** Status langganan user yang sedang login (null bila belum login). */
export async function getStatusSaya(): Promise<string | null> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  return getStatusLangganan(s, user.id);
}

/** User dikenai pembatasan trial bila belum "aktif" (trial/tenggang/kadaluarsa). */
export function dibatasiTrial(status: string | null): boolean {
  return status !== 'aktif';
}
