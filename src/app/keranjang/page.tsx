// src/app/keranjang/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getKeranjang } from '@/lib/data/keranjang';
import KeranjangView from './KeranjangView';
import BottomNav from '@/components/BottomNav';

export default async function KeranjangPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const items = await getKeranjang();

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16, paddingBottom: 90 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '4px 0 14px' }}>🛒 Keranjang</h1>
      <KeranjangView awal={items} />
      <BottomNav />
    </main>
  );
}
