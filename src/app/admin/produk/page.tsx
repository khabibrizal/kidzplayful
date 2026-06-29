// src/app/admin/produk/page.tsx
import { getProdukSemua } from '@/lib/data/admin-store';
import ProdukAdmin from './ProdukAdmin';

export default async function AdminProdukPage() {
  const produk = await getProdukSemua();
  return <ProdukAdmin awal={produk} />;
}
