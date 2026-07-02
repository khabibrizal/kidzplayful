// src/app/admin/pesanan/PesananAdmin.tsx
'use client';
import { useState } from 'react';
import { setOngkir, verifikasiPesanan, setResi, ubahStatusPesanan } from '@/lib/data/admin-store-actions';
import type { Pesanan } from '@/lib/game/tipe';
import { formatRupiah, STATUS_PESANAN } from '@/lib/format';
import s from '../admin.module.css';

export default function PesananAdmin({ awal }: { awal: Pesanan[] }) {
  const [list, setList] = useState<Pesanan[]>(awal);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({}); // input ongkir/resi per pesanan
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2200); }
  function patch(id: string, p: Partial<Pesanan>) { setList((l) => l.map((o) => (o.id === id ? { ...o, ...p } : o))); }

  async function aksiOngkir(o: Pesanan) {
    const ong = Number(draft[o.id] ?? '');
    if (!Number.isFinite(ong) || ong < 0) { flash('Isi ongkir dulu.'); return; }
    setBusyId(o.id);
    try { await setOngkir(o.id, ong); patch(o.id, { ongkir: ong, total: o.subtotal + ong, status: 'menunggu_bayar' }); flash('Ongkir di-set ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); } finally { setBusyId(null); }
  }
  async function aksiVerifikasi(o: Pesanan) {
    setBusyId(o.id);
    try { await verifikasiPesanan(o.id); patch(o.id, { status: 'diproses' }); flash('Diverifikasi ✓ (stok dikurangi)'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); } finally { setBusyId(null); }
  }
  async function aksiResi(o: Pesanan) {
    const r = (draft[o.id] ?? '').trim();
    if (!r) { flash('Isi no. resi dulu.'); return; }
    setBusyId(o.id);
    try { await setResi(o.id, r); patch(o.id, { no_resi: r, status: 'dikirim' }); flash('Resi disimpan ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); } finally { setBusyId(null); }
  }
  async function aksiStatus(o: Pesanan, st: Pesanan['status']) {
    setBusyId(o.id);
    try { await ubahStatusPesanan(o.id, st); patch(o.id, { status: st }); flash('Status diperbarui ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); } finally { setBusyId(null); }
  }

  if (list.length === 0) return <p className={s.muted}>Belum ada pesanan.</p>;

  return (
    <div>
      {list.map((o) => {
        const st = STATUS_PESANAN[o.status] ?? { teks: o.status, warna: 'var(--abu)', bg: '#eee' };
        return (
          <div key={o.id} className={s.card}>
            <div className={s.row}>
              <span style={{ flex: 1 }}><b>#{o.id.slice(0, 8)}</b> · {o.penerima ?? '-'}<br />
                <small className={s.muted}>{(o.item ?? []).map((it) => `${it.nama}×${it.qty}`).join(', ')}</small></span>
              <span className={s.tag} style={{ background: st.bg, color: st.warna }}>{st.teks}</span>
            </div>
            <div className={s.row} style={{ marginTop: 6 }}>
              <small className={s.muted}>{o.no_hp} · {o.alamat}</small>
            </div>
            <div className={s.row} style={{ marginTop: 6 }}>
              <small>Subtotal {formatRupiah(o.subtotal)} · Ongkir {o.status === 'menunggu_ongkir' ? '-' : formatRupiah(o.ongkir)} · <b>Total {formatRupiah(o.total)}</b></small>
            </div>
            {o.bukti_url && <div className={s.row} style={{ marginTop: 4 }}><a className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} href={o.bukti_url} target="_blank">📎 Bukti bayar</a></div>}

            {/* aksi sesuai status — isi/koreksi ongkir selama belum dibayar */}
            {(o.status === 'menunggu_ongkir' || o.status === 'menunggu_bayar') && (
              <div className={s.row} style={{ marginTop: 8, gap: 6 }}>
                <input className={s.inp} type="number" min={0} placeholder="Ongkir (Rp)" value={draft[o.id] ?? (o.status === 'menunggu_bayar' ? String(o.ongkir) : '')} onChange={(e) => setDraft({ ...draft, [o.id]: e.target.value })} style={{ flex: 1, marginBottom: 0 }} />
                <button className={s.btn} onClick={() => aksiOngkir(o)} disabled={busyId === o.id}>{o.status === 'menunggu_ongkir' ? 'Set ongkir' : 'Perbarui ongkir'}</button>
              </div>
            )}
            {o.status === 'dibayar' && (
              <div className={s.row} style={{ marginTop: 8 }}>
                <button className={s.btn} onClick={() => aksiVerifikasi(o)} disabled={busyId === o.id}>✓ Verifikasi pembayaran</button>
                <button className={`${s.btnSm} ${s.danger}`} onClick={() => aksiStatus(o, 'batal')} disabled={busyId === o.id}>Tolak</button>
              </div>
            )}
            {o.status === 'diproses' && (
              <div className={s.row} style={{ marginTop: 8, gap: 6 }}>
                <input className={s.inp} placeholder="No. resi" value={draft[o.id] ?? ''} onChange={(e) => setDraft({ ...draft, [o.id]: e.target.value })} style={{ flex: 1, marginBottom: 0 }} />
                <button className={s.btn} onClick={() => aksiResi(o)} disabled={busyId === o.id}>Kirim</button>
              </div>
            )}
            {o.status === 'dikirim' && (
              <div className={s.row} style={{ marginTop: 8 }}>
                <button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }} onClick={() => aksiStatus(o, 'selesai')} disabled={busyId === o.id}>Tandai selesai</button>
              </div>
            )}
          </div>
        );
      })}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
