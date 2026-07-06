// src/app/admin/artikel/[id]/page.tsx — editor artikel (admin)
import { notFound } from 'next/navigation';
import { getArtikelById } from '@/lib/data/artikel';
import ArtikelForm from './ArtikelForm';

export default async function AdminArtikelEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getArtikelById(id);
  if (!a) notFound();
  return <ArtikelForm artikel={a} />;
}
