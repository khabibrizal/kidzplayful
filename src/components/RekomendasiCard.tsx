// src/components/RekomendasiCard.tsx — satu rekomendasi psikolog ("resep") — pola CatatanCard
import type { RekomendasiPsikolog } from '@/lib/game/tipe';
import { formatTanggal } from '@/lib/format';

export default function RekomendasiCard({ r }: { r: RekomendasiPsikolog }) {
  const tgl = r.created_at ? r.created_at.slice(0, 10) : null;
  return (
    <div className="kp-card" style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 800, color: 'var(--lavender-d)', fontSize: 15 }}>🧠 {r.judul?.trim() || 'Rekomendasi Psikolog'}</div>
      <div style={{ fontSize: 12, color: 'var(--abu)', marginTop: 2 }}>Rekomendasi untuk perkembangan si kecil</div>

      {r.isi && <p style={{ marginTop: 8, fontSize: 13.5, whiteSpace: 'pre-wrap', background: '#faf7ff', borderRadius: 10, padding: '8px 10px' }}>{r.isi}</p>}

      {r.butir && r.butir.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {r.butir.map((b, i) => (
            <div key={i} style={{ borderLeft: '3px solid #c9b6f0', paddingLeft: 10 }}>
              {b.judul && <div style={{ fontSize: 13, fontWeight: 700 }}>{b.judul}</div>}
              {b.isi && <div style={{ fontSize: 13, color: 'var(--tinta)', whiteSpace: 'pre-wrap' }}>{b.isi}</div>}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--abu)', marginTop: 8 }}>
        {r.dinilai_oleh ? `— ${r.dinilai_oleh}` : ''}{tgl ? `${r.dinilai_oleh ? ' · ' : ''}${formatTanggal(tgl)}` : ''}
      </div>
    </div>
  );
}
