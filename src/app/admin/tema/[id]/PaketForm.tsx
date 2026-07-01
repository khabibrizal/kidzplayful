// src/app/admin/tema/[id]/PaketForm.tsx
'use client';
import { useState } from 'react';
import type { Mesin } from '@/lib/game/tipe';
import { buatPaket } from '@/lib/data/admin-konten';
import AsetInput from '@/components/admin/AsetInput';
import { TEMPLATE_OPSI, TEMPLATES, PALETTE_DEFAULT } from '@/lib/game/templates-mewarnai';
import { sanitizeSvg, hitungArea } from '@/lib/game/svg-sanitize';
import s from '../../admin.module.css';

const AREA: Record<Mesin, string> = { 'tekan-sesuai': 'kognitif', 'seret-wadah': 'motorik-halus', 'cari-pasangan': 'kognitif', 'mewarnai': 'kreativitas' };

type Soal = { tanya: string; benar: string; pengecoh: string[] };
type Wadah = { kategori: string; label: string; emoji: string };
type Benda = { emoji: string; kategori: string };

export default function PaketForm({ temaId }: { temaId: string }) {
  const [mesin, setMesin] = useState<Mesin>('tekan-sesuai');
  const [judul, setJudul] = useState('Mana Ya?');
  const [err, setErr] = useState('');

  const [soal, setSoal] = useState<Soal[]>([{ tanya: '', benar: '', pengecoh: ['', ''] }]);
  const [wadah, setWadah] = useState<Wadah[]>([{ kategori: '', label: '', emoji: '' }]);
  const [benda, setBenda] = useState<Benda[]>([{ emoji: '', kategori: '' }]);
  const [pasangan, setPasangan] = useState<string[]>(['', '']);
  const [template, setTemplate] = useState<string>(TEMPLATE_OPSI[0]?.id ?? '');
  const [modeMew, setModeMew] = useState<'bebas' | 'sesuai'>('bebas');
  const [sumberMew, setSumberMew] = useState<'template' | 'svg'>('template');
  const [svgMarkup, setSvgMarkup] = useState('');
  const [svgArea, setSvgArea] = useState(0);

  async function pilihSvg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const teks = await f.text();
    const bersih = sanitizeSvg(teks);
    setSvgMarkup(bersih);
    setSvgArea(hitungArea(bersih));
  }

  async function simpan() {
    setErr('');
    let butir: unknown;
    if (mesin === 'tekan-sesuai') {
      butir = { soal: soal.filter((x) => x.tanya && x.benar).map((x) => ({ tanya: x.tanya.trim(), benar: x.benar, salah: x.pengecoh.filter(Boolean) })) };
    } else if (mesin === 'seret-wadah') {
      butir = { wadah: wadah.filter((w) => w.kategori && w.emoji), benda: benda.filter((b) => b.emoji && b.kategori) };
    } else if (mesin === 'mewarnai') {
      if (sumberMew === 'svg') {
        butir = { sumber: 'svg', svg: svgMarkup, palette: PALETTE_DEFAULT, mode: 'bebas' };
      } else {
        butir = { sumber: 'template', template, palette: PALETTE_DEFAULT, mode: modeMew, target: modeMew === 'sesuai' ? TEMPLATES[template]?.target : undefined };
      }
    } else {
      butir = { pasangan: pasangan.filter(Boolean) };
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
          <option value="mewarnai">Mewarnai (warnai)</option>
        </select>
        <input className={s.inp} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul game" style={{ flex: 1 }} />
      </div>

      {mesin === 'tekan-sesuai' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Tiap soal: pertanyaan (teks), jawaban benar (emoji/gambar), pengecoh (emoji/gambar).</div>
          {soal.map((x, i) => (
            <div key={i} className={s.card} style={{ background: '#faf7ff' }}>
              <input className={s.inp} placeholder="pertanyaan (mis. kucing)" value={x.tanya}
                onChange={(e) => setSoal(soal.map((y, j) => j === i ? { ...y, tanya: e.target.value } : y))} style={{ width: '100%', marginBottom: 6 }} />
              <div className={s.row} style={{ flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#2e9e63', fontWeight: 700 }}>Benar:</span>
                <AsetInput value={x.benar} onChange={(v) => setSoal(soal.map((y, j) => j === i ? { ...y, benar: v } : y))} />
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--abu)', fontWeight: 700 }}>Pengecoh:</span>
                {x.pengecoh.map((p, k) => (
                  <div key={k} style={{ marginTop: 4 }}>
                    <AsetInput value={p} onChange={(v) => setSoal(soal.map((y, j) => j === i ? { ...y, pengecoh: y.pengecoh.map((q, m) => m === k ? v : q) } : y))} />
                  </div>
                ))}
                <button className={s.btnSm} style={{ background: '#eee', marginTop: 4 }} onClick={() => setSoal(soal.map((y, j) => j === i ? { ...y, pengecoh: [...y.pengecoh, ''] } : y))}>+ pengecoh</button>
              </div>
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setSoal([...soal, { tanya: '', benar: '', pengecoh: ['', ''] }])}>+ soal</button>
        </div>
      )}

      {mesin === 'seret-wadah' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Wadah (kategori, label, emoji/gambar) & Benda (emoji/gambar, kategori).</div>
          {wadah.map((w, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <input className={s.inp} placeholder="kategori (buah)" value={w.kategori} onChange={(e) => setWadah(wadah.map((y, j) => j === i ? { ...y, kategori: e.target.value } : y))} />
              <input className={s.inp} placeholder="label (Buah)" value={w.label} onChange={(e) => setWadah(wadah.map((y, j) => j === i ? { ...y, label: e.target.value } : y))} />
              <AsetInput value={w.emoji} onChange={(v) => setWadah(wadah.map((y, j) => j === i ? { ...y, emoji: v } : y))} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setWadah([...wadah, { kategori: '', label: '', emoji: '' }])}>+ wadah</button>
          <div style={{ height: 6 }} />
          {benda.map((b, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <AsetInput value={b.emoji} onChange={(v) => setBenda(benda.map((y, j) => j === i ? { ...y, emoji: v } : y))} />
              <input className={s.inp} placeholder="kategori (buah)" value={b.kategori} onChange={(e) => setBenda(benda.map((y, j) => j === i ? { ...y, kategori: e.target.value } : y))} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setBenda([...benda, { emoji: '', kategori: '' }])}>+ benda</button>
        </div>
      )}

      {mesin === 'cari-pasangan' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Tiap entri jadi sepasang (emoji/gambar). Minimal 2.</div>
          {pasangan.map((p, i) => (
            <div key={i} style={{ marginTop: 6 }}>
              <AsetInput value={p} onChange={(v) => setPasangan(pasangan.map((q, j) => j === i ? v : q))} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setPasangan([...pasangan, ''])}>+ pasangan</button>
        </div>
      )}

      {mesin === 'mewarnai' && (
        <div style={{ marginTop: 10 }}>
          <select className={s.inp} value={sumberMew} onChange={(e) => setSumberMew(e.target.value as 'template' | 'svg')} style={{ width: '100%' }}>
            <option value="template">Template bawaan</option>
            <option value="svg">Upload gambar SVG sendiri</option>
          </select>

          {sumberMew === 'template' ? (
            <>
              <div className={s.row} style={{ marginTop: 6, gap: 6 }}>
                <select className={s.inp} value={template} onChange={(e) => setTemplate(e.target.value)} style={{ flex: 1 }}>
                  {TEMPLATE_OPSI.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
                </select>
                <select className={s.inp} value={modeMew} onChange={(e) => setModeMew(e.target.value as 'bebas' | 'sesuai')}>
                  <option value="bebas">Bebas</option>
                  <option value="sesuai">Sesuai contoh</option>
                </select>
              </div>
              <div className={s.muted} style={{ fontSize: 12 }}>Bebas = warnai sesuka hati (bintang saat selesai). Sesuai = cocokkan warna target.</div>
            </>
          ) : (
            <div style={{ marginTop: 6 }}>
              <div className={s.muted} style={{ fontSize: 12, marginBottom: 4 }}>Unggah file .svg berisi outline (garis) gambar. Mode: Bebas. Warna otomatis dibersihkan menjadi putih agar bisa diwarnai.</div>
              <input type="file" accept="image/svg+xml,.svg" onChange={pilihSvg} />
              {svgMarkup && <div className={s.muted} style={{ fontSize: 12, marginTop: 4, color: '#2e9e63' }}>✓ SVG dimuat · {svgArea} area bisa diwarnai</div>}
            </div>
          )}
        </div>
      )}

      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>{err}</div>}
      <button className={s.btn} style={{ marginTop: 10 }} onClick={simpan}>💾 Simpan paket</button>
    </div>
  );
}
