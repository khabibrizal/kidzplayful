// src/app/admin/kelas-bermain/[temaId]/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PanduanForm from '../PanduanForm';
import s from '../../admin.module.css';

export default async function KelasBermainTema({ params }: { params: Promise<{ temaId: string }> }) {
  const { temaId } = await params;
  const supabase = await createClient();
  const { data: tema } = await supabase.from('tema').select('id,nama,sampul').eq('id', temaId).single();
  const { data: panduan } = await supabase.from('panduan').select('judul,aktivitas,bahan,cara_membuat,langkah,worksheet_url,link_ide').eq('tema_id', temaId).maybeSingle();

  if (!tema) return <p>Tema tidak ditemukan. <Link href="/admin/kelas-bermain">kembali</Link></p>;

  return (
    <div>
      <Link href="/admin/kelas-bermain" className={s.muted}>← Kelas Bermain</Link>
      <div className={s.head} style={{ marginTop: 8 }}>
        <h1>{tema.sampul} {tema.nama}</h1>
      </div>
      <div className={s.section}>Kelas Bermain (Mode Anak + Ortu)</div>
      <PanduanForm temaId={temaId} awal={panduan ? { judul: panduan.judul, aktivitas: panduan.aktivitas, bahan: panduan.bahan, cara_membuat: panduan.cara_membuat, langkah: (panduan.langkah ?? []) as string[], link_ide: panduan.link_ide, worksheet_url: panduan.worksheet_url } : null} />
    </div>
  );
}
