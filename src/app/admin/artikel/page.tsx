// src/app/admin/artikel/page.tsx — kelola artikel (admin)
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getArtikelSemua } from '@/lib/data/artikel';
import { buatArtikel, hapusArtikel } from '@/lib/data/artikel-admin';
import s from '../admin.module.css';

export default async function AdminArtikelPage() {
  const list = await getArtikelSemua();

  async function aksiBuat(formData: FormData) {
    'use server';
    const id = await buatArtikel(String(formData.get('judul') ?? ''));
    redirect(`/admin/artikel/${id}`);
  }
  async function aksiHapus(formData: FormData) {
    'use server';
    await hapusArtikel(String(formData.get('id')));
  }

  return (
    <div>
      <div className={s.section}>Tulis Artikel Baru</div>
      <form action={aksiBuat} className={s.card}>
        <div className={s.row}>
          <input className={s.inp} name="judul" placeholder="Judul artikel (mis. Tips bermain anak 0–2 tahun)" style={{ flex: 1 }} required />
          <button className={s.btn} type="submit">+ Tulis</button>
        </div>
      </form>

      <div className={s.section}>Artikel ({list.length})</div>
      {list.map((a) => (
        <div key={a.id} className={s.card}>
          <div className={s.row}>
            <Link href={`/admin/artikel/${a.id}`} style={{ flex: 1, fontWeight: 700, color: 'var(--tinta)' }}>{a.judul}</Link>
            <span className={`${s.tag} ${a.status === 'terbit' ? s.tagOk : s.tagDraf}`}>{a.status}</span>
          </div>
          <div className={s.row} style={{ marginTop: 8 }}>
            <Link href={`/admin/artikel/${a.id}`} className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>Edit</Link>
            {a.status === 'terbit' && <Link href={`/artikel/${a.slug}`} target="_blank" className={s.btnSm} style={{ background: '#e6f7ee', color: '#2e9e63' }}>Lihat ↗</Link>}
            <form action={aksiHapus}><input type="hidden" name="id" value={a.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
      {list.length === 0 && <p className={s.muted}>Belum ada artikel.</p>}
    </div>
  );
}
