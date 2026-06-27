// src/app/admin/event/page.tsx
import { getEventSemua, getJumlahPendaftar } from '@/lib/data/admin-event';
import EventAdmin from './EventAdmin';

export default async function AdminEventPage() {
  const events = await getEventSemua();
  const counts = await getJumlahPendaftar();
  return <EventAdmin awal={events} counts={counts} />;
}
