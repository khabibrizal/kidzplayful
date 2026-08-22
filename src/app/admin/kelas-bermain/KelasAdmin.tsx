// src/app/admin/kelas-bermain/KelasAdmin.tsx
'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { buatKelas, updateKelas, toggleStatusKelas, hapusKelas, setBolehTrialKelas, type KelasInput } from '@/lib/data/kelas-bermain-actions';
import type { KelasBermain } from '@/lib/game/tipe';
import { kompresGambar } from '@/lib/img';
import s from '../admin.module.css';

const KOSONG: KelasInput = {
  judul: '',
  tujuan: '',
  sampulUrl: '',
  fokusArea: [],
  peranOrtu: '',
  kategoriUsiaId: '',
  usiaMin: 0,
  usiaMax: 6,
  bahan: [{ nama: '', link: '', produkId: '' }],
  aktivitas: [{ judul: '', caraMembuat: '', langkah: [''], catatanOrtu: '', evaluasi: [], gamePaketId: '' }],
  linkIde: '',
  worksheetUrl: null,
  bulanKurikulum: 1,
  urutan: 0,
};

export default function KelasAdmin({ awal, produkOpsi = [], areaOpsi = [], opsiGame = [], kategoriOpsi = [] }: {
  awal: KelasBermain[];
  produkOpsi?: { id: string; nama: string }[];
  areaOpsi?: { key: string; label: string }[];
  opsiGame?: { id: string; judul: string; area_skill: string; tema: string }[];
  /** master Kategori Usia (0079) — sama dengan yang dipakai form Game */
  kategoriOpsi?: { id: string; nama: string; usia_min: number; usia_max: number }[];
}) {
  const [list, setList] = useState<KelasBermain[]>(awal);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<KelasInput | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2200); }
  const tampil = list.filter((k) => k.judul.toLowerCase().includes(q.toLowerCase()));
  // Dihitung dari materi AKTIF saja: materi nonaktif tak tampil ke orang tua, jadi tak
  // ikut memenuhi kuota 4 tema sebulan.
  const perBulan = new Map<number, number>();
  for (const k of list) {
    if (k.status !== 'aktif' || typeof k.bulan_kurikulum !== 'number') continue;
    perBulan.set(k.bulan_kurikulum, (perBulan.get(k.bulan_kurikulum) ?? 0) + 1);
  }
  const peringatanBulan = [...perBulan.entries()].filter(([, n]) => n !== 4).sort((a, b) => a[0] - b[0]);

  // Posisi kurikulum yang sudah dipakai tema AKTIF lain (materi yang sedang diedit tak
  // dihitung — ia berhak mempertahankan posisinya sendiri).
  const terpakai = (bulan: number) => list
    .filter((k) => k.status === 'aktif' && k.id !== editId && (k.bulan_kurikulum ?? 1) === bulan)
    .map((k) => k.urutan ?? 0);
  const urutanBebas = (bulan: number) => {
    const ada = new Set(terpakai(bulan));
    let u = 0;
    while (ada.has(u)) u++;
    return u;
  };
  const terpakaiBulanIni = form ? [...new Set(terpakai(form.bulanKurikulum))].sort((a, b) => a - b) : [];

  function bukaTambah() { setEditId(null); setForm(structuredClone(KOSONG)); }
  function bukaEdit(k: KelasBermain) {
    setEditId(k.id);
    setForm({
      judul: k.judul,
      sampulUrl: k.sampul_url ?? '',
      tujuan: k.tujuan ?? '',
      fokusArea: k.fokus_area ?? [],
      peranOrtu: k.peran_ortu ?? '',
      // Materi lama tanpa `kategori_usia_id` dicocokkan dari rentangnya, sama seperti
      // form Game (0079) — supaya dropdown tak tampil kosong padahal usianya terisi.
      kategoriUsiaId: k.kategori_usia_id
        ?? kategoriOpsi.find((x) => x.usia_min === (k.usia_min ?? -1) && x.usia_max === (k.usia_max ?? -1))?.id
        ?? '',
      usiaMin: k.usia_min ?? 0,
      usiaMax: k.usia_max ?? 6,
      bahan: k.bahan?.length ? k.bahan.map((b) => ({ nama: b.nama, link: b.link ?? '', produkId: b.produk_id ?? '' })) : [{ nama: '', link: '', produkId: '' }],
      aktivitas: k.aktivitas?.length
        ? k.aktivitas.map((a) => ({
          judul: a.judul, caraMembuat: a.cara_membuat ?? '',
          langkah: a.langkah?.length ? a.langkah : [''], catatanOrtu: a.catatan_ortu ?? '',
          evaluasi: a.evaluasi ?? [], gamePaketId: a.game_paket_id ?? '',
        }))
        : [{ judul: '', caraMembuat: '', langkah: [''], catatanOrtu: '', evaluasi: [], gamePaketId: '' }],
      linkIde: k.link_ide ?? '',
      worksheetUrl: k.worksheet_url,
      // Materi lama belum punya kolom 0098 → bawaan bulan ke-1, bukan 0 (bulan 0 tak ada).
      bulanKurikulum: k.bulan_kurikulum ?? 1,
      urutan: k.urutan ?? 0,
    });
  }

  // --- helper update nested state ---
  function setBahan(i: number, patch: Partial<{ nama: string; link: string; produkId: string }>) {
    if (!form) return;
    setForm({ ...form, bahan: form.bahan.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  }
  function tambahBahan() { if (form) setForm({ ...form, bahan: [...form.bahan, { nama: '', link: '', produkId: '' }] }); }
  function hapusBahan(i: number) { if (form) setForm({ ...form, bahan: form.bahan.filter((_, j) => j !== i) }); }

  function setAkt(ai: number, patch: Partial<{ judul: string; caraMembuat: string; catatanOrtu: string; gamePaketId: string }>) {
    if (!form) return;
    setForm({ ...form, aktivitas: form.aktivitas.map((a, j) => (j === ai ? { ...a, ...patch } : a)) });
  }
  function tambahAktivitas() { if (form) setForm({ ...form, aktivitas: [...form.aktivitas, { judul: '', caraMembuat: '', langkah: [''], catatanOrtu: '', evaluasi: [], gamePaketId: '' }] }); }
  // Baris evaluasi mengikuti pola `langkah` yang sudah ada di berkas ini — sengaja tidak
  // membuat pola baru untuk hal yang sama.
  function setEvaluasi(ai: number, ei: number, val: string) {
    if (!form) return;
    setForm({ ...form, aktivitas: form.aktivitas.map((a, j) => (j === ai ? { ...a, evaluasi: a.evaluasi.map((x, k) => (k === ei ? val : x)) } : a)) });
  }
  function tambahEvaluasi(ai: number) {
    if (!form) return;
    setForm({ ...form, aktivitas: form.aktivitas.map((a, j) => (j === ai ? { ...a, evaluasi: [...a.evaluasi, ''] } : a)) });
  }
  function hapusEvaluasi(ai: number, ei: number) {
    if (!form) return;
    setForm({ ...form, aktivitas: form.aktivitas.map((a, j) => (j === ai ? { ...a, evaluasi: a.evaluasi.filter((_, k) => k !== ei) } : a)) });
  }
  function hapusAktivitas(ai: number) { if (form) setForm({ ...form, aktivitas: form.aktivitas.filter((_, j) => j !== ai) }); }
  function setLangkah(ai: number, li: number, val: string) {
    if (!form) return;
    setForm({ ...form, aktivitas: form.aktivitas.map((a, j) => (j === ai ? { ...a, langkah: a.langkah.map((x, k) => (k === li ? val : x)) } : a)) });
  }
  function tambahLangkah(ai: number) {
    if (!form) return;
    setForm({ ...form, aktivitas: form.aktivitas.map((a, j) => (j === ai ? { ...a, langkah: [...a.langkah, ''] } : a)) });
  }
  function hapusLangkah(ai: number, li: number) {
    if (!form) return;
    setForm({ ...form, aktivitas: form.aktivitas.map((a, j) => (j === ai ? { ...a, langkah: a.langkah.filter((_, k) => k !== li) } : a)) });
  }

  async function unggahPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !form) return;
    setLoading(true);
    try {
      const sb = createClient();
      const path = `worksheet/${Date.now()}-${Math.floor(performance.now())}.pdf`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false });
      if (error) throw error;
      setForm({ ...form, worksheetUrl: sb.storage.from('aset').getPublicUrl(path).data.publicUrl });
      flash('Worksheet terunggah ✓');
    } catch (e2) { flash(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function unggahCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !form) return;
    setLoading(true);
    try {
      const sb = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 1280, kualitas: 0.82 });
      const path = `kelas/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
      if (error) throw error;
      setForm({ ...form, sampulUrl: sb.storage.from('aset').getPublicUrl(path).data.publicUrl });
      flash('Cover terunggah ✓');
    } catch (e2) { flash(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setLoading(false); if (coverRef.current) coverRef.current.value = ''; }
  }

  async function simpan() {
    if (!form) return;
    if (!form.judul.trim()) { flash('Judul wajib diisi.'); return; }
    setLoading(true);
    try {
      if (editId) {
        const r = await updateKelas(editId, form);
        if (!r.ok || !r.kelas) { flash(r.error ?? 'Gagal menyimpan'); return; }
        setList(list.map((k) => (k.id === editId ? r.kelas! : k)));
        flash('Tersimpan ✓');
      } else {
        const r = await buatKelas(form);
        if (!r.ok || !r.kelas) { flash(r.error ?? 'Gagal menyimpan'); return; }
        setList([r.kelas, ...list]);
        flash('Kelas bermain ditambahkan ✓');
      }
      setForm(null); setEditId(null);
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setLoading(false); }
  }

  async function toggle(k: KelasBermain) {
    setBusyId(k.id);
    const baru = k.status === 'aktif' ? 'nonaktif' : 'aktif';
    try { await toggleStatusKelas(k.id, baru); setList(list.map((x) => (x.id === k.id ? { ...x, status: baru } : x))); flash(baru === 'aktif' ? 'Diaktifkan ✓' : 'Dinonaktifkan ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }
  async function toggleTrial(k: KelasBermain) {
    setBusyId(k.id);
    const baru = k.boleh_trial === false; // toggle
    try { await setBolehTrialKelas(k.id, baru); setList(list.map((x) => (x.id === k.id ? { ...x, boleh_trial: baru } : x))); flash(baru ? 'Boleh diakses trial ✓' : 'Terkunci untuk trial 🔒'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }
  async function hapus(k: KelasBermain) {
    if (!confirm(`Hapus "${k.judul}"?`)) return;
    setBusyId(k.id);
    try { await hapusKelas(k.id); setList(list.filter((x) => x.id !== k.id)); flash('Dihapus ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div className={s.row} style={{ gap: 8, marginBottom: 12 }}>
        <input className={s.inp} placeholder="Cari judul..." value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
        <button className={s.btn} onClick={bukaTambah}>+ Tambah Ide Bermain</button>
      </div>

      {form && (
        <div className={s.card} style={{ border: '2px solid var(--lavender)' }}>
          <b>{editId ? 'Edit' : 'Tambah'} Ide Bermain</b>

          <input className={s.inp} placeholder="Judul kelas" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} style={{ width: '100%', marginTop: 8 }} />

          <div className={s.row} style={{ gap: 8, alignItems: 'center', marginTop: 8 }}>
            <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => coverRef.current?.click()} disabled={loading}>{loading ? '...' : '⬆ Gambar Cover'}</button>
            {form.sampulUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.sampulUrl} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                <button type="button" className={s.btnSm} style={{ background: '#eee' }} onClick={() => setForm({ ...form, sampulUrl: '' })}>Hapus</button>
              </>
            )}
            <span className={s.muted} style={{ fontSize: 11 }}>untuk share Story & teaser</span>
            <input ref={coverRef} type="file" accept="image/*" hidden onChange={unggahCover} />
          </div>

          {/* TUJUAN + USIA */}
          <textarea className={s.inp} placeholder="🎯 Tujuan ide bermain ini (mis. melatih motorik halus & mengenal warna) — tampil ke orang tua" rows={2} value={form.tujuan} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
          {/* Usia dipilih lewat KATEGORI dari master (0079/0101), sama seperti form Game.
              Rentangnya tetap di-snapshot ke `usia_min/max` karena penyaringan usia anak
              membacanya di banyak tempat. */}
          <div className={s.row} style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={s.muted} style={{ fontSize: 12 }}>👶 Kategori usia:</span>
            <select className={s.inp} value={form.kategoriUsiaId} onChange={(e) => {
              const k = kategoriOpsi.find((x) => x.id === e.target.value);
              setForm({
                ...form,
                kategoriUsiaId: e.target.value,
                ...(k ? { usiaMin: k.usia_min, usiaMax: k.usia_max } : {}),
              });
            }} style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
              <option value="">— pilih kategori —</option>
              {kategoriOpsi.map((k) => <option key={k.id} value={k.id}>{k.nama} ({k.usia_min}–{k.usia_max} th)</option>)}
            </select>
            {form.kategoriUsiaId && <span className={s.muted} style={{ fontSize: 11 }}>usia {form.usiaMin}–{form.usiaMax} th</span>}
          </div>
          {kategoriOpsi.length === 0 && (
            <div className={s.muted} style={{ fontSize: 11, color: '#b3261e' }}>
              Belum ada kategori usia — tambah dulu di menu 👶 Kategori Usia.
            </div>
          )}
          {!form.kategoriUsiaId && kategoriOpsi.length > 0 && (
            <div className={s.muted} style={{ fontSize: 11 }}>
              Belum dipilih — materi ini memakai rentang lamanya: usia {form.usiaMin}–{form.usiaMax} th.
            </div>
          )}

          {/* KURIKULUM: bulan keberapa tema ini terbuka untuk seorang anak. Ditulis
              eksplisit, bukan diturunkan dari urutan — lihat 0098. */}
          <div className={s.row} style={{ gap: 6, alignItems: 'center' }}>
            <span className={s.muted} style={{ fontSize: 12 }}>📚 Kurikulum bulan ke-</span>
            <input className={s.inp} type="number" min={1} value={form.bulanKurikulum}
              onChange={(e) => {
                const bulan = Number(e.target.value);
                // Saat pindah bulan, urutan otomatis melompat ke slot BEBAS pertama —
                // posisi kurikulum bersifat unik (0102), dan menabraknya hanya berujung
                // galat saat menyimpan.
                setForm({ ...form, bulanKurikulum: bulan, urutan: urutanBebas(bulan) });
              }} style={{ width: 70, marginBottom: 0 }} />
            <span className={s.muted} style={{ fontSize: 12 }}>· urutan</span>
            <input className={s.inp} type="number" min={0} value={form.urutan}
              onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) })} style={{ width: 70, marginBottom: 0 }} />
            <span className={s.muted} style={{ fontSize: 11 }}>tampil setelah anak masuk bulan itu</span>
          </div>
          {/* Posisi yang sudah dipakai tema AKTIF lain — ditunjukkan SEBELUM menyimpan,
              supaya admin tak perlu menabrak galat untuk mengetahuinya. */}
          {terpakaiBulanIni.length > 0 && (
            <div className={s.muted} style={{ fontSize: 11 }}>
              Urutan yang sudah dipakai di bulan {form.bulanKurikulum}: {terpakaiBulanIni.join(', ')}
              {terpakaiBulanIni.includes(form.urutan) && (
                <b style={{ color: '#b3261e' }}> — urutan {form.urutan} bentrok, ganti dulu.</b>
              )}
            </div>
          )}

          {/* FOKUS AREA + PERAN ORTU */}
          <div className={s.muted} style={{ margin: '10px 0 4px', fontSize: 12 }}>🧩 Fokus area perkembangan (bisa pilih lebih dari satu — kelola daftarnya di menu 🧩 Fokus Area):</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {areaOpsi.map((ar) => {
              const on = form.fokusArea.includes(ar.key);
              return (
                <button key={ar.key} type="button"
                  onClick={() => setForm({ ...form, fokusArea: on ? form.fokusArea.filter((x) => x !== ar.key) : [...form.fokusArea, ar.key] })}
                  style={{ border: 'none', cursor: 'pointer', borderRadius: 99, padding: '6px 12px', fontSize: 12, fontWeight: 700, background: on ? 'var(--lavender-d)' : '#f1eef8', color: on ? '#fff' : 'var(--abu)' }}>
                  {ar.label}
                </button>
              );
            })}
          </div>
          <textarea className={s.inp} placeholder="🤝 Peran orang tua dalam ide bermain ini (mis. mendampingi, membacakan instruksi, memuji usaha anak) — tampil ke orang tua" rows={2} value={form.peranOrtu} onChange={(e) => setForm({ ...form, peranOrtu: e.target.value })} style={{ width: '100%', resize: 'vertical', marginTop: 8 }} />

          {/* BAHAN (nama + link toko opsional) */}
          <div className={s.muted} style={{ margin: '8px 0 4px' }}>🧺 Bahan (boleh hubungkan ke produk Store, atau pakai link toko luar):</div>
          {form.bahan.map((b, i) => (
            <div key={i} style={{ marginTop: 6, padding: 8, background: '#faf7ff', borderRadius: 10 }}>
              <div className={s.row} style={{ gap: 6 }}>
                <input className={s.inp} placeholder="Nama bahan" value={b.nama} onChange={(e) => setBahan(i, { nama: e.target.value })} style={{ flex: 1, marginBottom: 0 }} />
                <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => hapusBahan(i)} title="Hapus bahan">✕</button>
              </div>
              <select className={s.inp} value={b.produkId} onChange={(e) => setBahan(i, { produkId: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                <option value="">— Beli di Store: tidak dihubungkan —</option>
                {produkOpsi.map((p) => <option key={p.id} value={p.id}>🛒 {p.nama}</option>)}
              </select>
              {!b.produkId && (
                <input className={s.inp} placeholder="atau Link toko luar (opsional)" value={b.link} onChange={(e) => setBahan(i, { link: e.target.value })} style={{ width: '100%', marginTop: 4 }} />
              )}
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={tambahBahan}>+ tambah bahan</button>

          {/* AKTIVITAS (grup: judul + cara membuat + langkah masing-masing) */}
          <div className={s.muted} style={{ margin: '12px 0 4px' }}>Aktivitas:</div>
          {form.aktivitas.map((a, ai) => (
            <div key={ai} className={s.card} style={{ background: '#faf7ff', marginTop: 6 }}>
              <div className={s.row}>
                <b style={{ flex: 1 }}>Aktivitas {ai + 1}</b>
                <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapusAktivitas(ai)} title="Hapus aktivitas">✕</button>
              </div>
              <input className={s.inp} placeholder="Judul aktivitas" value={a.judul} onChange={(e) => setAkt(ai, { judul: e.target.value })} style={{ width: '100%', marginTop: 6 }} />
              <textarea className={s.inp} placeholder="Cara membuat" rows={2} value={a.caraMembuat} onChange={(e) => setAkt(ai, { caraMembuat: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
              <div className={s.muted} style={{ margin: '4px 0' }}>Langkah:</div>
              {a.langkah.map((l, li) => (
                <div key={li} className={s.row} style={{ marginTop: 4 }}>
                  <span className={s.muted}>{li + 1}.</span>
                  <input className={s.inp} value={l} placeholder="langkah..." onChange={(e) => setLangkah(ai, li, e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
                  <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => hapusLangkah(ai, li)} title="Hapus langkah">✕</button>
                </div>
              ))}
              <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => tambahLangkah(ai)}>+ langkah</button>
              <textarea className={s.inp} placeholder="💡 Catatan untuk orang tua (mis. dampingi anak saat menggunting) — tampil di halaman user" rows={2} value={a.catatanOrtu} onChange={(e) => setAkt(ai, { catatanOrtu: e.target.value })} style={{ width: '100%', resize: 'vertical', marginTop: 8 }} />

              {/* BUTIR EVALUASI: kalimat yang nanti dicentang orang tua & masuk rapor. */}
              <div className={s.muted} style={{ margin: '8px 0 4px', fontWeight: 700 }}>📋 Butir evaluasi</div>
              {a.evaluasi.map((ev, ei) => (
                <div key={ei} className={s.row} style={{ marginTop: 4 }}>
                  <span className={s.muted}>•</span>
                  <input className={s.inp} value={ev} placeholder="mis. Anak mau memegang manik tanpa dibantu"
                    onChange={(e) => setEvaluasi(ai, ei, e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
                  <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => hapusEvaluasi(ai, ei)} title="Hapus butir">✕</button>
                </div>
              ))}
              <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => tambahEvaluasi(ai)}>+ butir evaluasi</button>

              {/* GAME: OPSIONAL — pilihan pertama sengaja "tanpa game". */}
              <div className={s.muted} style={{ margin: '10px 0 4px', fontWeight: 700 }}>🎮 Game untuk aktivitas ini <span style={{ fontWeight: 400 }}>(opsional)</span></div>
              <select className={s.inp} value={a.gamePaketId} onChange={(e) => setAkt(ai, { gamePaketId: e.target.value })} style={{ width: '100%', marginBottom: 0 }}>
                <option value="">— tanpa game —</option>
                {opsiGame.map((g) => <option key={g.id} value={g.id}>{g.tema} · {g.judul} ({g.area_skill})</option>)}
              </select>
              {opsiGame.length === 0 && (
                <div className={s.muted} style={{ fontSize: 11, marginTop: 4 }}>Belum ada game disetujui untuk dipilih.</div>
              )}
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43', marginTop: 8 }} onClick={tambahAktivitas}>+ tambah aktivitas</button>

          <input className={s.inp} placeholder="Link YouTube / referensi (link YouTube tampil sbg video embed)" value={form.linkIde} onChange={(e) => setForm({ ...form, linkIde: e.target.value })} style={{ width: '100%', marginTop: 12 }} />
          <div className={s.row} style={{ marginTop: 6 }}>
            <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => fileRef.current?.click()} disabled={loading}>{loading ? '...' : '⬆ Worksheet PDF'}</button>
            {form.worksheetUrl && <a className={s.muted} href={form.worksheetUrl} target="_blank" style={{ color: 'var(--biru-d)' }}>lihat PDF</a>}
            <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={unggahPdf} />
          </div>
          <div className={s.row} style={{ marginTop: 10 }}>
            <button className={s.btn} onClick={simpan} disabled={loading}>{loading ? 'Menyimpan...' : '💾 Simpan'}</button>
            <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => { setForm(null); setEditId(null); }} disabled={loading}>Batal</button>
          </div>
        </div>
      )}

      <div className={s.section}>Daftar ({tampil.length})</div>
      {/* "4 tema per bulan" adalah aturan ISI, bukan hukum kode: memaksanya di kode akan
          menyembunyikan tema ke-5 tanpa jejak. Jadi bulan yang tak berisi 4 diperingatkan
          di sini, dan admin yang memutuskan. */}
      {peringatanBulan.map(([b, n]) => (
        <div key={b} className={s.muted} style={{ fontSize: 12, color: '#b88600' }}>
          ⚠️ Bulan {b}: {n} tema aktif (kurikulum dirancang 4 tema/bulan)
        </div>
      ))}
      {tampil.map((k) => (
        <div key={k.id} className={s.card} style={{ opacity: k.status === 'nonaktif' ? 0.55 : 1 }}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{k.judul}</b> {k.status === 'nonaktif' && <span className={`${s.tag} ${s.tagDraf}`}>nonaktif</span>}
              {k.boleh_trial === false && <span className={`${s.tag} ${s.tagDraf}`} style={{ marginLeft: 4 }}>🔒 non-trial</span>}
              <br /><small className={s.muted}>👶 {k.usia_min ?? 0}–{k.usia_max ?? 6} th{typeof k.bulan_kurikulum === 'number' ? ` · 📚 bulan ke-${k.bulan_kurikulum}` : ''}</small>
            </span>
          </div>
          <div className={s.row} style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => bukaEdit(k)} disabled={busyId === k.id}>Edit</button>
            <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => toggle(k)} disabled={busyId === k.id}>{busyId === k.id ? '...' : (k.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan')}</button>
            <button className={s.btnSm} style={{ background: k.boleh_trial === false ? '#eee' : '#dff5e6', color: k.boleh_trial === false ? '#888' : '#1c7a43' }} onClick={() => toggleTrial(k)} disabled={busyId === k.id} title="Boleh diakses user trial?">{k.boleh_trial === false ? 'Trial ✗' : 'Trial ✓'}</button>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(k)} disabled={busyId === k.id}>Hapus</button>
          </div>
        </div>
      ))}
      {tampil.length === 0 && <p className={s.muted}>Belum ada ide bermain{q ? ' yang cocok' : ''}.</p>}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
