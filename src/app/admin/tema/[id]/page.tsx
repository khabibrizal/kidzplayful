// src/app/admin/tema/[id]/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { hapusPaket, setStatusTema, setMingguIni } from '@/lib/data/admin-konten';
import PaketForm from './PaketForm';
import PanduanForm from './PanduanForm';
import s from '../../admin.module.css';

export default async function KelolaTema({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tema } = await supabase.from('tema').select('id,nama,sampul,status,is_minggu_ini').eq('id', id).single();
  const { data: paket } = await supabase.from('paket_aset').select('id,mesin,judul').eq('tema_id', id).order('urutan');
  const { data: panduan } = await supabase.from('panduan').select('bahan,langkah,worksheet_url').eq('tema_id', id).maybeSingle();

  if (!tema) return <p>Tema tidak ditemukan. <Link href="/admin">kembali</Link></p>;

  async function aksiHapusPaket(fd: FormData) { 'use server'; await hapusPaket(String(fd.get('pid')), id); }
  async function aksiStatus(fd: FormData) { 'use server'; await setStatusTema(id, String(fd.get('status')) as 'draf' | 'disetujui'); }
  async function aksiMinggu() { 'use server'; await setMingguIni(id); }

  return (
    <div>
      <Link href="/admin" className={s.muted}>← semua tema</Link>
      <div className={s.head} style={{ marginTop: 8 }}>
        <h1>{tema.sampul} {tema.nama}</h1>
        <div className={s.row}>
          <span className={`${s.tag} ${tema.status === 'disetujui' ? s.tagOk : s.tagDraf}`}>{tema.status}</span>
          {tema.is_minggu_ini && <span className={`${s.tag} ${s.tagNow}`}>Minggu Ini</span>}
        </div>
      </div>

      <div className={s.row}>
        <form action={aksiStatus}><input type="hidden" name="status" value={tema.status === 'disetujui' ? 'draf' : 'disetujui'} /><button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>{tema.status === 'disetujui' ? 'Jadikan Draf' : 'Setujui'}</button></form>
        {!tema.is_minggu_ini && <form action={aksiMinggu}><button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }}>Jadikan Minggu Ini</button></form>}
      </div>

      <div className={s.section}>Game ({paket?.length ?? 0})</div>
      {(paket ?? []).map((p) => (
        <div key={p.id} className={s.card}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{p.judul}</b> <span className={s.muted}>({p.mesin})</span></span>
            <form action={aksiHapusPaket}><input type="hidden" name="pid" value={p.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
      <div className={s.muted} style={{ margin: '6px 0' }}>Tambah game dari worksheet:</div>
      <PaketForm temaId={id} />

      <div className={s.section}>Video</div>
      <p className={s.muted}>Video dikelola per kategori usia di <Link href="/admin/video">Kelola Video</Link>.</p>

      <div className={s.section}>Panduan Ortu 0-2 (dari worksheet)</div>
      <PanduanForm temaId={id} awal={panduan ? { bahan: panduan.bahan, langkah: (panduan.langkah ?? []) as string[], worksheet_url: panduan.worksheet_url } : null} />
    </div>
  );
}
