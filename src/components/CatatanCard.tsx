// src/components/CatatanCard.tsx — tampilan satu Catatan Perkembangan Bermain (tabel Area|Indikator|Nilai)
import type { CatatanPerkembangan } from '@/lib/game/tipe';
import { ASPEK_PAUD, metaSkala } from '@/lib/format';

function Pill({ kode }: { kode: string }) {
  const m = metaSkala(kode);
  if (!kode) return <span style={{ color: 'var(--abu)' }}>—</span>;
  return <span style={{ fontWeight: 700, color: m.warna, background: m.bg, borderRadius: 99, padding: '2px 10px', whiteSpace: 'nowrap', fontSize: 12 }}>{m.kode}</span>;
}

export default function CatatanCard({ c, judulEvent }: { c: CatatanPerkembangan; judulEvent?: string }) {
  // sumber baris: penilaian (baru) atau fallback aspek (data lama)
  const baris = (c.penilaian && c.penilaian.length > 0)
    ? c.penilaian.map((r) => ({ area: r.area, indikator: r.indikator, nilai: r.nilai }))
    : ASPEK_PAUD.filter((a) => c.aspek?.[a.key]).map((a) => ({ area: a.label, indikator: '', nilai: c.aspek[a.key] }));

  return (
    <div className="kp-card" style={{ marginBottom: 10 }}>
      <b style={{ color: 'var(--lavender-d)' }}>📋 Catatan Perkembangan Bermain</b>
      {judulEvent && <div style={{ fontSize: 13, color: 'var(--abu)', marginTop: 2 }}>{judulEvent}</div>}

      {baris.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--abu)', marginTop: 8 }}>Belum ada penilaian.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--abu)' }}>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>Area Perkembangan</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>Indikator</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>Nilai</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f4f1fa' }}>
                  <td style={{ padding: '6px 8px' }}>{r.area || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{r.indikator || '—'}</td>
                  <td style={{ padding: '6px 8px' }}><Pill kode={r.nilai} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {c.catatan && <p style={{ marginTop: 8, fontSize: 13, whiteSpace: 'pre-wrap', background: '#faf7ff', borderRadius: 10, padding: '8px 10px' }}>“{c.catatan}”</p>}
      <div style={{ fontSize: 11, color: 'var(--abu)', marginTop: 6 }}>
        {c.dinilai_oleh ? `— ${c.dinilai_oleh}` : ''}
        <span style={{ marginLeft: c.dinilai_oleh ? 8 : 0 }}>BB=Belum · MB=Mulai · BSH=Sesuai Harapan · BSB=Sangat Baik</span>
      </div>
    </div>
  );
}
