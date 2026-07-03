// src/app/admin/tema/[id]/PaketForm.tsx
'use client';
import { useState } from 'react';
import type { Mesin, Paket, DataTekan, DataSeret, DataCocok, DataMewarnai, DataDekode, DataUrutan, DataJalur, DataHitung, DataCocokkan } from '@/lib/game/tipe';
import { buatPaket, updatePaket } from '@/lib/data/admin-konten';
import { validasiButir } from '@/lib/game/butir';
import AsetInput from '@/components/admin/AsetInput';
import Aset from '@/components/game/Aset';
import { TEMPLATE_OPSI, TEMPLATES, PALETTE_DEFAULT } from '@/lib/game/templates-mewarnai';
import { sanitizeSvg, tandaiArea } from '@/lib/game/svg-sanitize';
import TargetEditor from './TargetEditor';
import s from '../../admin.module.css';

const AREA: Record<Mesin, string> = { 'tekan-sesuai': 'kognitif', 'seret-wadah': 'motorik-halus', 'cari-pasangan': 'kognitif', 'mewarnai': 'kreativitas', 'dekode': 'kognitif', 'urutan': 'kognitif', 'jalur': 'kognitif', 'hitung': 'kognitif', 'cocokkan': 'kognitif' };
type JSoal = { kolom: number; baris: number; mulai: [number, number]; tujuan: [number, number]; rintangan: [number, number][]; karakter: string; hadiah: string };

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
function SimbolMini({ v, size = 22 }: { v: string; size?: number }) {
  if (isHex(v)) return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 6, background: v, border: '1px solid #ddd' }} />;
  return <Aset value={v} size={size} />;
}

type Soal = { tanya: string; benar: string; pengecoh: string[] };
type Wadah = { kategori: string; label: string; emoji: string };
type Benda = { emoji: string; kategori: string };
type LegRow = { simbol: string; nilai: string };

