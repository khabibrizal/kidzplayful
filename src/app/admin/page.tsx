// src/app/admin/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { buatTema, setMingguIni, hapusTema } from '@/lib/data/admin-konten';
import s from './admin.module.css';

export default async function AdminHome() {
  const supabase = await createClient();
  const { data: tema } = await supabase
    .from('tema').select('id,nama,sampul,status,is_minggu_ini').order('created_at', { ascending: false });

  async function aksiBuat(formData: FormData) {
    'use server';
    await buatTema(String(formData.get('nama') ?? ''), String(formData.get('sampul') ?? ''));
  }
  async function aksiMinggu(formData: FormData) {
    'use server';
    await setMingguIni(String(formData.get('id')));
  }
  async function aksiHapus(formData: FormData) {
    'use server';
    await hapusTema(String(formData.get('id')));
  }

  return (
    <div>
      <p style={{ marginBottom: 12 }}><Link href="/admin/video" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>📺 Kelola Video</Link></p>
      <div className={s.section}>Tambah Tema</div>
      <form action={aksiBuat} className={s.card}>
        <div className={s.row}>
          <input className={s.inp} name="sampul" placeholder="🎈" maxLength={4} style={{ width: 70, textAlign: 'center' }} />
          <input className={s.inp} name="nama" placeholder="Nama tema (mis. Kendaraan)" style={{ flex: 1 }} required />
          <button className={s.btn} type="submit">+ Buat</button>
        </div>
      </form>

      <div className={s.section}>Tema ({tema?.length ?? 0})</div>
      {(tema ?? []).map((t) => (
        <div key={t.id} className={s.card}>
          <div className={s.row}>
            <span style={{ fontSize: 26 }}>{t.sampul}</span>
            <Link href={`/admin/tema/${t.id}`} style={{ flex: 1, fontWeight: 700, color: 'var(--tinta)' }}>{t.nama}</Link>
            <span className={`${s.tag} ${t.status === 'disetujui' ? s.tagOk : s.tagDraf}`}>{t.status}</span>
            {t.is_minggu_ini && <span className={`${s.tag} ${s.tagNow}`}>Minggu Ini</span>}
          </div>
          <div className={s.row} style={{ marginTop: 8 }}>
            <Link href={`/admin/tema/${t.id}`} className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>Kelola</Link>
            {!t.is_minggu_ini && (
              <form action={aksiMinggu}><input type="hidden" name="id" value={t.id} /><button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }}>Jadikan Minggu Ini</button></form>
            )}
            <form action={aksiHapus}><input type="hidden" name="id" value={t.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
    </div>
  );
}
