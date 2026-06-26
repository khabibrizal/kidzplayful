// src/app/ortu/[anakId]/page.tsx
import Link from 'next/link';
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
        <h1>👶 Mode Orang Tua</h1>
        <small>Untuk {anak.nama} · aktivitas main bersama (0-2 thn)</small>
      </div>

      {adaPanduan.length === 0 && <p className={s.muted}>Belum ada panduan aktivitas. Admin dapat menambah di Kelola Tema.</p>}

      {adaPanduan.map(({ tema, panduan }) => (
        <div key={tema.id} className={s.card}>
          <b>{tema.sampul ?? '🎈'} {tema.nama}{tema.is_minggu_ini ? ' · Minggu Ini' : ''}</b>
          {panduan?.bahan && <div className={s.bahan} style={{ marginTop: 8 }}>🧺 {panduan.bahan}</div>}
          {(panduan?.langkah ?? []).map((l, i) => (
            <div key={i} className={s.step}><span className={s.n}>{i + 1}</span><span style={{ fontSize: 14 }}>{l}</span></div>
          ))}
          {panduan?.worksheet_url && <a className={s.dl} href={panduan.worksheet_url} target="_blank">📄 Unduh Worksheet</a>}
        </div>
      ))}

      <div className={s.sec}>Video untuk Baby</div>
      {videoBaby.length === 0 && <p className={s.muted}>Belum ada video baby (tambah di Admin → Kelola Video).</p>}
      {videoBaby.map((v) => (
        <div key={v.id} className={s.card}>
          <div className={s.vid}><span style={{ fontSize: 24 }}>▶</span><span style={{ flex: 1 }}><b>{v.judul}</b><br /><span className={s.muted}>{Math.round(v.durasi_detik / 60)} menit</span></span>
            <a className={s.dl} href={`https://www.youtube-nocookie.com/embed/${v.youtube_id}`} target="_blank">Putar</a>
          </div>
        </div>
      ))}
    </div>
  );
}
