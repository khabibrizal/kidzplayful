// src/app/anak/[anakId]/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import KelolaAnak from './KelolaAnak';

export default async function AnakPage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: anak } = await supabase.from('anak').select('id,nama,tanggal_lahir,batas_menit,jenis_kelamin').eq('id', anakId).single();
  if (!anak) redirect('/pilih-anak');

  return (
    <main style={{ maxWidth: 440, margin: '20px auto', padding: 16 }}>
      <Link href="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }}>← kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 14px' }}>🧒 Kelola {anak.nama}</h1>
      <KelolaAnak anak={anak} />
      <p style={{ textAlign: 'center', marginTop: 14 }}>
        <Link href={`/anak/${anak.id}/laporan`} className="kp-btn putih" style={{ display: 'inline-block' }}>📊 Lihat Laporan Perkembangan</Link>
      </p>
    </main>
  );
}
