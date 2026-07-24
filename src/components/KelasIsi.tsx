// src/components/KelasIsi.tsx — isi materi Kelas Bermain (dipakai konsisten di detail, Mode Anak, Mode Ortu).
// Presentational murni (aman di Server & Client Component). Judul kelas dirender oleh pemanggil.
import Link from 'next/link';
import type { KelasBermain } from '@/lib/game/tipe';
import BeliBtn from './BeliBtn';
import YoutubeEmbed from './YoutubeEmbed';
import { youtubeId } from '@/lib/youtube';
import ShareButton from '@/components/ShareButton';

const LABEL_FALLBACK: Record<string, string> = {
  'motorik-halus': '✋ Motorik Halus', 'motorik-kasar': '🏃 Motorik Kasar', kognitif: '🧠 Kognitif',
  bahasa: '🗣️ Bahasa', 'sosial-emosional': '💞 Sosial-Emosional', sensorik: '🖐️ Sensorik',
  kemandirian: '🌟 Kemandirian', kreativitas: '🎨 Kreativitas',
};

export default function KelasIsi({ kelas, labelArea = {}, bagikan = true, bagikanUrl }: {
  kelas: KelasBermain; labelArea?: Record<string, string>; bagikan?: boolean; bagikanUrl?: string;
}) {
  const LABEL = { ...LABEL_FALLBACK, ...labelArea };
  const adaInfo = !!(kelas.tujuan || (kelas.fokus_area?.length ?? 0) > 0 || kelas.peran_ortu || kelas.usia_min != null);

  return (
    <>
      {adaInfo && (
        <div className="kp-card" style={{ marginBottom: 12, background: '#f7f5fc' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>👶 Untuk usia {kelas.usia_min ?? 0}–{kelas.usia_max ?? 6} tahun</div>
          {kelas.tujuan && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🎯 TUJUAN</div>
              <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{kelas.tujuan}</p>
            </div>
          )}
          {(kelas.fokus_area?.length ?? 0) > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🧩 FOKUS AREA PERKEMBANGAN</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {kelas.fokus_area!.map((ar) => (
                  <span key={ar} style={{ fontSize: 12, fontWeight: 700, background: '#efe7fb', color: 'var(--lavender-d)', borderRadius: 99, padding: '4px 10px' }}>{LABEL[ar] ?? ar}</span>
                ))}
              </div>
            </div>
          )}
          {kelas.peran_ortu && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🤝 PERAN ORANG TUA</div>
              <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{kelas.peran_ortu}</p>
            </div>
          )}
        </div>
      )}

      {kelas.bahan?.length > 0 && (
        <div className="kp-card" style={{ marginBottom: 12, background: '#fff3d6' }}>
          <b>🧺 Bahan</b>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {kelas.bahan.map((b, i) => (
              <li key={i} style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1 }}>{b.nama}</span>
                {(b.produk_id || b.link) && <BeliBtn nama={b.nama} link={b.link} produkId={b.produk_id} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {kelas.aktivitas?.map((a, ai) => (
        <div key={ai} className="kp-card" style={{ marginBottom: 10 }}>
          <b>🎯 {a.judul || `Aktivitas ${ai + 1}`}</b>
          {a.cara_membuat && (
            <>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🛠️ CARA MEMBUAT</div>
              <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.cara_membuat}</p>
            </>
          )}
          {a.langkah?.length > 0 && (
            <>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🎲 CARA BERMAIN</div>
              <ol style={{ margin: '4px 0 0 18px', lineHeight: 1.7 }}>
                {a.langkah.map((l, i) => <li key={i}>{l}</li>)}
              </ol>
            </>
          )}
          {a.catatan_ortu && (
            <div style={{ marginTop: 10, background: '#fff3d6', borderRadius: 12, padding: '8px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#b88600' }}>💡 CATATAN UNTUK ORANG TUA</div>
              <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{a.catatan_ortu}</p>
            </div>
          )}
        </div>
      ))}

      {kelas.link_ide && youtubeId(kelas.link_ide) && (
        <div className="no-print"><YoutubeEmbed id={youtubeId(kelas.link_ide)!} title={kelas.judul} /></div>
      )}
      <div className="no-print" style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {kelas.link_ide && !youtubeId(kelas.link_ide) && <a className="kp-btn" style={{ display: 'inline-block' }} href={kelas.link_ide} target="_blank">Lihat ide ▶</a>}
        {kelas.worksheet_url && <a className="kp-btn putih" style={{ display: 'inline-block' }} href={kelas.worksheet_url} target="_blank">📄 Worksheet</a>}
        {bagikanUrl && <ShareButton url={bagikanUrl} title={kelas.judul} text={`Materi kelas bermain "${kelas.judul}" di KidzPlayful`} label="Bagikan" />}
        {bagikan && <Link className="kp-btn putih" style={{ display: 'inline-block' }} href={`/komunitas?topik=${encodeURIComponent(kelas.judul)}`}>💬 Bagikan pengalaman</Link>}
      </div>
    </>
  );
}
