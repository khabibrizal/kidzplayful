// src/app/admin/pesanan/page.tsx
import { getPesananSemua } from '@/lib/data/admin-store';
import PesananAdmin from './PesananAdmin';
import Pager from '../Pager';

export default async function AdminPesananPage({ searchParams }: { searchParams: Promise<{ hal?: string }> }) {
  const { hal } = await searchParams;
  const halNum = Math.max(1, Number(hal) || 1);
  const { rows, total, perHal } = await getPesananSemua(halNum);
  const totalHal = Math.max(1, Math.ceil(total / perHal));
  return (
    <div>
      <PesananAdmin awal={rows} />
      <Pager hal={halNum} totalHal={totalHal} total={total} basePath="/admin/pesanan" />
    </div>
  );
}
