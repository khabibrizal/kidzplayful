// src/components/CatatanCard.tsx — tampilan satu Catatan Perkembangan Bermain
import type { CatatanPerkembangan } from '@/lib/game/tipe';
import { ASPEK_PAUD, metaSkala } from '@/lib/format';

export default function CatatanCard({ c, judulEvent }: { c: CatatanPerkembangan; judulEvent?: string }) {
  return (
    <div className="kp-card" style={{ marginBottom: 10 }}>
      <b style={{ color: 'var(--lavender-d)' }}>📋 Catatan Perkembangan Bermain</b>
      {judulEvent && <div style={{ fontSize: 13, color: 'var(--abu)', marginTop: 2 }}>{judulEvent}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {ASPEK_PAUD.map((a) => {
          const m = metaSkala(c.aspek?.[a.key] ?? '');
          return (
            <div key={a.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span>{a.label}</span>
              {c.aspek?.[a.key]
                ? <span style={{ fontWeight: 700, color: m.warna, background: m.bg, borderRadius: 99, padding: '2px 10px', whiteSpace: 'nowrap' }}>{m.kode} · {m.teks}</span>
                : <span style={{ color: 'var(--abu)' }}>—</span>}
            </div>
          );
        })}
      </div>
      {c.catatan && <p style={{ marginTop: 8, fontSize: 13, whiteSpace: 'pre-wrap', background: '#faf7ff', borderRadius: 10, padding: '8px 10px' }}>“{c.catatan}”</p>}
      {c.dinilai_oleh && <div style={{ fontSize: 11, color: 'var(--abu)', marginTop: 6 }}>— {c.dinilai_oleh}</div>}
    </div>
  );
}
