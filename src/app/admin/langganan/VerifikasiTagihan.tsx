// src/app/admin/langganan/VerifikasiTagihan.tsx — antrean tagihan langganan menunggu verifikasi.
// Admin cukup MENYETUJUI: seluruh nominal sudah dihitung server saat tagihan dibuat.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifikasiTagihan, tolakTagihan } from '@/lib/data/tagihan-admin-actions';
import BuktiLightbox from '@/components/BuktiLightbox';
import { formatRupiah } from '@/lib/format';
import type { Tagihan } from '@/lib/data/tagihan';
import s from '../admin.module.css';

export default function VerifikasiTagihan({ daftar }: { daftar: Tagihan[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [pesan, setPesan] = useState('');

  async function terima(t: Tagihan) {
    if (!confirm(`Verifikasi pembayaran ${formatRupiah(t.total)} untuk ${t.item.length} anak?`)) return;
    setBusy(t.id); setPesan('');
    const r = await verifikasiTagihan(t.id);
    setBusy(null);
    if (r.ok) { setPesan('Diverifikasi — langganan aktif ✓'); router.refresh(); }
    else setPesan(r.error ?? 'Gagal');
  }

  async function tolak(t: Tagihan) {
    const alasan = window.prompt('Alasan penolakan (tampil ke orang tua):', '');
    if (alasan === null) return;
    if (!alasan.trim()) { setPesan('Alasan penolakan wajib diisi.'); return; }
    setBusy(t.id); setPesan('');
    const r = await tolakTagihan(t.id, alasan);
    setBusy(null);
    if (r.ok) { setPesan('Ditolak'); router.refresh(); }
    else setPesan(r.error ?? 'Gagal');
  }

  return (
    <details className={s.card} open style={{ borderLeft: '4px solid var(--lavender-d)' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--lavender-d)' }}>
        💳 Tagihan menunggu verifikasi ({daftar.length})
      </summary>
      {daftar.length === 0 && <p className={s.muted} style={{ marginTop: 10 }}>Tidak ada tagihan yang menunggu. 🎉</p>}
      {daftar.map((t) => (
        <div key={t.id} style={{ marginTop: 12, borderTop: '1px dashed #e6e0f2', paddingTop: 10 }}>
          <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <span style={{ flex: 1, minWidth: 190 }}>
              <b>{t.ortu_nama?.trim() || t.ortu_email}</b>
              <br /><small className={s.muted}>
                {t.item.map((i) => `${i.anak_nama} · ${i.paket_nama ?? 'paket?'} ${formatRupiah(i.harga)}`).join(' | ')}
              </small>
              <br /><small className={s.muted}>
                Subtotal {formatRupiah(t.subtotal)}
                {t.diskon_keluarga > 0 ? ` · diskon keluarga −${formatRupiah(t.diskon_keluarga)}` : ''}
                {t.potongan_voucher > 0 ? ` · voucher −${formatRupiah(t.potongan_voucher)}` : ''}
                {' · '}<b>total {formatRupiah(t.total)}</b>{t.bulan > 1 ? ` (${t.bulan} bln)` : ''}
              </small>
            </span>
            {t.bukti_url ? <BuktiLightbox url={t.bukti_url} /> : <span className={s.muted} style={{ fontSize: 12 }}>tanpa bukti</span>}
            <button className={s.btnSm} style={{ background: '#dff5e6', color: '#1c7a43' }}
              onClick={() => terima(t)} disabled={busy === t.id}>{busy === t.id ? '…' : 'Verifikasi'}</button>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => tolak(t)} disabled={busy === t.id}>Tolak</button>
          </div>
        </div>
      ))}
      {pesan && <div style={{ fontSize: 12, marginTop: 8, color: pesan.includes('✓') ? 'var(--mint-d)' : '#c0392b' }}>{pesan}</div>}
    </details>
  );
}
