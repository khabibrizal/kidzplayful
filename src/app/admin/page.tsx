// src/app/admin/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { setMingguIni, hapusTema, setBolehTrialTema } from '@/lib/data/admin-konten';
import Sampul from '@/components/Sampul';
import TambahTemaForm from './TambahTemaForm';
import s from './admin.module.css';

export default async function AdminHome() {
  const supabase = await createClient();
  const { data: tema } = await supabase
    .from('tema').select('id,nama,sampul,status,is_minggu_ini,boleh_trial').order('created_at', { ascending: false });

  async function aksiMinggu(formData: FormData) {
    'use server';
    await setMingguIni(String(formData.get('id')));
  }
  async function aksiHapus(formData: FormData) {
    'use server';
    await hapusTema(String(formData.get('id')));
  }
  async function aksiTrial(formData: FormData) {
    'use server';
    await setBolehTrialTema(String(formData.get('id')), formData.get('boleh') === '1');
  }

  return (
    <div>
      {/* Catatan Tema (0099) — rute di LUAR /admin (matriks Akses Menu tak punya dimensi
          psikolog), jadi ditautkan dari sini alih-alih didaftarkan sebagai menu admin. */}
      <Link href="/catatan-tema" className={s.card} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <b>🍎 Catatan Tema</b>
        <br /><small className={s.muted}>Catatan perkembangan anak pada tema kurikulum — bisa diisi admin, guru, &amp; psikolog.</small>
      </Link>

      <div className={s.section}>Tambah Tema</div>
      <TambahTemaForm />

      <div className={s.section}>Tema ({tema?.length ?? 0})</div>
      {(tema ?? []).map((t) => (
        <div key={t.id} className={s.card}>
          <div className={s.row}>
            <Sampul value={t.sampul} size={26} />
            <Link href={`/admin/tema/${t.id}`} style={{ flex: 1, fontWeight: 700, color: 'var(--tinta)' }}>{t.nama}</Link>
            <span className={`${s.tag} ${t.status === 'disetujui' ? s.tagOk : s.tagDraf}`}>{t.status}</span>
            {t.is_minggu_ini && <span className={`${s.tag} ${s.tagNow}`}>Minggu Ini</span>}
            {t.boleh_trial === false && <span className={`${s.tag} ${s.tagDraf}`}>🔒 non-trial</span>}
          </div>
          <div className={s.row} style={{ marginTop: 8 }}>
            <Link href={`/admin/tema/${t.id}`} className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>Kelola</Link>
            {!t.is_minggu_ini && (
              <form action={aksiMinggu}><input type="hidden" name="id" value={t.id} /><button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }}>Jadikan Minggu Ini</button></form>
            )}
            <form action={aksiTrial}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="boleh" value={t.boleh_trial === false ? '1' : '0'} />
              <button className={s.btnSm} style={{ background: t.boleh_trial === false ? '#eee' : '#dff5e6', color: t.boleh_trial === false ? '#888' : '#1c7a43' }} title="Boleh diakses user trial?">{t.boleh_trial === false ? 'Trial ✗' : 'Trial ✓'}</button>
            </form>
            <form action={aksiHapus}><input type="hidden" name="id" value={t.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
    </div>
  );
}
