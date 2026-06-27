// src/app/event/[id]/daftar/page.tsx — halaman pendaftaran event
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
  return <DaftarForm ev={ev} anak={anak ?? []} />;
}
