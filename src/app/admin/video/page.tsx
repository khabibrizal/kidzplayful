// src/app/admin/video/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { hapusVideo } from '@/lib/data/admin-konten';
import VideoForm from './VideoForm';
import s from '../admin.module.css';

export default async function KelolaVideo() {
  const supabase = await createClient();
  const { data: video } = await supabase
    .from('video').select('id,judul,youtube_id,kategori').order('kategori').order('urutan');

  async function aksiHapus(fd: FormData) { 'use server'; await hapusVideo(String(fd.get('id'))); }

  const grup = (k: string) => (video ?? []).filter((v) => v.kategori === k);

  return (
    <div>
      <Link href="/admin" className={s.muted}>&larr; dashboard</Link>
      <div className={s.section}>Tambah Video</div>
      <VideoForm />

      {(['baby', 'toddler'] as const).map((k) => (
        <div key={k}>
          <div className={s.section}>{k === 'baby' ? 'Baby (0-2)' : 'Toddler (2+)'} ({grup(k).length})</div>
          {grup(k).map((v) => (
            <div key={v.id} className={s.card}>
              <div className={s.row}>
                <span style={{ flex: 1 }}><b>{v.judul}</b> <span className={s.muted}>{v.youtube_id}</span></span>
                <form action={aksiHapus}><input type="hidden" name="id" value={v.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
