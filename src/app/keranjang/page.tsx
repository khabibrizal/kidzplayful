// src/app/keranjang/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getKeranjang } from '@/lib/data/keranjang';
import { getStatusLangganan } from '@/lib/data/langganan-status';
import KeranjangView from './KeranjangView';
import BottomNav from '@/components/BottomNav';

export default async function KeranjangPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [items, { data: prof }, status] = await Promise.all([
    getKeranjang(),
    supabase.from('profiles').select('nama_tampilan,no_wa,alamat').eq('id', user.id).single(),
    getStatusLangganan(supabase, user.id),
  ]);

  return (
    <main className="kp-page-narrow" style={{ padding: 16, paddingBottom: 90, marginTop: 24 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '4px 0 14px' }}>🛒 Keranjang</h1>
      <KeranjangView awal={items} status={status} profil={{ nama: prof?.nama_tampilan ?? '', noWa: prof?.no_wa ?? '', alamat: prof?.alamat ?? '' }} />
      <BottomNav />
    </main>
  );
}
