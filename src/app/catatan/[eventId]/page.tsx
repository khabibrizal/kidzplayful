// src/app/catatan/[eventId]/page.tsx — ortu lihat Catatan Perkembangan anaknya di satu event
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEvent } from '@/lib/data/event';
import { getCatatanEventSaya } from '@/lib/data/catatan';
import CatatanCard from '@/components/CatatanCard';

export default async function CatatanEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const ev = await getEvent(eventId);
  const list = await getCatatanEventSaya(eventId);

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      <Link href="/event" style={{ color: 'var(--abu)', fontSize: 13 }}>← Kembali ke Event</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 20, margin: '8px 0 14px' }}>📋 Catatan Perkembangan Bermain</h1>
      {ev && <p style={{ color: 'var(--abu)', fontSize: 14, marginTop: -8, marginBottom: 14 }}>{ev.judul}</p>}
      {list.length === 0
        ? <p style={{ color: 'var(--abu)' }}>Catatan perkembangan belum tersedia. Akan muncul setelah guru mengisinya.</p>
        : list.map(({ c, nama }) => (
          <div key={c.id}>
            <div style={{ fontWeight: 700, margin: '4px 2px 6px' }}>🧒 {nama}</div>
            <CatatanCard c={c} />
          </div>
        ))}
    </main>
  );
}
