// src/app/admin/paket/PaketAdmin.tsx — CRUD master paket langganan (client).
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buatPaket, updatePaket, toggleAktifPaket, type InputPaket } from '@/lib/data/paket-actions';
import type { PaketLangganan, AturanKeluarga, SatuanKuota } from '@/lib/game/tipe';
import { formatRupiah } from '@/lib/format';
import s from '../admin.module.css';

const KOSONG: InputPaket = {
  kode: '', nama: '', deskripsi: '', benefit: [''], hargaBulanan: 0, diskonKeluarga: [],
  aksesIdeBermain: true, aksesGame: true, aksesVideo: true, aksesKomunitas: true,
  worksheet: false, worksheetKuota: 0, worksheetSatuan: 'bulan',
  konsultasiJumlah: 0, konsultasiSatuan: 'bulan', raporBulanan: false,
  urutan: 10, aktif: true,
};

const dariPaket = (p: PaketLangganan): InputPaket => ({
  kode: p.kode, nama: p.nama, deskripsi: p.deskripsi ?? '',
  benefit: p.benefit?.length ? [...p.benefit] : [''],
  hargaBulanan: p.harga_bulanan, diskonKeluarga: p.diskon_keluarga ?? [],
  aksesIdeBermain: p.akses_ide_bermain, aksesGame: p.akses_game, aksesVideo: p.akses_video,
  aksesKomunitas: p.akses_komunitas, worksheet: p.worksheet,
  worksheetKuota: p.worksheet_kuota_jumlah ?? 0, worksheetSatuan: p.worksheet_kuota_satuan ?? 'bulan',
  konsultasiJumlah: p.konsultasi_gratis_jumlah, konsultasiSatuan: p.konsultasi_gratis_satuan,
  raporBulanan: p.rapor_bulanan, urutan: p.urutan, aktif: p.aktif,
});

function Sakelar({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />{label}
    </label>
  );
}

