// src/app/store/[id]/page.tsx — detail produk
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProduk } from '@/lib/data/store';
import { getStatusLangganan } from '@/lib/data/langganan-status';
import ProdukDetail from './ProdukDetail';

export default async function ProdukDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [produk, status] = await Promise.all([getProduk(id), getStatusLangganan(supabase, user.id)]);
  if (!produk || produk.status !== 'tampil') redirect('/store');
  return <ProdukDetail p={produk} status={status} />;
}
