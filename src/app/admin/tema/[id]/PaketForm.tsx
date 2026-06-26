// src/app/admin/tema/[id]/PaketForm.tsx
'use client';
import { useState } from 'react';
import type { Mesin } from '@/lib/game/tipe';
import { buatPaket } from '@/lib/data/admin-konten';
import s from '../../admin.module.css';

const AREA: Record<Mesin, string> = { 'tekan-sesuai': 'kognitif', 'seret-wadah': 'motorik-halus', 'cari-pasangan': 'kognitif' };

export default function PaketForm({ temaId }: { temaId: string }) {
  const [mesin, setMesin] = useState<Mesin>('tekan-sesuai');
  const [judul, setJudul] = useState('Mana Ya?');
  const [err, setErr] = useState('');

  // tekan-sesuai
  const [soal, setSoal] = useState([{ tanya: '', benar: '', salah: '' }]);
  // seret-wadah
  const [wadah, setWadah] = useState([{ kategori: '', label: '', emoji: '' }]);
  const [benda, setBenda] = useState([{ emoji: '', kategori: '' }]);
  // cari-pasangan
  const [pasangan, setPasangan] = useState('');

  async function simpan() {
    setErr('');
    let butir: unknown;
    if (mesin === 'tekan-sesuai') {
      butir = { soal: soal.filter((x) => x.tanya && x.benar).map((x) => ({ tanya: x.tanya.trim(), benar: x.benar.trim(), salah: x.salah.split(/\s+/).filter(Boolean) })) };
    } else if (mesin === 'seret-wadah') {
      butir = { wadah: wadah.filter((w) => w.kategori && w.emoji), benda: benda.filter((b) => b.emoji && b.kategori) };
    } else {
      butir = { pasangan: pasangan.split(/\s+/).filter(Boolean) };
    }
    try {
      await buatPaket({ temaId, mesin, judul, areaSkill: AREA[mesin], usiaMin: 2, usiaMax: 5, butir });
      location.reload();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal menyimpan'); }
  }

  return (
    <div className={s.card}>
      <div className={s.row}>
        <select className={s.inp} value={mesin} onChange={(e) => setMesin(e.target.value as Mesin)}>
          <option value="tekan-sesuai">Mana Ya? (tekan)</option>
          <option value="seret-wadah">Beres-Beres (seret)</option>
          <option value="cari-pasangan">Cari Pasangan (cocok)</option>
        </select>
        <input className={s.inp} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul game" style={{ flex: 1 }} />
      </div>

      {mesin === 'tekan-sesuai' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Tiap soal: pertanyaan, emoji benar, lalu emoji pengecoh (pisah spasi).</div>
          {soal.map((x, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6 }}>
              <input className={s.inp} placeholder="kucing" value={x.tanya} onChange={(e) => setSoal(soal.map((y, j) => j === i ? { ...y, tanya: e.target.value } : y))} style={{ flex: 1 }} />
              <input className={s.inp} placeholder="🐱" value={x.benar} onChange={(e) => setSoal(soal.map((y, j) => j === i ? { ...y, benar: e.target.value } : y))} style={{ width: 70 }} />
              <input className={s.inp} placeholder="🐶 🐮 🐰" value={x.salah} onChange={(e) => setSoal(soal.map((y, j) => j === i ? { ...y, salah: e.target.value } : y))} style={{ flex: 1 }} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setSoal([...soal, { tanya: '', benar: '', salah: '' }])}>+ soal</button>
        </div>
      )}

      {mesin === 'seret-wadah' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Wadah (kategori, label, emoji) & Benda (emoji, kategori).</div>
          {wadah.map((w, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6 }}>
              <input className={s.inp} placeholder="buah" value={w.kategori} onChange={(e) => setWadah(wadah.map((y, j) => j === i ? { ...y, kategori: e.target.value } : y))} />
              <input className={s.inp} placeholder="Buah" value={w.label} onChange={(e) => setWadah(wadah.map((y, j) => j === i ? { ...y, label: e.target.value } : y))} />
              <input className={s.inp} placeholder="🧺" value={w.emoji} onChange={(e) => setWadah(wadah.map((y, j) => j === i ? { ...y, emoji: e.target.value } : y))} style={{ width: 70 }} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setWadah([...wadah, { kategori: '', label: '', emoji: '' }])}>+ wadah</button>
          <div style={{ height: 6 }} />
          {benda.map((b, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6 }}>
              <input className={s.inp} placeholder="🍎" value={b.emoji} onChange={(e) => setBenda(benda.map((y, j) => j === i ? { ...y, emoji: e.target.value } : y))} style={{ width: 70 }} />
              <input className={s.inp} placeholder="buah" value={b.kategori} onChange={(e) => setBenda(benda.map((y, j) => j === i ? { ...y, kategori: e.target.value } : y))} style={{ flex: 1 }} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setBenda([...benda, { emoji: '', kategori: '' }])}>+ benda</button>
        </div>
      )}

      {mesin === 'cari-pasangan' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Daftar emoji (pisah spasi). Tiap emoji otomatis jadi sepasang.</div>
          <input className={s.inp} placeholder="🐱 🌸 🐶" value={pasangan} onChange={(e) => setPasangan(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
        </div>
      )}

      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>{err}</div>}
      <button className={s.btn} style={{ marginTop: 10 }} onClick={simpan}>💾 Simpan paket</button>
    </div>
  );
}
