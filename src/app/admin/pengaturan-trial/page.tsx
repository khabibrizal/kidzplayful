// src/app/admin/pengaturan-trial/page.tsx — atur izin akses fitur untuk user trial/tenggang
import { redirect } from 'next/navigation';
import { getPengaturanTrial } from '@/lib/data/pengaturan-trial';
import { simpanPengaturanTrial } from '@/lib/data/admin-bisnis';
import s from '../admin.module.css';

export default async function PengaturanTrialPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const cfg = await getPengaturanTrial();

  async function simpan(formData: FormData) {
    'use server';
    await simpanPengaturanTrial(formData);
    redirect('/admin/pengaturan-trial?ok=1');
  }

  const Toggle = ({ name, label, on }: { name: string; label: string; on: boolean }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f0f0f5', fontSize: 14 }}>
      <input type="checkbox" name={name} value="1" defaultChecked={on} style={{ width: 18, height: 18 }} />
      <span>{label}</span>
    </label>
  );

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>⏳ Pengaturan Trial</h1></div>
      <p className={s.muted}>Atur fitur apa saja yang boleh diakses user <b>trial &amp; masa tenggang</b> (belum berlangganan). User berlangganan (aktif) selalu bebas. Perubahan berlaku langsung tanpa deploy.</p>
      {ok && <div className={s.card} style={{ background: '#dff5e6', color: '#1c7a43', fontWeight: 700 }}>Tersimpan ✓</div>}

      <form action={simpan} className={s.card}>
        <div className={s.section} style={{ marginTop: 0 }}>Fitur yang boleh diakses saat trial</div>
        <Toggle name="trial_kelas" label="🎈 Materi Kelas Bermain" on={cfg.trial_kelas} />
        <Toggle name="trial_game" label="🎮 Game Edukasi" on={cfg.trial_game} />
        <Toggle name="trial_video" label="📺 Pojok Video" on={cfg.trial_video} />
        <p className={s.muted} style={{ fontSize: 12, marginTop: 6 }}>Centang = boleh diakses trial. Kosongkan = terkunci (user diminta upgrade).</p>

        <div className={s.section}>Batas jumlah anak untuk user trial</div>
        <input className={s.inp} name="trial_maks_anak" type="number" min={0} defaultValue={cfg.trial_maks_anak} style={{ width: 140 }} />
        <p className={s.muted} style={{ fontSize: 12, marginTop: 6 }}>Maksimal profil anak yang boleh ditambah user belum berlangganan (0 = tidak boleh menambah).</p>

        <div style={{ marginTop: 14 }}><button className={s.btn} type="submit">💾 Simpan</button></div>
      </form>
    </div>
  );
}
