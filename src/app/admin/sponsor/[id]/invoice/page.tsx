// src/app/admin/sponsor/[id]/invoice/page.tsx — halaman invoice sponsor untuk dicetak/unduh PDF
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDeal } from '@/lib/data/sponsor';
import InvoiceSponsorView from '@/components/InvoiceSponsorView';
import UnduhPdfBtn from '@/components/UnduhPdfBtn';

export default async function InvoiceSponsorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) notFound();

  return (
    <div style={{ padding: 16 }}>
      <style>{`@media print { @page { size: A4; margin: 14mm; } body { background:#fff; } }`}</style>
      <div className="no-print" style={{ maxWidth: 720, margin: '0 auto 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href={`/admin/sponsor/${id}`} style={{ color: 'var(--abu)', fontSize: 13 }}>← kembali</Link>
        <UnduhPdfBtn judul={deal.no_invoice || 'Invoice-Sponsor'} />
      </div>
      <InvoiceSponsorView deal={deal} />
    </div>
  );
}
