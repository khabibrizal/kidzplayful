// src/components/EventCarousel.tsx — carousel event di dashboard
'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import type { EventKelas } from '@/lib/game/tipe';
import EventCard from './EventCard';

export default function EventCarousel({ events, statusMap = {} }: { events: EventKelas[]; statusMap?: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  if (!events.length) return null;

  function onScroll() {
    const el = ref.current; if (!el) return;
    setIdx(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>✨ EVENT KELAS BERMAIN</div>
        <Link href="/event" style={{ fontSize: 13, color: 'var(--biru-d)' }}>Lihat semua →</Link>
      </div>
      <div ref={ref} onScroll={onScroll}
        style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }}>
        {events.map((ev) => (
          <div key={ev.id} style={{ flex: '0 0 100%', scrollSnapAlign: 'start' }}><EventCard ev={ev} status={statusMap[ev.id]} /></div>
        ))}
      </div>
      {events.length > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
          {events.map((_, i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: 99, background: i === idx ? 'var(--lavender)' : '#dcd5ec' }} />
          ))}
        </div>
      )}
    </div>
  );
}
