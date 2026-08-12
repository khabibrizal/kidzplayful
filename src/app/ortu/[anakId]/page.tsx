// src/app/ortu/[anakId]/page.tsx
import Link from 'next/link';
import Pewi from '@/components/ui/Pewi';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getKelasAktifCached } from '@/lib/data/publik';
import { getVideoByKategori } from '@/lib/data/video';
import { getStatusSaya, dibatasiTrial } from '@/lib/data/langganan-status';
import { getLabelFokusArea } from '@/lib/data/fokus-area';
import KelasIsi from '@/components/KelasIsi';
import Terkunci from '@/components/Terkunci';
import s from './ortu.module.css';
import TombolKembali from '@/components/TombolKembali';

export default async function ModeOrtu({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const anak = await getAnakTerjamin(anakId);
  const [kelasList0, videoBaby0, status, labelArea] = await Promise.all([
    getKelasAktifCached(), getVideoByKategori('baby'), getStatusSaya(), getLabelFokusArea(),
  ]);
  // trial: item tetap TAMPIL tapi yang tak ditandai "boleh trial" akan terkunci (🔒)
  const batasi = dibatasiTrial(status);
  const kelasList = kelasList0;
  const videoBaby = videoBaby0;
  const terkunci = (b?: boolean) => batasi && b === false;

  return (
    <div className={s.wrap}>
      <TombolKembali fallback="/pilih-anak" className={s.back} />
      <div className={s.hd}>
        <Pewi size={72} />
        <div className={s.hdText}>
          <h1>👶 Mode Orang Tua</h1>
          <small>Untuk {anak.nama} · aktivitas main bersama (0-2 thn)</small>
        </div>
      </div>

      {kelasList.length === 0 && <p className={s.muted}>Belum ada ide bermain aktif. Admin dapat menambah di Kelola Ide Bermain.</p>}

      {kelasList.map((k) => (
        terkunci(k.boleh_trial) ? (
          <div key={k.id} className="kp-card" style={{ marginBottom: 12, opacity: 0.85 }}>
            <b>🔒 {k.judul}</b>
            <div style={{ marginTop: 6 }}><Terkunci fitur="Materi Ide Bermain" ringkas /></div>
          </div>
        ) : (
        <div key={k.id} className="kp-card" style={{ marginBottom: 12 }}>
          <b>🎈 {k.judul}</b>
          <KelasIsi kelas={k} labelArea={labelArea} bagikanUrl={`/coba/kelas/${k.id}`} />
        </div>
        )
      ))}

      <div className={s.sec}>Video untuk Baby</div>
      {videoBaby.length === 0 && <p className={s.muted}>Belum ada video baby (tambah di Admin → Kelola Video).</p>}
      {videoBaby.map((v) => (
        <div key={v.id} className="kp-card" style={{ marginBottom: 12, opacity: terkunci(v.boleh_trial) ? 0.85 : 1 }}>
          <div className={s.vid}><span style={{ fontSize: 24 }}>{terkunci(v.boleh_trial) ? '🔒' : '▶'}</span><span style={{ flex: 1 }}><b>{v.judul}</b><br /><span className={s.muted}>{terkunci(v.boleh_trial) ? 'khusus pelanggan' : `${Math.round(v.durasi_detik / 60)} menit`}</span></span>
            {terkunci(v.boleh_trial)
              ? <Link className="kp-btn mint" href="/pengaturan" style={{ fontSize: 14, padding: '11px 20px' }}>✨ Upgrade</Link>
              : <a className="kp-btn" href={`https://www.youtube-nocookie.com/embed/${v.youtube_id}`} target="_blank" style={{ fontSize: 14, padding: '11px 20px' }}>Putar</a>}
          </div>
        </div>
      ))}
    </div>
  );
}
