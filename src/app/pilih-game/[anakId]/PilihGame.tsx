// src/app/pilih-game/[anakId]/PilihGame.tsx
'use client';
import { useRouter } from 'next/navigation';
import type { TemaLengkap } from '@/lib/game/tipe';
import { cocokUsia } from '@/lib/domain/usia';

export default function PilihGame({
  anakId, nama, umur, pustaka,
}: { anakId: string; nama: string; umur: number; pustaka: TemaLengkap[] }) {
  const router = useRouter();
  const cocok = pustaka.flatMap((t) =>
    t.paket.filter((p) => cocokUsia(umur, p.usia_min, p.usia_max)).map((p) => ({ p, t })),
  );

  return (
    <main style={{ maxWidth: 440, margin: '20px auto', padding: 16 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22 }}>🎯 Pilih untuk {nama}</h1>
      <p style={{ color: 'var(--abu)', marginBottom: 14 }}>🧒 {umur} tahun · disaring otomatis dari usia</p>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '8px 0' }}>COCOK UNTUK {nama.toUpperCase()}</div>
      {cocok.map(({ p, t }) => (
        <button key={p.id} className="kp-card" onClick={() => router.push(`/main/${anakId}?paket=${p.id}`)}
          style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
          <span style={{ fontSize: 26 }}>{t.tema.sampul ?? '🎈'}</span>
          <span style={{ flex: 1 }}><b>{p.judul}</b><br /><small style={{ color: 'var(--abu)' }}>{t.tema.nama} · {p.usia_min}-{p.usia_max} thn ✓</small></span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--mint-d)', padding: '6px 12px', borderRadius: 99 }}>main ▶</span>
        </button>
      ))}
      {cocok.length === 0 && <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada game yang cocok untuk usia ini.</p>}

      <button className="kp-btn" style={{ width: '100%', marginTop: 14 }} onClick={() => router.push(`/main/${anakId}`)}>
        ▶ Masuk Mode Anak
      </button>
      <p style={{ textAlign: 'center', marginTop: 10 }}>
        <a href="/pilih-anak" style={{ color: 'var(--biru-d)', fontSize: 13 }}>← kembali</a>
      </p>
    </main>
  );
}
