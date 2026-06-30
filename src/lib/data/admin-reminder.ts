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

/** Pendaftaran "diterima" untuk event yang belum lewat (tanggal >= hari ini WIB). */
export async function getReminderPendaftaran(): Promise<ReminderRow[]> {
  const s = await createClient();
  const { data } = await s
    .from('pendaftaran_event')
    .select('id, reminder_terkirim, anak_nama, event:event_id(id,judul,lokasi,tanggal,jam_mulai,jam_selesai), ortu:ortu_id(nama_tampilan,no_wa)')
    .eq('status', 'diterima');
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); // WIB
  const rows: ReminderRow[] = (data ?? []).map((r) => {
    const ev = (Array.isArray(r.event) ? r.event[0] : r.event) as ReminderRow['event'];
    const ortu = (Array.isArray(r.ortu) ? r.ortu[0] : r.ortu) as { nama_tampilan?: string; no_wa?: string } | null;
    return { id: r.id as string, reminder_terkirim: !!r.reminder_terkirim, anak_nama: (r.anak_nama ?? []) as string[], event: ev, nama: ortu?.nama_tampilan ?? null, no_wa: ortu?.no_wa ?? null };
  });
  return rows
    .filter((r) => r.event && (!r.event.tanggal || r.event.tanggal >= today))
    .sort((a, b) => (a.event!.tanggal ?? '9999').localeCompare(b.event!.tanggal ?? '9999'));
}
