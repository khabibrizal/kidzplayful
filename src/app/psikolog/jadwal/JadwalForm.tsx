// src/app/psikolog/jadwal/JadwalForm.tsx — atur hari/jam buka + kuota konsultasi
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { simpanJadwal } from '@/lib/data/psikolog-actions';
import type { JadwalPsikolog } from '@/lib/game/tipe';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function JadwalForm({ awal }: { awal: JadwalPsikolog | null }) {
  const router = useRouter();
  const [hari, setHari] = useState<number[]>(awal?.hari_buka ?? []);
  const [jamMulai, setJamMulai] = useState(awal?.jam_mulai ?? '09:00');
  const [jamSelesai, setJamSelesai] = useState(awal?.jam_selesai ?? '15:00');
  const [maks, setMaks] = useState(String(awal?.maks_per_hari ?? 5));
  const [durasi, setDurasi] = useState(String(awal?.durasi_menit ?? 0));
  const [aktif, setAktif] = useState(awal?.aktif ?? true);
  const [catatan, setCatatan] = useState(awal?.catatan ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

  function toggleHari(h: number) {
    setHari((d) => (d.includes(h) ? d.filter((x) => x !== h) : [...d, h]));
  }

  async function simpan() {
    setBusy(true); setMsg(''); setOk(false);
    const r = await simpanJadwal({
      hariBuka: hari, jamMulai, jamSelesai, maksPerHari: Number(maks) || 0, durasiMenit: Number(durasi) || 0, aktif, catatan,
    });
    setBusy(false);
    if (r.ok) { setOk(true); setMsg('Jadwal tersimpan ✓'); router.refresh(); }
    else { setOk(false); setMsg(r.error ?? 'Gagal'); }
  }

  return (
    <div className="kp-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Hari buka</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {HARI.map((nm, h) => {
            const on = hari.includes(h);
            return (
              <button key={h} type="button" onClick={() => toggleHari(h)}
                style={{ border: 'none', cursor: 'pointer', borderRadius: 99, padding: '6px 12px', fontSize: 12, fontWeight: 700, background: on ? 'var(--lavender-d)' : '#f1eef8', color: on ? '#fff' : 'var(--abu)' }}>
                {nm}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: 'var(--abu)' }}>Jam mulai
          <input className="kp-input" type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} style={{ marginBottom: 0, display: 'block' }} />
        </label>
        <label style={{ fontSize: 12, color: 'var(--abu)' }}>Jam selesai
          <input className="kp-input" type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} style={{ marginBottom: 0, display: 'block' }} />
        </label>
        <label style={{ fontSize: 12, color: 'var(--abu)' }}>Maks customer / hari
          <input className="kp-input" type="number" min={0} value={maks} onChange={(e) => setMaks(e.target.value)} style={{ marginBottom: 0, display: 'block', width: 100 }} />
        </label>
        <label style={{ fontSize: 12, color: 'var(--abu)' }}>Durasi / sesi (menit)
          <input className="kp-input" type="number" min={0} value={durasi} onChange={(e) => setDurasi(e.target.value)} style={{ marginBottom: 0, display: 'block', width: 120 }} />
        </label>
      </div>
      <p style={{ fontSize: 11, color: 'var(--abu)', margin: 0 }}>Durasi 0 = tanpa batas waktu. Bila diisi, saat sesi dimulai muncul hitung mundur; 1 menit terakhir muncul peringatan, dan saat habis chat otomatis selesai.</p>

      <p style={{ fontSize: 11, color: 'var(--abu)', margin: 0 }}>
        💡 <b>Tarif konsultasi diatur admin</b>, bukan di halaman ini
        {awal?.harga_konsultasi ? <> — tarif sesimu saat ini <b>Rp {Number(awal.harga_konsultasi).toLocaleString('id-ID')}</b></> : null}.
        Hubungi admin bila perlu diubah.
      </p>

      <textarea className="kp-input" placeholder="Catatan untuk customer (opsional)" rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} style={{ resize: 'vertical', marginBottom: 0 }} />

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
        <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
        Buka menerima konsultasi (nonaktifkan untuk libur sementara)
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="kp-btn" onClick={simpan} disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Menyimpan…' : '💾 Simpan Jadwal'}</button>
        {msg && <span style={{ fontSize: 13, fontWeight: 700, color: ok ? '#1c7a43' : '#c0392b' }}>{msg}</span>}
      </div>
    </div>
  );
}
