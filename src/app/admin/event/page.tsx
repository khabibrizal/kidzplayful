// src/app/admin/event/page.tsx
import { getEventSemua, getJumlahPendaftar, getJumlahMenunggu } from '@/lib/data/admin-event';
import EventAdmin from './EventAdmin';

export default async function AdminEventPage() {
  const [events, counts, menunggu] = await Promise.all([getEventSemua(), getJumlahPendaftar(), getJumlahMenunggu()]);
  return <EventAdmin awal={events} counts={counts} menunggu={menunggu} />;
}
