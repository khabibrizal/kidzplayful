// src/app/store/page.tsx — katalog Store
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProdukTampil } from '@/lib/data/store';
import StoreView from './StoreView';
import BottomNav from '@/components/BottomNav';

export default async function StorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const produk = await getProdukTampil();

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16, paddingBottom: 90 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '4px 0 14px' }}>🛒 Store</h1>
      <StoreView produk={produk} />
      <BottomNav />
    </main>
  );
}
