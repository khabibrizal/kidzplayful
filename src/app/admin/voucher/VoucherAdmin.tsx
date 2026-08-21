// src/app/admin/voucher/VoucherAdmin.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buatVoucher, updateVoucher, setAktifVoucher, hapusVoucher, type VoucherInput } from '@/lib/data/voucher-actions';
import type { Voucher } from '@/lib/data/voucher';
import s from '../admin.module.css';

const KOSONG: VoucherInput = { kode: '', tipe: 'nominal', nilai: 0, berlakuEvent: true, berlakuProduk: false, berlakuLangganan: false, berlakuKonsultasi: false, kuotaTotal: null, kuotaPerUser: 1, berlakuDari: null, berlakuSampai: null, aktif: true };

export default function VoucherAdmin({ awal }: { awal: Voucher[] }) {
  const router = useRouter();
  const [form, setForm] = useState<VoucherInput | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2400); }

  function bukaTambah() { setEditId(null); setForm({ ...KOSONG }); }
  function bukaEdit(v: Voucher) {
    setEditId(v.id);
    setForm({ kode: v.kode, tipe: v.tipe, nilai: v.nilai, berlakuEvent: v.berlaku_event, berlakuProduk: v.berlaku_produk, berlakuLangganan: !!v.berlaku_langganan, berlakuKonsultasi: !!v.berlaku_konsultasi, kuotaTotal: v.kuota_total, kuotaPerUser: v.kuota_per_user, berlakuDari: v.berlaku_dari, berlakuSampai: v.berlaku_sampai, aktif: v.aktif });
  }
  async function simpan() {
    if (!form) return; setBusy(true);
    const r = editId ? await updateVoucher(editId, form) : await buatVoucher(form);
    setBusy(false);
    if (r.ok) { setForm(null); setEditId(null); flash('Tersimpan ✓'); router.refresh(); } else flash(r.error ?? 'Gagal');
  }
  async function toggle(v: Voucher) { setBusy(true); const r = await setAktifVoucher(v.id, !v.aktif); setBusy(false); if (r.ok) { flash('✓'); router.refresh(); } else flash(r.error ?? 'Gagal'); }
  async function hapus(v: Voucher) { if (!confirm(`Hapus voucher ${v.kode}?`)) return; setBusy(true); const r = await hapusVoucher(v.id); setBusy(false); if (r.ok) { flash('Dihapus ✓'); router.refresh(); } else flash(r.error ?? 'Gagal'); }

  const set = (patch: Partial<VoucherInput>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div>
      {!form && <button className={s.btn} onClick={bukaTambah}>+ Tambah Voucher</button>}
      {form && (
        <div className={s.card} style={{ border: '2px solid var(--lavender)' }}>
          <b>{editId ? 'Edit' : 'Tambah'} Voucher</b>
          <input className={s.inp} placeholder="KODE (mis. HEMAT20)" value={form.kode} onChange={(e) => set({ kode: e.target.value.toUpperCase() })} style={{ width: '100%', marginTop: 8 }} />
          <div className={s.row} style={{ gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            <select className={s.inp} value={form.tipe} onChange={(e) => set({ tipe: e.target.value as 'nominal' | 'persen' })} style={{ marginBottom: 0 }}>
              <option value="nominal">Nominal (Rp)</option>
              <option value="persen">Persen (%)</option>
            </select>
            <input className={s.inp} type="number" min={0} placeholder={form.tipe === 'persen' ? '%' : 'Rp'} value={form.nilai} onChange={(e) => set({ nilai: Number(e.target.value) })} style={{ width: 120, marginBottom: 0 }} />
            <span className={s.muted} style={{ fontSize: 12 }}>{form.tipe === 'persen' ? '% dari transaksi' : 'rupiah'}</span>
          </div>
          <div className={s.row} style={{ gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={form.berlakuEvent} onChange={(e) => set({ berlakuEvent: e.target.checked })} /> Pendaftaran Event</label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={form.berlakuProduk} onChange={(e) => set({ berlakuProduk: e.target.checked })} /> Beli Produk</label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={form.berlakuLangganan} onChange={(e) => set({ berlakuLangganan: e.target.checked })} /> Langganan</label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={form.berlakuKonsultasi} onChange={(e) => set({ berlakuKonsultasi: e.target.checked })} /> Konsultasi</label>
          </div>
          <div className={s.row} style={{ gap: 6, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span className={s.muted} style={{ fontSize: 12 }}>Kuota total</span>
            <input className={s.inp} type="number" min={0} placeholder="∞" value={form.kuotaTotal ?? ''} onChange={(e) => set({ kuotaTotal: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: 90, marginBottom: 0 }} />
            <span className={s.muted} style={{ fontSize: 12 }}>per user</span>
            <input className={s.inp} type="number" min={0} placeholder="∞" value={form.kuotaPerUser ?? ''} onChange={(e) => set({ kuotaPerUser: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: 90, marginBottom: 0 }} />
            <span className={s.muted} style={{ fontSize: 11 }}>(kosong = tak terbatas)</span>
          </div>
          <div className={s.row} style={{ gap: 6, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span className={s.muted} style={{ fontSize: 12 }}>Berlaku</span>
            <input className={s.inp} type="date" value={form.berlakuDari ?? ''} onChange={(e) => set({ berlakuDari: e.target.value || null })} style={{ marginBottom: 0 }} />
            <span className={s.muted}>–</span>
            <input className={s.inp} type="date" value={form.berlakuSampai ?? ''} onChange={(e) => set({ berlakuSampai: e.target.value || null })} style={{ marginBottom: 0 }} />
          </div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}><input type="checkbox" checked={form.aktif} onChange={(e) => set({ aktif: e.target.checked })} /> Aktif</label>
          <div className={s.row} style={{ marginTop: 10, gap: 6 }}>
            <button className={s.btn} onClick={simpan} disabled={busy}>{busy ? '...' : '💾 Simpan'}</button>
            <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => { setForm(null); setEditId(null); }}>Batal</button>
          </div>
        </div>
      )}

      <div className={s.section}>Daftar ({awal.length})</div>
      {awal.map((v) => (
        <div key={v.id} className={s.card} style={{ opacity: v.aktif ? 1 : 0.55 }}>
          <div className={s.row}>
            <span style={{ flex: 1 }}>
              <b>{v.kode}</b> <span className={s.muted}>· {v.tipe === 'persen' ? `${v.nilai}%` : `Rp${v.nilai.toLocaleString('id-ID')}`}</span> {!v.aktif && <span className={`${s.tag} ${s.tagDraf}`}>nonaktif</span>}
              <br /><small className={s.muted}>{[v.berlaku_event && 'Event', v.berlaku_produk && 'Produk', v.berlaku_langganan && 'Langganan', v.berlaku_konsultasi && 'Konsultasi'].filter(Boolean).join(' + ') || '—'} · kuota {v.kuota_total ?? '∞'}/total, {v.kuota_per_user ?? '∞'}/user{v.berlaku_sampai ? ` · s/d ${v.berlaku_sampai}` : ''}</small>
            </span>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => bukaEdit(v)} disabled={busy}>Edit</button>
              <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => toggle(v)} disabled={busy}>{v.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
              <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(v)} disabled={busy}>Hapus</button>
            </span>
          </div>
        </div>
      ))}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
