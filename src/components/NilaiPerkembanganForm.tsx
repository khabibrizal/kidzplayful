// src/components/NilaiPerkembanganForm.tsx — isi NILAI tumbuh kembang per anak (educator & admin)
// Parameter (area+indikator) fixed dari event; pengisi hanya memberi nilai + catatan.
'use client';
import { useState } from 'react';
import { simpanCatatan } from '@/lib/data/guru-actions';
import { SKALA_PAUD } from '@/lib/format';
import type { BarisParam, BarisNilai } from '@/lib/game/tipe';

export default function NilaiPerkembanganForm({ eventId, anakId, ortuId, nama, params, awal }: {
  eventId: string; anakId: string; ortuId: string; nama: string;
  params: BarisParam[];
  awal: { penilaian: BarisNilai[]; catatan: string | null };
}) {
  // peta nilai awal per "area|indikator"
  const kunci = (p: { area: string; indikator: string }) => `${p.area}||${p.indikator}`;
  const [nilai, setNilai] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const r of awal.penilaian ?? []) o[kunci(r)] = r.nilai;
    return o;
  });
  const [catatan, setCatatan] = useState(awal.catatan ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (!params || params.length === 0) {
    return <p style={{ color: 'var(--abu)', fontSize: 13 }}>Admin belum menetapkan parameter penilaian untuk event ini.</p>;
  }

  async function simpan() {
    setBusy(true); setMsg('');
    try {
      const penilaian: BarisNilai[] = params.map((p) => ({ area: p.area, indikator: p.indikator, nilai: nilai[kunci(p)] ?? '' }));
      await simpanCatatan({ eventId, anakId, ortuId, penilaian, catatan });
      setMsg('Tersimpan ✓');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusy(false); setTimeout(() => setMsg(''), 2500); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {params.map((p, i) => (
        <div key={i}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{p.area}{p.indikator ? ` — ${p.indikator}` : ''}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {SKALA_PAUD.map((sk) => {
              const on = nilai[kunci(p)] === sk.kode;
              return (
                <button key={sk.kode} type="button" title={sk.teks}
                  onClick={() => setNilai((n) => ({ ...n, [kunci(p)]: sk.kode }))}
                  style={{ border: 'none', cursor: 'pointer', borderRadius: 99, padding: '6px 12px', fontSize: 12, fontWeight: 700, background: on ? sk.bg : '#f1eef8', color: on ? sk.warna : 'var(--abu)', boxShadow: on ? `inset 0 0 0 2px ${sk.warna}` : 'none' }}>
                  {sk.kode}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <textarea className="kp-input" placeholder="Catatan untuk orang tua (opsional)" rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} style={{ resize: 'vertical' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="kp-btn" onClick={simpan} disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Menyimpan…' : '💾 Simpan Catatan'}</button>
        {msg && <span style={{ fontSize: 13, color: msg.includes('✓') ? '#1c7a43' : '#c0392b' }}>{msg}</span>}
      </div>
      <p style={{ fontSize: 11, color: 'var(--abu)', margin: 0 }}>BB=Belum · MB=Mulai · BSH=Sesuai Harapan · BSB=Sangat Baik · {nama}</p>
    </div>
  );
}
