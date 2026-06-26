// src/app/ortu/[anakId]/page.tsx
import Link from 'next/link';
import Pewi from '@/components/ui/Pewi';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getModeOrtu } from '@/lib/data/panduan';
import { getVideoByKategori } from '@/lib/data/video';
import s from './ortu.module.css';

export default async function ModeOrtu({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const anak = await getAnakTerjamin(anakId);
  const list = await getModeOrtu();
  const videoBaby = await getVideoByKategori('baby');
  const adaPanduan = list.filter((t) => t.panduan);

  return (
    <div className={s.wrap}>
      <Link href="/pilih-anak" className={s.back}>← ganti anak</Link>
      <div className={s.hd}>
        <Pewi size={72} />
        <div className={s.hdText}>
          <h1>👶 Mode Orang Tua</h1>
          <small>Untuk {anak.nama} · aktivitas main bersama (0-2 thn)</small>
        </div>
      </div>

      {adaPanduan.length === 0 && <p className={s.muted}>Belum ada panduan aktivitas. Admin dapat menambah di Kelola Tema.</p>}

      {adaPanduan.map(({ tema, panduan }) => (
        <div key={tema.id} className="kp-card" style={{ marginBottom: 12 }}>
          <b>{tema.sampul ?? '🎈'} {tema.nama}{tema.is_minggu_ini ? ' · Minggu Ini' : ''}</b>
          {panduan?.materi && <p style={{ marginTop: 8, fontSize: 14, whiteSpace: 'pre-wrap' }}>🎯 {panduan.materi}</p>}
          {panduan?.bahan && <div className={s.bahan} style={{ marginTop: 8 }}>🧺 {panduan.bahan}</div>}
          {(panduan?.langkah ?? []).map((l, i) => (
            <div key={i} className={s.step}><span className={s.n}>{i + 1}</span><span style={{ fontSize: 14 }}>{l}</span></div>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {panduan?.link_ide && <a className="kp-btn" href={panduan.link_ide} target="_blank" style={{ marginTop: 10, fontSize: 14, padding: '11px 20px' }}>▶ Lihat ide</a>}
            {panduan?.worksheet_url && <a className="kp-btn mint" href={panduan.worksheet_url} target="_blank" style={{ marginTop: 10, fontSize: 14, padding: '11px 20px' }}>📄 Unduh Worksheet</a>}
          </div>
        </div>
      ))}

      <div className={s.sec}>Video untuk Baby</div>
      {videoBaby.length === 0 && <p className={s.muted}>Belum ada video baby (tambah di Admin → Kelola Video).</p>}
      {videoBaby.map((v) => (
        <div key={v.id} className="kp-card" style={{ marginBottom: 12 }}>
          <div className={s.vid}><span style={{ fontSize: 24 }}>▶</span><span style={{ flex: 1 }}><b>{v.judul}</b><br /><span className={s.muted}>{Math.round(v.durasi_detik / 60)} menit</span></span>
            <a className="kp-btn" href={`https://www.youtube-nocookie.com/embed/${v.youtube_id}`} target="_blank" style={{ fontSize: 14, padding: '11px 20px' }}>Putar</a>
          </div>
        </div>
      ))}
    </div>
  );
}