function Form({ nilai, set, kodeTerkunci }: { nilai: InputPaket; set: (v: InputPaket) => void; kodeTerkunci: boolean }) {
  const ubah = <K extends keyof InputPaket>(k: K, v: InputPaket[K]) => set({ ...nilai, [k]: v });
  const ubahAturan = (i: number, a: Partial<AturanKeluarga>) =>
    ubah('diskonKeluarga', nilai.diskonKeluarga.map((r, j) => (j === i ? { ...r, ...a } : r)));

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className={s.row} style={{ gap: 8, flexWrap: 'wrap' }}>
        <input className={s.inp} placeholder="kode (basic)" value={nilai.kode} disabled={kodeTerkunci}
          onChange={(e) => ubah('kode', e.target.value)} style={{ width: 140, marginBottom: 0 }} />
        <input className={s.inp} placeholder="Nama tampil (Basic)" value={nilai.nama}
          onChange={(e) => ubah('nama', e.target.value)} style={{ flex: 1, minWidth: 160, marginBottom: 0 }} />
        <input className={s.inp} type="number" min={0} placeholder="Harga / anak / bulan" value={nilai.hargaBulanan || ''}
          onChange={(e) => ubah('hargaBulanan', Number(e.target.value) || 0)} style={{ width: 170, marginBottom: 0 }} />
        <input className={s.inp} type="number" placeholder="urutan" value={nilai.urutan}
          onChange={(e) => ubah('urutan', Number(e.target.value) || 0)} style={{ width: 90, marginBottom: 0 }}
          title="Makin besar = paket makin tinggi" />
      </div>
      {kodeTerkunci && (
        <div className={s.muted} style={{ fontSize: 11, marginTop: -4 }}>
          Kode tak bisa diubah — nilainya tersimpan di pengaturan diskon tiap event &amp; produk.
        </div>
      )}
      <textarea className={s.inp} rows={2} placeholder="Deskripsi singkat (tampil di halaman pilih paket)"
        value={nilai.deskripsi} onChange={(e) => ubah('deskripsi', e.target.value)}
        style={{ width: '100%', resize: 'vertical', marginBottom: 0 }} />

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>✅ Daftar fasilitas (tampil ke orang tua)</div>
        {nilai.benefit.map((b, i) => (
          <div key={i} className={s.row} style={{ gap: 6, marginBottom: 4 }}>
            <input className={s.inp} value={b} placeholder="mis. Unduh semua worksheet"
              onChange={(e) => ubah('benefit', nilai.benefit.map((x, j) => (j === i ? e.target.value : x)))}
              style={{ flex: 1, marginBottom: 0 }} />
            <button type="button" className={s.btnSm} style={{ background: '#eee' }}
              onClick={() => ubah('benefit', nilai.benefit.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}
          onClick={() => ubah('benefit', [...nilai.benefit, ''])}>+ Fasilitas</button>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>👨‍👩‍👧‍👦 Diskon keluarga</div>
        <div className={s.muted} style={{ fontSize: 11, marginBottom: 6 }}>
          Berlaku bila jumlah anak yang dilanggankan mencapai batasnya. Aturan dengan batas TERBESAR yang
          terpenuhi yang dipakai. Tiap aturan memakai <b>satu jenis</b> potongan: persen <b>atau</b> rupiah.
        </div>
        {nilai.diskonKeluarga.map((r, i) => (
          <div key={i} className={s.row} style={{ gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span className={s.muted} style={{ fontSize: 12 }}>mulai</span>
            <input className={s.inp} type="number" min={2} value={r.min_anak}
              onChange={(e) => ubahAturan(i, { min_anak: Number(e.target.value) || 2 })} style={{ width: 70, marginBottom: 0 }} />
            <span className={s.muted} style={{ fontSize: 12 }}>anak →</span>
            {/* Jenis potongan dipilih EKSPLISIT, lalu satu field nilai — supaya mustahil
                mengisi persen dan rupiah sekaligus (dulu bisa, dan rupiahnya diam-diam
                tak berlaku karena rumusnya mendahulukan persen). */}
            <select className={s.inp} value={r.nominal != null ? 'nominal' : 'persen'} style={{ width: 110, marginBottom: 0 }}
              onChange={(e) => ubahAturan(i, e.target.value === 'persen'
                ? { persen: r.nominal ?? 0, nominal: undefined }
                : { nominal: r.persen ?? 0, persen: undefined })}>
              <option value="persen">Persen (%)</option>
              <option value="nominal">Rupiah</option>
            </select>
            {r.nominal != null
              ? <input className={s.inp} type="number" min={0} placeholder="Rp" value={r.nominal}
                  onChange={(e) => ubahAturan(i, { nominal: Number(e.target.value) || 0, persen: undefined })}
                  style={{ width: 130, marginBottom: 0 }} />
              : <input className={s.inp} type="number" min={0} max={100} placeholder="%" value={r.persen ?? ''}
                  onChange={(e) => ubahAturan(i, { persen: Number(e.target.value) || 0, nominal: undefined })}
                  style={{ width: 90, marginBottom: 0 }} />}
            <button type="button" className={s.btnSm} style={{ background: '#eee' }}
              onClick={() => ubah('diskonKeluarga', nilai.diskonKeluarga.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}
          onClick={() => ubah('diskonKeluarga', [...nilai.diskonKeluarga, { min_anak: 2, persen: 10 }])}>+ Aturan</button>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🔑 Fasilitas yang dibuka</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Sakelar label="Ide Bermain" on={nilai.aksesIdeBermain} set={(v) => ubah('aksesIdeBermain', v)} />
          <Sakelar label="Game edukasi" on={nilai.aksesGame} set={(v) => ubah('aksesGame', v)} />
          <Sakelar label="Pojok Video" on={nilai.aksesVideo} set={(v) => ubah('aksesVideo', v)} />
          <Sakelar label="Komunitas" on={nilai.aksesKomunitas} set={(v) => ubah('aksesKomunitas', v)} />
          <Sakelar label="Unduh worksheet" on={nilai.worksheet} set={(v) => ubah('worksheet', v)} />
          <Sakelar label="Rapor bulanan" on={nilai.raporBulanan} set={(v) => ubah('raporBulanan', v)} />
        </div>
      </div>

      <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>📄 Kuota unduh worksheet</span>
        <input className={s.inp} type="number" min={0} value={nilai.worksheetKuota} disabled={!nilai.worksheet}
          onChange={(e) => ubah('worksheetKuota', Number(e.target.value) || 0)} style={{ width: 80, marginBottom: 0 }} />
        <select className={s.inp} value={nilai.worksheetSatuan} disabled={!nilai.worksheet}
          onChange={(e) => ubah('worksheetSatuan', e.target.value as SatuanKuota)} style={{ width: 190, marginBottom: 0 }}>
          <option value="bulan">unduhan per bulan</option>
          <option value="langganan">unduhan sekali per langganan</option>
        </select>
        <span className={s.muted} style={{ fontSize: 11 }}>
          {!nilai.worksheet ? 'aktifkan "Unduh worksheet" dulu' : nilai.worksheetKuota === 0 ? '0 = tanpa batas' : ''}
        </span>
      </div>

      <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>🧠 Konsultasi gratis</span>
        <input className={s.inp} type="number" min={0} value={nilai.konsultasiJumlah}
          onChange={(e) => ubah('konsultasiJumlah', Number(e.target.value) || 0)} style={{ width: 80, marginBottom: 0 }} />
        <select className={s.inp} value={nilai.konsultasiSatuan}
          onChange={(e) => ubah('konsultasiSatuan', e.target.value as SatuanKuota)} style={{ width: 190, marginBottom: 0 }}>
          <option value="bulan">sesi per bulan</option>
          <option value="langganan">sesi sekali per langganan</option>
        </select>
        <Sakelar label="Paket aktif" on={nilai.aktif} set={(v) => ubah('aktif', v)} />
      </div>
    </div>
  );
}

export default function PaketAdmin({ awal }: { awal: PaketLangganan[] }) {
  const router = useRouter();
  const [baru, setBaru] = useState<InputPaket>(KOSONG);
  const [bukaTambah, setBukaTambah] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<InputPaket>(KOSONG);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2600); }

  async function tambah() {
    setBusy('tambah');
    const r = await buatPaket(baru);
    setBusy(null);
    if (r.ok) { setBaru(KOSONG); setBukaTambah(false); flash('Paket ditambahkan ✓'); router.refresh(); }
    else flash(r.error ?? 'Gagal');
  }

  async function simpan(id: string) {
    setBusy(id);
    const r = await updatePaket(id, edit);
    setBusy(null);
    if (r.ok) { setEditId(null); flash('Tersimpan ✓'); router.refresh(); }
    else flash(r.error ?? 'Gagal');
  }

  async function toggle(p: PaketLangganan) {
    setBusy(p.id);
    const r = await toggleAktifPaket(p.id, !p.aktif);
    setBusy(null);
    if (r.ok) { flash(p.aktif ? 'Dinonaktifkan ✓' : 'Diaktifkan ✓'); router.refresh(); }
    else flash(r.error ?? 'Gagal');
  }

  return (
    <div>
      {!bukaTambah
        ? <button className={s.btn} onClick={() => setBukaTambah(true)}>+ Tambah Paket</button>
        : (
          <div className={s.card}>
            <b>Tambah Paket</b>
            <div style={{ marginTop: 8 }}><Form nilai={baru} set={setBaru} kodeTerkunci={false} /></div>
            <div className={s.row} style={{ gap: 6, marginTop: 10 }}>
              <button className={s.btn} onClick={tambah} disabled={busy === 'tambah'}>{busy === 'tambah' ? 'Menyimpan…' : 'Simpan'}</button>
              <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => { setBukaTambah(false); setBaru(KOSONG); }}>Batal</button>
            </div>
          </div>
        )}

      {awal.map((p) => (
        <div key={p.id} className={s.card} style={{ opacity: p.aktif ? 1 : 0.6 }}>
          <div className={s.row}>
            <span style={{ flex: 1 }}>
              <b>{p.nama}</b> <span className={s.muted} style={{ fontSize: 12 }}>({p.kode})</span>
              {!p.aktif && <span className={`${s.tag} ${s.tagDraf}`} style={{ marginLeft: 6 }}>nonaktif</span>}
              <br /><small className={s.muted}>
                {formatRupiah(p.harga_bulanan)} / anak / bulan · urutan {p.urutan}
                {p.worksheet ? ` · worksheet ${(p.worksheet_kuota_jumlah ?? 0) === 0 ? 'tanpa batas' : `${p.worksheet_kuota_jumlah}/${p.worksheet_kuota_satuan}`}` : ''}{p.rapor_bulanan ? ' · rapor bulanan' : ''}
                {p.konsultasi_gratis_jumlah > 0 ? ` · ${p.konsultasi_gratis_jumlah} konsultasi/${p.konsultasi_gratis_satuan}` : ''}
              </small>
              {(p.diskon_keluarga?.length ?? 0) > 0 && (
                <><br /><small className={s.muted}>👨‍👩‍👧‍👦 {p.diskon_keluarga.map((r) => `≥${r.min_anak} anak: ${r.persen ? `${r.persen}%` : formatRupiah(r.nominal ?? 0)}`).join(' · ')}</small></>
              )}
            </span>
            <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}
              onClick={() => { setEditId(editId === p.id ? null : p.id); setEdit(dariPaket(p)); }}>
              {editId === p.id ? 'Tutup' : 'Edit'}
            </button>
            <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }}
              onClick={() => toggle(p)} disabled={busy === p.id}>{p.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
          </div>
          {editId === p.id && (
            <div style={{ marginTop: 10, borderTop: '1px dashed #e6e0f2', paddingTop: 10 }}>
              <Form nilai={edit} set={setEdit} kodeTerkunci />
              <div className={s.row} style={{ gap: 6, marginTop: 10 }}>
                <button className={s.btn} onClick={() => simpan(p.id)} disabled={busy === p.id}>{busy === p.id ? 'Menyimpan…' : 'Simpan'}</button>
                <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => setEditId(null)}>Batal</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
