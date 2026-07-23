// src/app/admin/tema/[id]/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { hapusPaket, setStatusTema, setMingguIni } from '@/lib/data/admin-konten';
import { getKategoriUsiaAktif } from '@/lib/data/kategori-usia';
import type { Paket } from '@/lib/game/tipe';
import Sampul from '@/components/Sampul';
import PaketForm from './PaketForm';
import s from '../../admin.module.css';

export default async function KelolaTema({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tema } = await supabase.from('tema').select('id,nama,sampul,status,is_minggu_ini').eq('id', id).single();
  const [{ data: paket }, kategoriUsia] = await Promise.all([
    supabase.from('paket_aset').select('id,mesin,judul,area_skill,usia_min,usia_max,kategori_usia_id,target_detik,butir').eq('tema_id', id).order('urutan'),
    getKategoriUsiaAktif(),
  ]);

  if (!tema) return <p>Tema tidak ditemukan. <Link href="/admin">kembali</Link></p>;

  // Kelompokkan game per kategori usia (game tanpa kategori → "Tanpa kategori")
  const daftar = (paket ?? []) as { id: string; judul: string; mesin: string; usia_min: number; usia_max: number; kategori_usia_id: string | null }[];
  const katMap = new Map(kategoriUsia.map((k) => [k.id, k]));
  const grup: { id: string; nama: string; items: typeof daftar }[] = [];
  for (const k of kategoriUsia) {
    const items = daftar.filter((p) => p.kategori_usia_id === k.id);
    if (items.length) grup.push({ id: k.id, nama: `${k.nama} (${k.usia_min}–${k.usia_max} th)`, items });
  }
  const tanpa = daftar.filter((p) => !p.kategori_usia_id || !katMap.has(p.kategori_usia_id));
  if (tanpa.length) grup.push({ id: '_tanpa', nama: 'Tanpa kategori', items: tanpa });

  async function aksiHapusPaket(fd: FormData) { 'use server'; await hapusPaket(String(fd.get('pid')), id); }
  async function aksiStatus(fd: FormData) { 'use server'; await setStatusTema(id, String(fd.get('status')) as 'draf' | 'disetujui'); }
  async function aksiMinggu() { 'use server'; await setMingguIni(id); }

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}>
        <h1><Sampul value={tema.sampul} size={28} /> {tema.nama}</h1>
        <div className={s.row}>
          <span className={`${s.tag} ${tema.status === 'disetujui' ? s.tagOk : s.tagDraf}`}>{tema.status}</span>
          {tema.is_minggu_ini && <span className={`${s.tag} ${s.tagNow}`}>Minggu Ini</span>}
        </div>
      </div>

      <div className={s.row}>
        <form action={aksiStatus}><input type="hidden" name="status" value={tema.status === 'disetujui' ? 'draf' : 'disetujui'} /><button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>{tema.status === 'disetujui' ? 'Jadikan Draf' : 'Setujui'}</button></form>
        {!tema.is_minggu_ini && <form action={aksiMinggu}><button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }}>Jadikan Minggu Ini</button></form>}
      </div>

      <div className={s.section}>Game ({daftar.length})</div>
      {grup.map((g) => (
        <div key={g.id}>
          <div className={s.muted} style={{ fontWeight: 700, margin: '10px 0 4px', color: g.id === '_tanpa' ? '#b3261e' : 'var(--lavender-d)' }}>👶 {g.nama} · {g.items.length}</div>
          {g.items.map((p) => (
            <div key={p.id} className={s.card}>
              <div className={s.row}>
                <span style={{ flex: 1 }}><b>{p.judul}</b> <span className={s.muted}>({p.mesin})</span></span>
                <form action={aksiHapusPaket}><input type="hidden" name="pid" value={p.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
              </div>
            </div>
          ))}
        </div>
      ))}
      {daftar.length === 0 && <p className={s.muted}>Belum ada game.</p>}
      <div className={s.muted} style={{ margin: '6px 0' }}>Tambah / edit game:</div>
      <PaketForm temaId={id} paketList={(paket ?? []) as unknown as Paket[]} kategoriOpsi={kategoriUsia} />

      <div className={s.section}>Video</div>
      <p className={s.muted}>Video dikelola per kategori usia di <Link href="/admin/video">Kelola Video</Link>.</p>

      <div className={s.section}>Kelas Bermain</div>
      <p className={s.muted}>Materi Kelas Bermain dikelola di menu <Link href="/admin/kelas-bermain">Kelas Bermain</Link>.</p>
    </div>
  );
}
