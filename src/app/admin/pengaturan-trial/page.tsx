// src/app/admin/pengaturan-trial/page.tsx — atur akses trial: batas anak + pilih item per fitur
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPengaturanTrial } from '@/lib/data/pengaturan-trial';
import { simpanPengaturanTrial } from '@/lib/data/admin-bisnis';
import { getKelasSemua } from '@/lib/data/kelas-bermain';
import Sampul from '@/components/Sampul';
import { setBolehTrialKelas } from '@/lib/data/kelas-bermain-actions';
import { setBolehTrialTema, setBolehTrialVideo } from '@/lib/data/admin-konten';
import s from '../admin.module.css';

export default async function PengaturanTrialPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const supabase = await createClient();
  const [cfg, kelas, temaRes, videoRes] = await Promise.all([
    getPengaturanTrial(),
    getKelasSemua(),
    supabase.from('tema').select('id,nama,sampul,boleh_trial').order('created_at', { ascending: false }),
    supabase.from('video').select('id,judul,kategori,boleh_trial').order('kategori').order('urutan'),
  ]);
  const tema = temaRes.data ?? [];
  const video = videoRes.data ?? [];

  async function simpan(formData: FormData) { 'use server'; await simpanPengaturanTrial(formData); redirect('/admin/pengaturan-trial?ok=1'); }
  async function trKelas(formData: FormData) { 'use server'; await setBolehTrialKelas(String(formData.get('id')), formData.get('boleh') === '1'); }
  async function trTema(formData: FormData) { 'use server'; await setBolehTrialTema(String(formData.get('id')), formData.get('boleh') === '1'); }
  async function trVideo(formData: FormData) { 'use server'; await setBolehTrialVideo(String(formData.get('id')), formData.get('boleh') === '1'); }

  // tombol toggle: value 'boleh' = NILAI BARU saat diklik (kebalikan dari sekarang)
  const Tombol = ({ boleh }: { boleh: boolean }) => (
    <>
      <input type="hidden" name="boleh" value={boleh ? '0' : '1'} />
      <button className={s.btnSm} style={{ background: boleh ? '#dff5e6' : '#eee', color: boleh ? '#1c7a43' : '#888', whiteSpace: 'nowrap' }}>{boleh ? 'Trial ✓' : 'Trial ✗'}</button>
    </>
  );

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>⏳ Pengaturan Trial</h1></div>
      <p className={s.muted}>Atur akses untuk user <b>trial &amp; masa tenggang</b> (belum berlangganan). User berlangganan (aktif) selalu bebas. <b>Trial ✓</b> = boleh diakses trial; <b>Trial ✗</b> = terkunci (diminta upgrade). Perubahan berlaku langsung.</p>
      {ok && <div className={s.card} style={{ background: '#dff5e6', color: '#1c7a43', fontWeight: 700 }}>Tersimpan ✓</div>}

      {/* Setting global (batas anak + fitur komunitas) */}
      <form action={simpan} className={s.card}>
        <div className={s.section} style={{ marginTop: 0 }}>Fitur global untuk user trial</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 14 }}>
          <input type="checkbox" name="trial_komunitas" value="1" defaultChecked={cfg.trial_komunitas} style={{ width: 18, height: 18 }} />
          <span>💬 Boleh akses <b>Komunitas</b> saat trial</span>
        </label>
        <p className={s.muted} style={{ fontSize: 12, marginTop: 2 }}>Kosongkan = Komunitas terkunci untuk user trial (diminta upgrade).</p>

        <div className={s.section}>Batas jumlah anak untuk user trial</div>
        <input className={s.inp} name="trial_maks_anak" type="number" min={0} defaultValue={cfg.trial_maks_anak} style={{ width: 140 }} />
        <p className={s.muted} style={{ fontSize: 12, marginTop: 6 }}>Maks profil anak yang boleh ditambah user belum berlangganan (0 = tidak boleh menambah).</p>
        <div style={{ marginTop: 12 }}><button className={s.btn} type="submit">💾 Simpan</button></div>
      </form>

      {/* Materi Ide Bermain */}
      <details className={s.card} open>
        <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--lavender-d)' }}>🎈 Materi Ide Bermain ({kelas.length})</summary>
        {kelas.length === 0 && <p className={s.muted} style={{ marginTop: 8 }}>Belum ada ide bermain.</p>}
        {kelas.map((k) => (
          <div key={k.id} className={s.row} style={{ padding: '7px 0', borderBottom: '1px solid #f0f0f5', alignItems: 'center' }}>
            <span style={{ flex: 1, fontSize: 14 }}>{k.judul}{k.status === 'nonaktif' && <span className={s.muted} style={{ fontSize: 11 }}> (nonaktif)</span>}</span>
            <form action={trKelas}><input type="hidden" name="id" value={k.id} /><Tombol boleh={k.boleh_trial !== false} /></form>
          </div>
        ))}
      </details>

      {/* Game Edukasi (per tema) */}
      <details className={s.card}>
        <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--lavender-d)' }}>🎮 Game Edukasi — per Tema ({tema.length})</summary>
        {tema.length === 0 && <p className={s.muted} style={{ marginTop: 8 }}>Belum ada tema.</p>}
        {tema.map((t) => (
          <div key={t.id} className={s.row} style={{ padding: '7px 0', borderBottom: '1px solid #f0f0f5', alignItems: 'center' }}>
            <span style={{ flex: 1, fontSize: 14 }}><Sampul value={t.sampul} size={18} /> {t.nama}</span>
            <form action={trTema}><input type="hidden" name="id" value={t.id} /><Tombol boleh={t.boleh_trial !== false} /></form>
          </div>
        ))}
      </details>

      {/* Pojok Video */}
      <details className={s.card}>
        <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--lavender-d)' }}>📺 Pojok Video ({video.length})</summary>
        {video.length === 0 && <p className={s.muted} style={{ marginTop: 8 }}>Belum ada video.</p>}
        {video.map((v) => (
          <div key={v.id} className={s.row} style={{ padding: '7px 0', borderBottom: '1px solid #f0f0f5', alignItems: 'center' }}>
            <span style={{ flex: 1, fontSize: 14 }}>{v.judul} <span className={s.muted} style={{ fontSize: 11 }}>({v.kategori})</span></span>
            <form action={trVideo}><input type="hidden" name="id" value={v.id} /><Tombol boleh={v.boleh_trial !== false} /></form>
          </div>
        ))}
      </details>

      <p className={s.muted} style={{ fontSize: 12 }}>Item bertanda <b>Trial ✗</b> hanya bisa dibuka pelanggan; user trial diarahkan untuk upgrade. Default: semua boleh.</p>
    </div>
  );
}
