// src/app/catatan-tema/FormCatatanTema.tsx — tulis catatan perkembangan satu tema.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { simpanCatatanTema } from '@/lib/data/catatan-tema-actions';
import type { NilaiTema } from '@/lib/data/catatan-tema';
import { SKALA_PAUD } from '@/lib/format';

export default function FormCatatanTema({ anakId, anakNama, kelasId, kelasJudul, areaOpsi, awal }: {
  anakId: string;
  anakNama: string;
  kelasId: string;
  kelasJudul: string;
  /** area perkembangan tema ini (`kelas_bermain.fokus_area`) — disarankan, bukan dipaksakan */
  areaOpsi: { key: string; label: string }[];
  awal: { catatan: string; penilaian: NilaiTema[] } | null;
}) {
  const router = useRouter();
  const [catatan, setCatatan] = useState(awal?.catatan ?? '');
  const [rows, setRows] = useState<NilaiTema[]>(awal?.penilaian ?? []);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');

  const set = (i: number, patch: Partial<NilaiTema>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const tambah = () => setRows((r) => [...r, { area: areaOpsi[0]?.key ?? '', indikator: '', nilai: 'BSH' }]);
  const hapus = (i: number) => setRows((r) => r.filter((_, j) => j !== i));

  async function simpan() {
    setSibuk(true); setPesan('');
    const r = await simpanCatatanTema({ anakId, kelasId, catatan, penilaian: rows });
    setSibuk(false);
    if (!r.ok) { setPesan(r.error ?? 'Gagal menyimpan.'); return; }
    setPesan(`Tersimpan ✓ tercatat sebagai ${r.peran}`);
    router.refresh();
  }

  return (
    <div className="kp-card" style={{ marginTop: 10 }}>
      <b style={{ fontSize: 15 }}>🍎 Catatan untuk {anakNama} — {kelasJudul}</b>
      <p style={{ fontSize: 12, color: 'var(--abu)', margin: '4px 0 8px' }}>
        Penilaian Anda berlaku <b>untuk tema ini secara keseluruhan</b>, bukan per aktivitas —
        rincian per aktivitas sudah diisi orang tua di atas. Catatan ini tampil di rapor anak
        beserta nama &amp; peran Anda; menyimpan ulang hanya menimpa catatan Anda sendiri.
      </p>

      <textarea className="kp-input" rows={5} value={catatan} onChange={(e) => setCatatan(e.target.value)}
        placeholder={`Tanggapan Anda atas isian orang tua & hasil game ${anakNama} pada tema ini — apa yang menonjol, apa yang masih perlu didampingi?`}
        style={{ width: '100%', resize: 'vertical' }} />

      <div style={{ fontSize: 12, fontWeight: 700, margin: '8px 0 4px' }}>📊 Penilaian per indikator <span style={{ fontWeight: 400, color: 'var(--abu)' }}>(opsional)</span></div>
      {rows.map((n, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="kp-input" value={n.area} onChange={(e) => set(i, { area: e.target.value })}
            style={{ width: 150, marginBottom: 0 }}>
            {areaOpsi.length === 0 && <option value="">— area —</option>}
            {areaOpsi.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
          <input className="kp-input" value={n.indikator} placeholder="indikator yang dinilai"
            onChange={(e) => set(i, { indikator: e.target.value })} style={{ flex: 1, minWidth: 160, marginBottom: 0 }} />
          {/* Skala PAUD dipakai APA ADANYA dari lib/format — jangan membuat daftar baru,
              nanti rapor menampilkan dua skala yang berbeda untuk hal yang sama. */}
          <select className="kp-input" value={n.nilai} onChange={(e) => set(i, { nilai: e.target.value })}
            style={{ width: 110, marginBottom: 0 }}>
            {SKALA_PAUD.map((s) => <option key={s.kode} value={s.kode}>{s.kode}</option>)}
          </select>
          <button type="button" className="kp-btn putih" onClick={() => hapus(i)} style={{ padding: '6px 10px' }}>✕</button>
        </div>
      ))}
      <button type="button" className="kp-btn putih" onClick={tambah} style={{ marginTop: 8, fontSize: 13 }}>+ indikator</button>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <button className="kp-btn mint" onClick={simpan} disabled={sibuk || !catatan.trim()}>
          {sibuk ? 'Menyimpan…' : '💾 Simpan catatan'}
        </button>
        {!catatan.trim() && <span style={{ fontSize: 12, color: 'var(--abu)' }}>Catatan wajib diisi.</span>}
        {pesan && <span style={{ fontSize: 12, color: pesan.includes('✓') ? 'var(--mint-d)' : '#c0392b' }}>{pesan}</span>}
      </div>
    </div>
  );
}
