// src/lib/data/admin-anak.ts — baca daftar anak untuk panel gamifikasi admin
import { createClient } from '@/lib/supabase/server';

export interface AnakAdmin {
  id: string;
  nama: string;
  koin: number;
  streak: number;
  email: string | null;
  lencana: string[];
}

type RawOrtu = { email: string | null } | { email: string | null }[] | null;
interface RawAnak {
  id: string; nama: string; koin: number | null; streak: number | null;
  ortu: RawOrtu; lencana_anak: { kode: string }[] | null;
}

export async function getAnakUntukAdmin(): Promise<AnakAdmin[]> {
  const s = await createClient();
  const { data } = await s
    .from('anak')
    .select('id,nama,koin,streak,ortu:ortu_id(email),lencana_anak(kode)')
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as RawAnak[];
  return rows.map((a) => ({
    id: a.id,
    nama: a.nama,
    koin: a.koin ?? 0,
    streak: a.streak ?? 0,
    email: (Array.isArray(a.ortu) ? a.ortu[0] : a.ortu)?.email ?? null,
    lencana: (a.lencana_anak ?? []).map((l) => l.kode),
  }));
}
