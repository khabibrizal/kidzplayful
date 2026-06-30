// src/app/admin/reminder/page.tsx
import Link from 'next/link';
import { getReminderPendaftaran } from '@/lib/data/admin-reminder';
import ReminderAdmin from './ReminderAdmin';
import s from '../admin.module.css';

export default async function AdminReminderPage() {
  const rows = await getReminderPendaftaran();
  const todayStr = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const besokStr = new Date(Date.now() + 7 * 3600 * 1000 + 86400000).toISOString().slice(0, 10);
  return (
    <div>
      <Link href="/admin" className={s.muted}>← dashboard</Link>
      <div className={s.head} style={{ marginTop: 8 }}><h1>📣 Reminder Event</h1></div>
      <p className={s.muted} style={{ marginBottom: 10 }}>Semua event ditampilkan (event <b>BESOK</b> disorot). Klik "Kirim WA" → WhatsApp terbuka dengan pesan siap kirim, lalu tandai "terkirim".</p>
      <ReminderAdmin rows={rows} todayStr={todayStr} besokStr={besokStr} />
    </div>
  );
}
