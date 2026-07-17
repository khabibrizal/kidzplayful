// src/components/RiwayatKonsultasi.tsx — riwayat konsultasi psikolog anak, group per tanggal (mode ortu)
import Link from 'next/link';
import { formatTanggal } from '@/lib/format';
import type { PendaftaranKonsultasi } from '@/lib/game/tipe';

const BADGE: Record<string, { teks: string; warna: string; bg: string }> = {
  menunggu: { teks: 'Menunggu persetujuan', warna: '#b88600', bg: '#fff3d6' },
  diterima: { teks: 'Diterima', warna: '#1c7a43', bg: '#dff5e6' },
  ditolak: { teks: 'Ditolak', warna: '#b3261e', bg: '#fde8e6' },
  selesai: { teks: 'Selesai', warna: '#3a78d6', bg: '#d6e6ff' },
  batal: { teks: 'Dibatalkan', warna: '#b3261e', bg: '#fde8e6' },
};

export default function RiwayatKonsultasi({ sesi }: { sesi: PendaftaranKonsultasi[] }) {
  if (sesi.length === 0) {
    return <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada konsultasi untuk anak ini. Mulai lewat menu Konsultasi.</p>;
  }
  // group per tanggal (terbaru dulu)
  const grup = new Map<string, PendaftaranKonsultasi[]>();
  for (const p of sesi) { const g = grup.get(p.tanggal); if (g) g.push(p); else grup.set(p.tanggal, [p]); }
  const perTanggal = [...grup.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <>
      {perTanggal.map(([tgl, list]) => (
        <details key={tgl} className="kp-card" style={{ padding: 12, marginBottom: 8 }} open={list.some((p) => p.status === 'menunggu' || p.status === 'diterima')}>
          <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700 }}>
            <span>🗓️ {formatTanggal(tgl)}</span>
            <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--abu)' }}>{list.length} konsultasi ▾</span>
          </summary>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((p) => {
              const b = BADGE[p.status] ?? BADGE.menunggu;
              const adaChat = p.status === 'diterima' || p.status === 'selesai';
              return (
                <div key={p.id} style={{ borderTop: '1px solid #f4f1fa', paddingTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13 }}>{p.jam ? `🕐 ${p.jam} WIB · ` : ''}{p.keluhan ? `“${p.keluhan}”` : 'Konsultasi psikolog'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: b.warna, background: b.bg, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>{b.teks}</span>
                  </div>
                  {adaChat && (
                    <div style={{ marginTop: 8 }}>
                      <Link href={`/konsultasi/${p.id}`} className="kp-btn" style={{ padding: '6px 14px', fontSize: 13 }}>{p.status === 'selesai' ? '📜 Riwayat chat' : '💬 Buka chat'}</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </>
  );
}
