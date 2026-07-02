// src/app/event/[id]/daftar/page.tsx — halaman pendaftaran event
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEvent } from '@/lib/data/event';
import DaftarForm from './DaftarForm';

export default async function DaftarEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ev = await getEvent(id);
  if (!ev || ev.status !== 'tampil') redirect('/event');

  const { data: anak } = await supabase.from('anak').select('id,nama').eq('ortu_id', user.id).order('created_at');
  // anak yang sudah terdaftar (menunggu/diterima) di event ini → jangan tampilkan lagi
  const { data: pend } = await supabase.from('pendaftaran_event').select('anak_ids,status').eq('ortu_id', user.id).eq('event_id', id);
  const sudah = new Set<string>();
  for (const r of pend ?? []) if (r.status !== 'ditolak') for (const x of (r.anak_ids as string[]) ?? []) sudah.add(x);
  const tersisa = (anak ?? []).filter((a) => !sudah.has(a.id));

  // Semua anak sudah terdaftar → beri info, jangan tampilkan form kosong
  if ((anak ?? []).length > 0 && tersisa.length === 0) {
    return (
      <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
        <Link href="/event" style={{ color: 'var(--abu)', fontSize: 13 }}>← Kembali</Link>
        <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '10px 0 12px' }}>Daftar: {ev.judul}</h1>
        <div className="kp-card">Semua anak Anda sudah terdaftar di event ini. 🎉</div>
      </main>
    );
  }

  return <DaftarForm ev={ev} anak={tersisa} />;
}
