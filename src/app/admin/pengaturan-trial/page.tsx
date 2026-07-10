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

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>⏳ Pengaturan Trial</h1></div>
      <p className={s.muted}>Pengaturan untuk user <b>trial &amp; masa tenggang</b> (belum berlangganan). User berlangganan (aktif) selalu bebas.</p>
      {ok && <div className={s.card} style={{ background: '#dff5e6', color: '#1c7a43', fontWeight: 700 }}>Tersimpan ✓</div>}

      <div className={s.card} style={{ background: '#f6f2ff' }}>
        <b style={{ color: 'var(--lavender-d)' }}>🔑 Materi mana yang boleh diakses trial?</b>
        <p className={s.muted} style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>
          Diatur <b>per item</b> lewat tombol <b>&quot;Trial ✓/✗&quot;</b> di masing-masing halaman:
          <br />• <b>Materi Kelas Bermain</b> → menu 🎈 Kelas Bermain
          <br />• <b>Game Edukasi</b> → menu 🎨 Tema (Dashboard) — per tema
          <br />• <b>Pojok Video</b> → menu 📺 Video
          <br />Item bertanda <b>Trial ✓</b> bisa dibuka user trial; yang <b>✗</b> terkunci (diminta upgrade). Default: semua boleh.
        </p>
      </div>

      <form action={simpan} className={s.card}>
        <div className={s.section} style={{ marginTop: 0 }}>Batas jumlah anak untuk user trial</div>
        <input className={s.inp} name="trial_maks_anak" type="number" min={0} defaultValue={cfg.trial_maks_anak} style={{ width: 140 }} />
        <p className={s.muted} style={{ fontSize: 12, marginTop: 6 }}>Maksimal profil anak yang boleh ditambah user belum berlangganan (0 = tidak boleh menambah).</p>
        <div style={{ marginTop: 14 }}><button className={s.btn} type="submit">💾 Simpan</button></div>
      </form>
    </div>
  );
}
