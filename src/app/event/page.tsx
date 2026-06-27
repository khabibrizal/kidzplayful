// src/app/event/page.tsx — daftar semua event (sisi user)
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEventTampil } from '@/lib/data/event';
import EventCard from '@/components/EventCard';

export default async function EventListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const events = await getEventTampil();

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      <Link href="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }}>← Kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '10px 0 16px' }}>✨ Event Kelas Bermain</h1>
      {events.length === 0
        ? <p style={{ color: 'var(--abu)' }}>Belum ada event saat ini.</p>
        : events.map((ev) => <div key={ev.id} style={{ marginBottom: 14 }}><EventCard ev={ev} /></div>)}
    </main>
  );
}
