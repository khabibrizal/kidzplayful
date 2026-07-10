// src/app/ortu/[anakId]/page.tsx
import Link from 'next/link';
import Pewi from '@/components/ui/Pewi';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getKelasAktifCached } from '@/lib/data/publik';
import { getVideoByKategori } from '@/lib/data/video';
import { getStatusSaya, dibatasiTrial } from '@/lib/data/langganan-status';
import { getPengaturanTrial } from '@/lib/data/pengaturan-trial';
import BeliBtn from '@/components/BeliBtn';
import YoutubeEmbed from '@/components/YoutubeEmbed';
import Terkunci from '@/components/Terkunci';
import { youtubeId } from '@/lib/youtube';
import s from './ortu.module.css';

export default async function ModeOrtu({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const anak = await getAnakTerjamin(anakId);
  const [kelasList0, videoBaby0, status, cfg] = await Promise.all([
    getKelasAktifCached(), getVideoByKategori('baby'), getStatusSaya(), getPengaturanTrial(),
  ]);
  const batasi = dibatasiTrial(status);
  const bolehKelas = !batasi || cfg.trial_kelas;
  const bolehVideo = !batasi || cfg.trial_video;
  const kelasList = bolehKelas ? kelasList0 : [];
  const videoBaby = bolehVideo ? videoBaby0 : [];

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

      {!bolehKelas && <Terkunci fitur="Materi Kelas Bermain" ringkas />}
      {bolehKelas && kelasList.length === 0 && <p className={s.muted}>Belum ada kelas bermain aktif. Admin dapat menambah di Kelola Kelas Bermain.</p>}

      {kelasList.map((k) => (
        <div key={k.id} className="kp-card" style={{ marginBottom: 12 }}>
          <b>🎈 {k.judul}</b>
          {k.bahan?.length > 0 && (
            <div className={s.bahan} style={{ marginTop: 8 }}>
              <div>🧺 Bahan:</div>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {k.bahan.map((b, i) => (
                  <li key={i} style={{ margin: '5px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1 }}>{b.nama}</span>
                    {(b.produk_id || b.link) && <BeliBtn nama={b.nama} link={b.link} produkId={b.produk_id} />}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {k.aktivitas?.map((a, ai) => (
            <div key={ai} style={{ marginTop: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'pre-wrap' }}>🎯 {a.judul || `Aktivitas ${ai + 1}`}</p>
              {a.cara_membuat && <p style={{ marginTop: 4, fontSize: 14, whiteSpace: 'pre-wrap' }}>🛠️ {a.cara_membuat}</p>}
              {a.langkah?.map((l, i) => (
                <div key={i} className={s.step}><span className={s.n}>{i + 1}</span><span style={{ fontSize: 14 }}>{l}</span></div>
              ))}
            </div>
          ))}
          {k.link_ide && youtubeId(k.link_ide) && <YoutubeEmbed id={youtubeId(k.link_ide)!} title={k.judul} />}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {k.link_ide && !youtubeId(k.link_ide) && <a className="kp-btn" href={k.link_ide} target="_blank" style={{ marginTop: 10, fontSize: 14, padding: '11px 20px' }}>▶ Lihat ide</a>}
            {k.worksheet_url && <a className="kp-btn mint" href={k.worksheet_url} target="_blank" style={{ marginTop: 10, fontSize: 14, padding: '11px 20px' }}>📄 Unduh Worksheet</a>}
          </div>
        </div>
      ))}

      <div className={s.sec}>Video untuk Baby</div>
      {!bolehVideo && <Terkunci fitur="Pojok Video" ringkas />}
      {bolehVideo && videoBaby.length === 0 && <p className={s.muted}>Belum ada video baby (tambah di Admin → Kelola Video).</p>}
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
