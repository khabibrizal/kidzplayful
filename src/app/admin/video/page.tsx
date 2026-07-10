// src/app/admin/video/page.tsx
import { createClient } from '@/lib/supabase/server';
import { hapusVideo, setBolehTrialVideo } from '@/lib/data/admin-konten';
import VideoForm from './VideoForm';
import s from '../admin.module.css';

export default async function KelolaVideo() {
  const supabase = await createClient();
  const { data: video } = await supabase
    .from('video').select('id,judul,youtube_id,kategori,boleh_trial').order('kategori').order('urutan');

  async function aksiHapus(fd: FormData) { 'use server'; await hapusVideo(String(fd.get('id'))); }
  async function aksiTrial(fd: FormData) { 'use server'; await setBolehTrialVideo(String(fd.get('id')), fd.get('boleh') === '1'); }

  const grup = (k: string) => (video ?? []).filter((v) => v.kategori === k);

  return (
    <div>
      <div className={s.section}>Tambah Video</div>
      <VideoForm />

      {(['baby', 'toddler'] as const).map((k) => (
        <div key={k}>
          <div className={s.section}>{k === 'baby' ? 'Baby (0-2)' : 'Toddler (2+)'} ({grup(k).length})</div>
          {grup(k).map((v) => (
            <div key={v.id} className={s.card}>
              <div className={s.row}>
                <span style={{ flex: 1 }}><b>{v.judul}</b> <span className={s.muted}>{v.youtube_id}</span>{v.boleh_trial === false && <span className={`${s.tag} ${s.tagDraf}`} style={{ marginLeft: 6 }}>🔒 non-trial</span>}</span>
                <form action={aksiTrial}>
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="boleh" value={v.boleh_trial === false ? '1' : '0'} />
                  <button className={s.btnSm} style={{ background: v.boleh_trial === false ? '#eee' : '#dff5e6', color: v.boleh_trial === false ? '#888' : '#1c7a43' }} title="Boleh diakses user trial?">{v.boleh_trial === false ? 'Trial ✗' : 'Trial ✓'}</button>
                </form>
                <form action={aksiHapus}><input type="hidden" name="id" value={v.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
