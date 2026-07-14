// src/lib/data/admin-anak.ts — baca daftar anak untuk panel gamifikasi admin
import { createClient } from '@/lib/supabase/server';

export interface AnakAdmin {
  id: string;
  nama: string;
  koin: number;
  streak: number;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  email: string | null;
  namaOrtu: string | null;
  lencana: string[];
}

type RawOrtu = { email: string | null; nama_tampilan: string | null } | { email: string | null; nama_tampilan: string | null }[] | null;
interface RawAnak {
  id: string; nama: string; koin: number | null; streak: number | null;
  jenis_kelamin: string | null; tanggal_lahir: string | null;
  ortu: RawOrtu; lencana_anak: { kode: string }[] | null;
}

export async function getAnakUntukAdmin(): Promise<AnakAdmin[]> {
  const s = await createClient();
  const { data } = await s
    .from('anak')
    .select('id,nama,koin,streak,jenis_kelamin,tanggal_lahir,ortu:ortu_id(email,nama_tampilan),lencana_anak(kode)')
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as RawAnak[];
  return rows.map((a) => {
    const ortu = Array.isArray(a.ortu) ? a.ortu[0] : a.ortu;
    return {
      id: a.id,
      nama: a.nama,
      koin: a.koin ?? 0,
      streak: a.streak ?? 0,
      jenis_kelamin: a.jenis_kelamin ?? null,
      tanggal_lahir: a.tanggal_lahir ?? null,
      email: ortu?.email ?? null,
      namaOrtu: ortu?.nama_tampilan ?? null,
      lencana: (a.lencana_anak ?? []).map((l) => l.kode),
    };
  });
}