export default function PaketForm({ temaId, paketList = [] }: { temaId: string; paketList?: Paket[] }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [mesin, setMesin] = useState<Mesin>('tekan-sesuai');
  const [judul, setJudul] = useState('Mana Ya?');
  const [usiaMin, setUsiaMin] = useState(2);
  const [usiaMax, setUsiaMax] = useState(5);
  const [targetDetik, setTargetDetik] = useState('');  // Mode Tantangan (opsional)
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
  const [svgMode, setSvgMode] = useState<'bebas' | 'sesuai' | 'berkode'>('bebas');
  const [svgTarget, setSvgTarget] = useState<Record<string, string>>({});
  // dekode ("Pecahkan Kode")
  const [legenda, setLegenda] = useState<LegRow[]>([{ simbol: '', nilai: '' }]);
  const [dsoal, setDsoal] = useState<string[][]>([[]]);
  // urutan & pola
  const [uTipe, setUTipe] = useState<'urutkan' | 'pola'>('urutkan');
  const [uSoal, setUSoal] = useState<{ item: string[]; petunjuk: string }[]>([{ item: ['', ''], petunjuk: '' }]);
  const [pSoal, setPSoal] = useState<{ tampil: string[]; benar: string; salah: string[] }[]>([{ tampil: ['', '', ''], benar: '', salah: [''] }]);
  // arah & jalur (robot grid)
  const [jSoal, setJSoal] = useState<JSoal[]>([{ kolom: 4, baris: 4, mulai: [0, 3], tujuan: [3, 0], rintangan: [], karakter: '🐢', hadiah: '🎯' }]);
  const [jMode, setJMode] = useState<'mulai' | 'tujuan' | 'rintangan'>('rintangan');
  // hitung-kode
  const [hLeg, setHLeg] = useState<{ simbol: string; nilai: string }[]>([{ simbol: '', nilai: '' }]);
  const [hSoal, setHSoal] = useState<{ kiri: string; kanan: string; operasi: '+' | '-' }[]>([{ kiri: '', kanan: '', operasi: '+' }]);
  // cocokkan (asosiasi)
  const [cocokPairs, setCocokPairs] = useState<{ kiri: string; kanan: string }[]>([{ kiri: '', kanan: '' }, { kiri: '', kanan: '' }]);

  async function pilihSvg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const teks = await f.text();
    const { svg: ditandai, jumlah } = tandaiArea(sanitizeSvg(teks));
    setSvgMarkup(ditandai);
    setSvgArea(jumlah);
    setSvgTarget({});
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
        const perluTarget = svgMode === 'sesuai' || svgMode === 'berkode';
        butir = { sumber: 'svg', svg: svgMarkup, palette: PALETTE_DEFAULT, mode: svgMode, target: perluTarget ? svgTarget : undefined };
      } else {
        butir = { sumber: 'template', template, palette: PALETTE_DEFAULT, mode: modeMew, target: modeMew === 'sesuai' ? TEMPLATES[template]?.target : undefined };
      }
    } else if (mesin === 'dekode') {
      butir = {
        legenda: legenda.filter((m) => m.simbol.trim() && m.nilai.trim()).map((m) => ({ simbol: m.simbol.trim(), nilai: m.nilai.trim() })),
        soal: dsoal.filter((sq) => sq.length > 0),
      };
    } else if (mesin === 'urutan') {
      if (uTipe === 'urutkan') {
        butir = { tipe: 'urutkan', soal: uSoal.map((x) => ({ urut: x.item.filter(Boolean), petunjuk: x.petunjuk.trim() || undefined })).filter((x) => x.urut.length >= 2) };
      } else {
        butir = { tipe: 'pola', soal: pSoal.map((x) => ({ tampil: x.tampil.filter(Boolean), benar: x.benar.trim(), salah: x.salah.filter(Boolean) })).filter((x) => x.benar && x.tampil.length >= 1 && x.salah.length >= 1) };
      }
    } else if (mesin === 'jalur') {
      butir = { soal: jSoal.map((sq) => ({ kolom: sq.kolom, baris: sq.baris, mulai: sq.mulai, tujuan: sq.tujuan, rintangan: sq.rintangan, karakter: sq.karakter.trim() || '🐢', hadiah: sq.hadiah.trim() || '🎯' })) };
    } else if (mesin === 'hitung') {
      butir = {
        legenda: hLeg.filter((m) => m.simbol.trim() && m.nilai.trim() !== '').map((m) => ({ simbol: m.simbol.trim(), nilai: Number(m.nilai) })),
        soal: hSoal.filter((sq) => sq.kiri && sq.kanan).map((sq) => ({ kiri: sq.kiri, kanan: sq.kanan, operasi: sq.operasi })),
      };
    } else if (mesin === 'cocokkan') {
      butir = { pasangan: cocokPairs.filter((x) => x.kiri.trim() && x.kanan.trim()).map((x) => ({ kiri: x.kiri.trim(), kanan: x.kanan.trim() })) };
    } else {
      butir = { pasangan: pasangan.filter(Boolean) };
    }
    // validasi di klien dulu → pesan ramah (server action di-redact di production)
    const pesan = validasiButir(mesin, butir);
    if (pesan) { setErr(pesan); return; }
    if (usiaMin > usiaMax) { setErr('Usia minimal tidak boleh lebih besar dari usia maksimal.'); return; }
    const target = targetDetik.trim() ? Number(targetDetik) : null;
    try {
      if (editId) await updatePaket({ id: editId, temaId, mesin, judul, areaSkill: AREA[mesin], usiaMin, usiaMax, targetDetik: target, butir });
      else await buatPaket({ temaId, mesin, judul, areaSkill: AREA[mesin], usiaMin, usiaMax, targetDetik: target, butir });
      location.reload();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal menyimpan. Cek koneksi & coba lagi.'); }
  }

  // Isi form dari paket yang sudah ada (mode edit)
  function muatUntukEdit(p: Paket) {
    setErr(''); setEditId(p.id); setMesin(p.mesin); setJudul(p.judul);
    setUsiaMin(p.usia_min); setUsiaMax(p.usia_max); setTargetDetik(p.target_detik ? String(p.target_detik) : '');
    if (p.mesin === 'tekan-sesuai') {
      const b = p.butir as DataTekan;
      setSoal((b.soal ?? []).map((x) => ({ tanya: x.tanya ?? '', benar: x.benar ?? '', pengecoh: x.salah?.length ? x.salah : ['', ''] })));
    } else if (p.mesin === 'seret-wadah') {
      const b = p.butir as DataSeret;
      setWadah(b.wadah?.length ? b.wadah : [{ kategori: '', label: '', emoji: '' }]);
      setBenda(b.benda?.length ? b.benda : [{ emoji: '', kategori: '' }]);
    } else if (p.mesin === 'cari-pasangan') {
      const b = p.butir as DataCocok;
      setPasangan(b.pasangan?.length ? b.pasangan : ['', '']);
    } else if (p.mesin === 'mewarnai') {
      const b = p.butir as DataMewarnai;
      if (b.sumber === 'svg') { setSumberMew('svg'); setSvgMarkup(b.svg ?? ''); setSvgMode(b.mode); setSvgTarget(b.target ?? {}); setSvgArea(((b.svg ?? '').match(/data-area/g) || []).length); }
      else { setSumberMew('template'); setTemplate(b.template ?? TEMPLATE_OPSI[0]?.id ?? ''); setModeMew(b.mode === 'sesuai' ? 'sesuai' : 'bebas'); }
    } else if (p.mesin === 'dekode') {
      const b = p.butir as DataDekode;
      setLegenda(b.legenda?.length ? b.legenda : [{ simbol: '', nilai: '' }]);
      setDsoal(b.soal?.length ? b.soal : [[]]);
    } else if (p.mesin === 'urutan') {
      const b = p.butir as DataUrutan;
      if (b.tipe === 'pola') { setUTipe('pola'); setPSoal((b.soal ?? []).map((x) => ({ tampil: x.tampil ?? [''], benar: x.benar ?? '', salah: x.salah?.length ? x.salah : [''] }))); }
      else { setUTipe('urutkan'); setUSoal((b.soal ?? []).map((x) => ({ item: x.urut ?? ['', ''], petunjuk: x.petunjuk ?? '' }))); }
    } else if (p.mesin === 'jalur') {
      const b = p.butir as DataJalur;
      setJSoal((b.soal ?? []).map((x) => ({ kolom: x.kolom, baris: x.baris, mulai: x.mulai, tujuan: x.tujuan, rintangan: x.rintangan ?? [], karakter: x.karakter ?? '🐢', hadiah: x.hadiah ?? '🎯' })));
    } else if (p.mesin === 'hitung') {
      const b = p.butir as DataHitung;
      setHLeg((b.legenda ?? []).map((m) => ({ simbol: m.simbol ?? '', nilai: String(m.nilai ?? '') })));
      setHSoal((b.soal ?? []).map((sq) => ({ kiri: sq.kiri ?? '', kanan: sq.kanan ?? '', operasi: sq.operasi === '-' ? '-' : '+' })));
    } else if (p.mesin === 'cocokkan') {
      const b = p.butir as DataCocokkan;
      setCocokPairs(b.pasangan?.length ? b.pasangan : [{ kiri: '', kanan: '' }, { kiri: '', kanan: '' }]);
    }
  }

  return (
    <div className={s.card}>
      {paketList.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {editId ? (
            <div style={{ background: '#fff3d6', borderRadius: 10, padding: '8px 10px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span>✏️ Sedang mengedit: <b>{judul}</b></span>
              <button type="button" className={s.btnSm} style={{ background: '#eee' }} onClick={() => location.reload()}>Batal edit</button>
            </div>
          ) : (
            <select className={s.inp} value="" onChange={(e) => { const p = paketList.find((x) => x.id === e.target.value); if (p) muatUntukEdit(p); }} style={{ width: '100%' }}>
              <option value="">✏️ Edit game yang ada… (atau isi form di bawah untuk game baru)</option>
              {paketList.map((p) => <option key={p.id} value={p.id}>{p.judul} ({p.mesin})</option>)}
            </select>
          )}
        </div>
      )}
      <div className={s.row}>
        <select className={s.inp} value={mesin} onChange={(e) => setMesin(e.target.value as Mesin)}>
          <option value="tekan-sesuai">Mana Ya? (tekan)</option>
          <option value="seret-wadah">Beres-Beres (seret)</option>
          <option value="cari-pasangan">Cari Pasangan (cocok)</option>
          <option value="mewarnai">Mewarnai (warnai)</option>
          <option value="dekode">Pecahkan Kode (dekode)</option>
          <option value="urutan">Urutan & Pola (urutan)</option>
          <option value="jalur">Arah & Jalur / Robot Grid (jalur)</option>
          <option value="hitung">Hitung-Kode (hitung)</option>
          <option value="cocokkan">Cocokkan / Asosiasi (cocokkan)</option>
        </select>
        <input className={s.inp} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul game" style={{ flex: 1 }} />
      </div>
      <div className={s.row} style={{ marginTop: 6, gap: 6, alignItems: 'center' }}>
        <span className={s.muted} style={{ fontSize: 12 }}>Usia:</span>
        <input className={s.inp} type="number" min={0} max={12} value={usiaMin} onChange={(e) => setUsiaMin(Number(e.target.value))} style={{ width: 64, marginBottom: 0 }} />
        <span className={s.muted}>–</span>
        <input className={s.inp} type="number" min={0} max={12} value={usiaMax} onChange={(e) => setUsiaMax(Number(e.target.value))} style={{ width: 64, marginBottom: 0 }} />
        <span className={s.muted} style={{ fontSize: 11 }}>tahun (game koding: 4–6)</span>
      </div>
      <div className={s.row} style={{ marginTop: 6, gap: 6, alignItems: 'center' }}>
        <span className={s.muted} style={{ fontSize: 12 }}>⚡ Target waktu:</span>
        <input className={s.inp} type="number" min={0} placeholder="detik" value={targetDetik} onChange={(e) => setTargetDetik(e.target.value)} style={{ width: 90, marginBottom: 0 }} />
        <span className={s.muted} style={{ fontSize: 11 }}>detik — Mode Tantangan: selesai ≤ target = bonus ⭐+🪙 (kosongkan bila tanpa target)</span>
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
              <div className={s.muted} style={{ fontSize: 12, marginBottom: 4 }}>Unggah file .svg berisi outline (garis). Warna otomatis jadi putih agar bisa diwarnai.</div>
              <input type="file" accept="image/svg+xml,.svg" onChange={pilihSvg} />
              {svgMarkup && (
                <>
                  <div className={s.muted} style={{ fontSize: 12, marginTop: 4, color: '#2e9e63' }}>✓ SVG dimuat · {svgArea} area bisa diwarnai</div>
                  <select className={s.inp} value={svgMode} onChange={(e) => setSvgMode(e.target.value as 'bebas' | 'sesuai' | 'berkode')} style={{ width: '100%', marginTop: 6 }}>
                    <option value="bebas">Mode Bebas</option>
                    <option value="sesuai">Mode Sesuai contoh (atur warna target)</option>
                    <option value="berkode">Mode Berkode / warnai sesuai angka (atur warna target)</option>
                  </select>
                  {svgMode === 'berkode' && <div className={s.muted} style={{ fontSize: 11, marginTop: 4 }}>Angka tiap area = urutan warna target pada palet. Atur warna target per area di bawah.</div>}
                  {(svgMode === 'sesuai' || svgMode === 'berkode') && <TargetEditor svg={svgMarkup} palette={PALETTE_DEFAULT} target={svgTarget} setTarget={setSvgTarget} />}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {mesin === 'dekode' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted} style={{ fontSize: 12 }}>Legenda: tiap simbol (emoji/gambar/warna #hex) punya nilai (huruf/angka/kata). Lalu susun soal dari urutan simbol.</div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', marginTop: 8 }}>Legenda kode</div>
          {legenda.map((m, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6, flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <AsetInput value={m.simbol} onChange={(v) => setLegenda(legenda.map((y, j) => j === i ? { ...y, simbol: v } : y))} placeholder="🔴 / #e74c3c / 🐱" />
              <span className={s.muted}>→</span>
              <input className={s.inp} placeholder="nilai (A / 1 / kata)" value={m.nilai} onChange={(e) => setLegenda(legenda.map((y, j) => j === i ? { ...y, nilai: e.target.value } : y))} style={{ width: 150, marginBottom: 0 }} />
              {legenda.length > 1 && <button className={`${s.btnSm} ${s.danger}`} onClick={() => setLegenda(legenda.filter((_, j) => j !== i))}>×</button>}
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setLegenda([...legenda, { simbol: '', nilai: '' }])}>+ legenda</button>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', marginTop: 12 }}>Soal (urutan simbol untuk diterjemahkan anak)</div>
          {legenda.filter((m) => m.simbol.trim()).length === 0 && (
            <div style={{ background: '#fff3d6', color: '#8a6d00', borderRadius: 10, padding: '8px 10px', fontSize: 12, marginTop: 4 }}>
              ⚠️ Isi kolom <b>simbol</b> di Legenda dulu. Setelah itu tombol simbol muncul di sini untuk menyusun soal (klik simbol satu per satu).
            </div>
          )}
          {dsoal.map((sq, i) => {
            const simbolTerisi = legenda.filter((m) => m.simbol.trim());
            return (
              <div key={i} className={s.card} style={{ background: '#faf7ff' }}>
                <div className={s.row} style={{ flexWrap: 'wrap', gap: 6, alignItems: 'center', minHeight: 30 }}>
                  <span className={s.muted} style={{ fontSize: 12 }}>Soal {i + 1}:</span>
                  {sq.length === 0 && <span className={s.muted} style={{ fontSize: 12 }}>(kosong — klik simbol di bawah)</span>}
                  {sq.map((sim, k) => <span key={k} style={{ display: 'inline-flex', background: '#fff', borderRadius: 8, padding: '3px 6px', boxShadow: '0 2px 0 #e6def5' }}><SimbolMini v={sim} size={24} /></span>)}
                </div>
                {simbolTerisi.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div className={s.muted} style={{ fontSize: 11, marginBottom: 4 }}>Klik simbol untuk menambah ke soal:</div>
                    <div className={s.row} style={{ flexWrap: 'wrap', gap: 6 }}>
                      {simbolTerisi.map((m, k) => (
                        <button key={k} type="button" className={s.btnSm} style={{ background: '#eef', display: 'inline-flex', alignItems: 'center' }} onClick={() => setDsoal(dsoal.map((y, j) => j === i ? [...y, m.simbol] : y))}><SimbolMini v={m.simbol} size={22} /></button>
                      ))}
                    </div>
                  </div>
                )}
                <div className={s.row} style={{ flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {sq.length > 0 && <button type="button" className={s.btnSm} style={{ background: '#eee' }} onClick={() => setDsoal(dsoal.map((y, j) => j === i ? y.slice(0, -1) : y))}>⌫ hapus terakhir</button>}
                  {dsoal.length > 1 && <button type="button" className={`${s.btnSm} ${s.danger}`} onClick={() => setDsoal(dsoal.filter((_, j) => j !== i))}>hapus soal</button>}
                </div>
              </div>
            );
          })}
          <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setDsoal([...dsoal, []])}>+ soal</button>
        </div>
      )}

      {mesin === 'urutan' && (
        <div style={{ marginTop: 10 }}>
          <select className={s.inp} value={uTipe} onChange={(e) => setUTipe(e.target.value as 'urutkan' | 'pola')} style={{ width: '100%' }}>
            <option value="urutkan">Urutkan (anak menata item ke urutan benar)</option>
            <option value="pola">Lanjutkan Pola (anak pilih item berikutnya)</option>
          </select>

          {uTipe === 'urutkan' ? (
            <div style={{ marginTop: 8 }}>
              <div className={s.muted} style={{ fontSize: 12 }}>Isi item pada <b>urutan yang BENAR</b> (kiri→kanan). Di game ditampilkan teracak; anak mengetuknya berurutan. Petunjuk mis. &quot;kecil → besar&quot; / &quot;susun: BUKU&quot;.</div>
              {uSoal.map((sq, i) => (
                <div key={i} className={s.card} style={{ background: '#faf7ff' }}>
                  <input className={s.inp} placeholder="petunjuk (mis. kecil → besar)" value={sq.petunjuk} onChange={(e) => setUSoal(uSoal.map((y, j) => j === i ? { ...y, petunjuk: e.target.value } : y))} style={{ width: '100%', marginBottom: 6 }} />
                  {sq.item.map((it, k) => (
                    <div key={k} className={s.row} style={{ marginTop: 4, gap: 6, alignItems: 'center' }}>
                      <span className={s.muted} style={{ fontSize: 11, width: 16 }}>{k + 1}.</span>
                      <AsetInput value={it} onChange={(v) => setUSoal(uSoal.map((y, j) => j === i ? { ...y, item: y.item.map((q, m) => m === k ? v : q) } : y))} placeholder="1 / 🍎 / #hex" />
                      {sq.item.length > 2 && <button className={`${s.btnSm} ${s.danger}`} onClick={() => setUSoal(uSoal.map((y, j) => j === i ? { ...y, item: y.item.filter((_, m) => m !== k) } : y))}>×</button>}
                    </div>
                  ))}
                  <button className={s.btnSm} style={{ background: '#eee', marginTop: 4 }} onClick={() => setUSoal(uSoal.map((y, j) => j === i ? { ...y, item: [...y.item, ''] } : y))}>+ item</button>
                  {uSoal.length > 1 && <button className={`${s.btnSm} ${s.danger}`} style={{ marginLeft: 6 }} onClick={() => setUSoal(uSoal.filter((_, j) => j !== i))}>hapus soal</button>}
                </div>
              ))}
              <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setUSoal([...uSoal, { item: ['', ''], petunjuk: '' }])}>+ soal</button>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div className={s.muted} style={{ fontSize: 12 }}>Tiap soal: urutan yang <b>ditampilkan</b> (pola) + jawaban <b>berikutnya</b> yang benar + pengecoh.</div>
              {pSoal.map((sq, i) => (
                <div key={i} className={s.card} style={{ background: '#faf7ff' }}>
                  <div className={s.muted} style={{ fontSize: 11, fontWeight: 700 }}>Pola tampil:</div>
                  {sq.tampil.map((it, k) => (
                    <div key={k} className={s.row} style={{ marginTop: 4, gap: 6, alignItems: 'center' }}>
                      <AsetInput value={it} onChange={(v) => setPSoal(pSoal.map((y, j) => j === i ? { ...y, tampil: y.tampil.map((q, m) => m === k ? v : q) } : y))} placeholder="🔺 / 🔵 / #hex" />
                      {sq.tampil.length > 1 && <button className={`${s.btnSm} ${s.danger}`} onClick={() => setPSoal(pSoal.map((y, j) => j === i ? { ...y, tampil: y.tampil.filter((_, m) => m !== k) } : y))}>×</button>}
                    </div>
                  ))}
                  <button className={s.btnSm} style={{ background: '#eee', marginTop: 4 }} onClick={() => setPSoal(pSoal.map((y, j) => j === i ? { ...y, tampil: [...y.tampil, ''] } : y))}>+ item pola</button>
                  <div className={s.row} style={{ marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#2e9e63', fontWeight: 700 }}>Benar (berikutnya):</span>
                    <AsetInput value={sq.benar} onChange={(v) => setPSoal(pSoal.map((y, j) => j === i ? { ...y, benar: v } : y))} />
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--abu)', fontWeight: 700 }}>Pengecoh:</span>
                    {sq.salah.map((it, k) => (
                      <div key={k} className={s.row} style={{ marginTop: 4, gap: 6, alignItems: 'center' }}>
                        <AsetInput value={it} onChange={(v) => setPSoal(pSoal.map((y, j) => j === i ? { ...y, salah: y.salah.map((q, m) => m === k ? v : q) } : y))} />
                        {sq.salah.length > 1 && <button className={`${s.btnSm} ${s.danger}`} onClick={() => setPSoal(pSoal.map((y, j) => j === i ? { ...y, salah: y.salah.filter((_, m) => m !== k) } : y))}>×</button>}
                      </div>
                    ))}
                    <button className={s.btnSm} style={{ background: '#eee', marginTop: 4 }} onClick={() => setPSoal(pSoal.map((y, j) => j === i ? { ...y, salah: [...y.salah, ''] } : y))}>+ pengecoh</button>
                  </div>
                  {pSoal.length > 1 && <button className={`${s.btnSm} ${s.danger}`} style={{ marginTop: 6 }} onClick={() => setPSoal(pSoal.filter((_, j) => j !== i))}>hapus soal</button>}
                </div>
              ))}
              <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setPSoal([...pSoal, { tampil: ['', '', ''], benar: '', salah: [''] }])}>+ soal</button>
            </div>
          )}
        </div>
      )}

      {mesin === 'jalur' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted} style={{ fontSize: 12 }}>Atur grid: pilih mode lalu klik sel. 🐢 = mulai, 🎯 = tujuan, 🧱 = rintangan. Anak menyusun perintah arah agar karakter sampai tujuan.</div>
          <div className={s.row} style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {(['mulai', 'tujuan', 'rintangan'] as const).map((m) => (
              <button key={m} className={s.btnSm} style={{ background: jMode === m ? 'var(--lavender-d)' : '#efe7fb', color: jMode === m ? '#fff' : 'var(--lavender-d)' }} onClick={() => setJMode(m)}>
                {m === 'mulai' ? '🐢 Set Mulai' : m === 'tujuan' ? '🎯 Set Tujuan' : '🧱 Rintangan'}
              </button>
            ))}
          </div>
          {jSoal.map((sq, i) => (
            <div key={i} className={s.card} style={{ background: '#faf7ff' }}>
              <div className={s.row} style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={s.muted} style={{ fontSize: 12 }}>Grid</span>
                <input className={s.inp} type="number" min={2} max={6} value={sq.kolom} onChange={(e) => { const v = Math.max(2, Math.min(6, Number(e.target.value) || 2)); setJSoal(jSoal.map((y, j) => j === i ? { ...y, kolom: v, mulai: [Math.min(y.mulai[0], v - 1), y.mulai[1]], tujuan: [Math.min(y.tujuan[0], v - 1), y.tujuan[1]], rintangan: y.rintangan.filter((r) => r[0] < v) } : y)); }} style={{ width: 56, marginBottom: 0 }} />
                <span className={s.muted}>×</span>
                <input className={s.inp} type="number" min={2} max={6} value={sq.baris} onChange={(e) => { const v = Math.max(2, Math.min(6, Number(e.target.value) || 2)); setJSoal(jSoal.map((y, j) => j === i ? { ...y, baris: v, mulai: [y.mulai[0], Math.min(y.mulai[1], v - 1)], tujuan: [y.tujuan[0], Math.min(y.tujuan[1], v - 1)], rintangan: y.rintangan.filter((r) => r[1] < v) } : y)); }} style={{ width: 56, marginBottom: 0 }} />
                <AsetInput value={sq.karakter} onChange={(v) => setJSoal(jSoal.map((y, j) => j === i ? { ...y, karakter: v } : y))} placeholder="🐢" width={70} />
                <AsetInput value={sq.hadiah} onChange={(v) => setJSoal(jSoal.map((y, j) => j === i ? { ...y, hadiah: v } : y))} placeholder="🎯" width={70} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sq.kolom}, 34px)`, gap: 3, marginTop: 8, justifyContent: 'start' }}>
                {Array.from({ length: sq.baris * sq.kolom }).map((_, idx) => {
                  const x = idx % sq.kolom, y = Math.floor(idx / sq.kolom);
                  const isM = sq.mulai[0] === x && sq.mulai[1] === y;
                  const isT = sq.tujuan[0] === x && sq.tujuan[1] === y;
                  const isR = sq.rintangan.some((r) => r[0] === x && r[1] === y);
                  return (
                    <button key={idx} type="button" onClick={() => setJSoal(jSoal.map((yy, j) => {
                      if (j !== i) return yy;
                      if (jMode === 'mulai') return { ...yy, mulai: [x, y] as [number, number] };
                      if (jMode === 'tujuan') return { ...yy, tujuan: [x, y] as [number, number] };
                      if ((yy.mulai[0] === x && yy.mulai[1] === y) || (yy.tujuan[0] === x && yy.tujuan[1] === y)) return yy;
                      const has = yy.rintangan.some((r) => r[0] === x && r[1] === y);
                      return { ...yy, rintangan: has ? yy.rintangan.filter((r) => !(r[0] === x && r[1] === y)) : [...yy.rintangan, [x, y] as [number, number]] };
                    }))}
                      style={{ width: 34, height: 34, borderRadius: 6, border: '1px solid #e0d8f2', background: isR ? '#cdbff0' : '#fff', fontSize: 18, cursor: 'pointer', padding: 0 }}>
                      {isM ? (sq.karakter || '🐢') : isT ? (sq.hadiah || '🎯') : isR ? '🧱' : ''}
                    </button>
                  );
                })}
              </div>
              {jSoal.length > 1 && <button className={`${s.btnSm} ${s.danger}`} style={{ marginTop: 8 }} onClick={() => setJSoal(jSoal.filter((_, j) => j !== i))}>hapus soal</button>}
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setJSoal([...jSoal, { kolom: 4, baris: 4, mulai: [0, 3], tujuan: [3, 0], rintangan: [], karakter: '🐢', hadiah: '🎯' }])}>+ soal</button>
        </div>
      )}

      {mesin === 'hitung' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted} style={{ fontSize: 12 }}>Tiap simbol punya <b>nilai angka</b>. Lalu buat soal: simbol {'{operasi}'} simbol → anak pilih hasilnya. (Untuk −, nilai kiri harus ≥ kanan.)</div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', marginTop: 8 }}>Legenda angka</div>
          {hLeg.map((m, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6, gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <AsetInput value={m.simbol} onChange={(v) => setHLeg(hLeg.map((y, j) => j === i ? { ...y, simbol: v } : y))} placeholder="🍎 / #hex" />
              <span className={s.muted}>=</span>
              <input className={s.inp} type="number" placeholder="angka" value={m.nilai} onChange={(e) => setHLeg(hLeg.map((y, j) => j === i ? { ...y, nilai: e.target.value } : y))} style={{ width: 90, marginBottom: 0 }} />
              {hLeg.length > 1 && <button className={`${s.btnSm} ${s.danger}`} onClick={() => setHLeg(hLeg.filter((_, j) => j !== i))}>×</button>}
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setHLeg([...hLeg, { simbol: '', nilai: '' }])}>+ legenda</button>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', marginTop: 12 }}>Soal (pilih simbol dari legenda)</div>
          {hSoal.map((sq, i) => {
            const opsiSimbol = hLeg.filter((m) => m.simbol.trim());
            return (
              <div key={i} className={s.row} style={{ marginTop: 6, gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <select className={s.inp} value={sq.kiri} onChange={(e) => setHSoal(hSoal.map((y, j) => j === i ? { ...y, kiri: e.target.value } : y))} style={{ marginBottom: 0 }}>
                  <option value="">—</option>{opsiSimbol.map((m, k) => <option key={k} value={m.simbol}>{m.simbol} ({m.nilai})</option>)}
                </select>
                <select className={s.inp} value={sq.operasi} onChange={(e) => setHSoal(hSoal.map((y, j) => j === i ? { ...y, operasi: e.target.value as '+' | '-' } : y))} style={{ width: 60, marginBottom: 0 }}>
                  <option value="+">+</option><option value="-">−</option>
                </select>
                <select className={s.inp} value={sq.kanan} onChange={(e) => setHSoal(hSoal.map((y, j) => j === i ? { ...y, kanan: e.target.value } : y))} style={{ marginBottom: 0 }}>
                  <option value="">—</option>{opsiSimbol.map((m, k) => <option key={k} value={m.simbol}>{m.simbol} ({m.nilai})</option>)}
                </select>
                <span className={s.muted}>= ?</span>
                {hSoal.length > 1 && <button className={`${s.btnSm} ${s.danger}`} onClick={() => setHSoal(hSoal.filter((_, j) => j !== i))}>×</button>}
              </div>
            );
          })}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setHSoal([...hSoal, { kiri: '', kanan: '', operasi: '+' }])}>+ soal</button>
        </div>
      )}

      {mesin === 'cocokkan' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted} style={{ fontSize: 12 }}>Tiap baris = 1 pasangan (kiri ↔ kanan). Di game, kolom kanan diacak & anak memasangkannya. Minimal 2 pasangan. Isi bisa emoji/gambar/warna #hex/teks.</div>
          {cocokPairs.map((pr, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6, gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <AsetInput value={pr.kiri} onChange={(v) => setCocokPairs(cocokPairs.map((y, j) => j === i ? { ...y, kiri: v } : y))} placeholder="kiri" />
              <span className={s.muted}>↔</span>
              <AsetInput value={pr.kanan} onChange={(v) => setCocokPairs(cocokPairs.map((y, j) => j === i ? { ...y, kanan: v } : y))} placeholder="kanan" />
              {cocokPairs.length > 2 && <button className={`${s.btnSm} ${s.danger}`} onClick={() => setCocokPairs(cocokPairs.filter((_, j) => j !== i))}>×</button>}
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setCocokPairs([...cocokPairs, { kiri: '', kanan: '' }])}>+ pasangan</button>
        </div>
      )}

      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>{err}</div>}
      <button className={s.btn} style={{ marginTop: 10 }} onClick={simpan}>{editId ? '💾 Simpan perubahan' : '💾 Simpan paket'}</button>
    </div>
  );
}
