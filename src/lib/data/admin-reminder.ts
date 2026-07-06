// src/lib/data/admin-reminder.ts — data reminder event (admin)
import { createClient } from '@/lib/supabase/server';

export interface ReminderRow {
  id: string;
  reminder_terkirim: boolean;
  anak_nama: string[];
  event: { id: string; judul: string; lokasi: string | null; tanggal: string | null; jam_mulai: string | null; jam_selesai: string | null } | null;
  nama: string | null;
  no_wa: string | null;
}

/** Semua pendaftaran "diterima" (semua event), urut tanggal terbaru di atas. */
export async function getReminderPendaftaran(): Promise<ReminderRow[]> {
  const s = await createClient();
  const { data } = await s
    .from('pendaftaran_event')
    .select('id, reminder_terkirim, anak_nama, event:event_id(id,judul,lokasi,tanggal,jam_mulai,jam_selesai), ortu:ortu_id(nama_tampilan,no_wa)')
    .eq('status', 'diterima')
    .order('created_at', { ascending: false })
    .limit(500); // batas aman; reminder hanya untuk event mendatang
  const rows: ReminderRow[] = (data ?? []).map((r) => {
    const ev = (Array.isArray(r.event) ? r.event[0] : r.event) as ReminderRow['event'];
    const ortu = (Array.isArray(r.ortu) ? r.ortu[0] : r.ortu) as { nama_tampilan?: string; no_wa?: string } | null;
    return { id: r.id as string, reminder_terkirim: !!r.reminder_terkirim, anak_nama: (r.anak_nama ?? []) as string[], event: ev, nama: ortu?.nama_tampilan ?? null, no_wa: ortu?.no_wa ?? null };
  });
  return rows
    .filter((r) => r.event)
    .sort((a, b) => (b.event!.tanggal ?? '0000').localeCompare(a.event!.tanggal ?? '0000'));
}
