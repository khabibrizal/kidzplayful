// src/app/admin/pesanan/page.tsx
import { getPesananSemua } from '@/lib/data/admin-store';
import PesananAdmin from './PesananAdmin';

export default async function AdminPesananPage() {
  const list = await getPesananSemua();
  return <PesananAdmin awal={list} />;
}
