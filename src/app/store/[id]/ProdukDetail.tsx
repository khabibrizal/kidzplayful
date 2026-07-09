// src/app/store/[id]/ProdukDetail.tsx
'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { tambahKeranjang } from '@/lib/data/keranjang-actions';
import type { Produk } from '@/lib/game/tipe';
import { formatRupiah } from '@/lib/format';
import { hargaProdukUntuk, diskonTrial, diskonLangganan } from '@/lib/domain/harga';

export default function ProdukDetail({ p, status = 'kadaluarsa' }: { p: Produk; status?: string }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState('');
  const habis = p.stok <= 0;
  const dt = diskonTrial(p), dl = diskonLangganan(p);
  const adaDiskon = dt !== null || dl !== null;
  const bayar = hargaProdukUntuk(p, status);

  function tambah(laluKeKeranjang: boolean) {
    start(async () => {
      try {
        await tambahKeranjang(p.id, qty);
        window.dispatchEvent(new Event('keranjang:update'));
        if (laluKeKeranjang) router.push('/keranjang');
        else { setToast('Ditambahkan ke keranjang ✓'); setTimeout(() => setToast(''), 1800); }
      } catch (e) { setToast(e instanceof Error ? e.message : 'Gagal'); setTimeout(() => setToast(''), 2000); }
    });
  }

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      <Link href="/store" style={{ color: 'var(--abu)', fontSize: 13 }}>← Kembali ke Store</Link>
      <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 20, background: '#f3eefc', display: 'grid', placeItems: 'center', fontSize: 80, margin: '10px 0 12px', overflow: 'hidden' }}>
        {p.gambar_url ? (
          <Image src={p.gambar_url} alt={p.nama} fill sizes="(max-width: 480px) 100vw, 480px" style={{ objectFit: 'cover' }} />
        ) : <span>🧸</span>}
      </div>
      {p.kategori && <span className="kp-chip" style={{ fontSize: 12 }}>{p.kategori}</span>}
      <h1 style={{ fontSize: 22, margin: '8px 0 2px' }}>{p.nama}</h1>
      {adaDiskon ? (
        <div style={{ margin: '4px 0 8px' }}>
          <span style={{ textDecoration: 'line-through', color: 'var(--abu)', fontSize: 15 }}>{formatRupiah(p.harga)}</span>
          <div style={{ fontWeight: 800, color: 'var(--lavender-d)', fontSize: 24 }}>{formatRupiah(bayar)}</div>
          <div style={{ fontSize: 12, color: 'var(--abu)', marginTop: 2 }}>
            {dt !== null && <span style={{ fontWeight: status !== 'aktif' ? 800 : 500, color: status !== 'aktif' ? 'var(--mint-d)' : 'var(--abu)' }}>Trial {formatRupiah(dt)}</span>}
            {dt !== null && dl !== null && ' · '}
            {dl !== null && <span style={{ fontWeight: status === 'aktif' ? 800 : 500, color: status === 'aktif' ? 'var(--mint-d)' : 'var(--abu)' }}>Langganan {formatRupiah(dl)}</span>}
          </div>
        </div>
      ) : (
        <div style={{ fontWeight: 800, color: 'var(--lavender-d)', fontSize: 24, margin: '4px 0 8px' }}>{formatRupiah(p.harga)}</div>
      )}
      {p.deskripsi && <p style={{ fontSize: 14, lineHeight: 1.6, color: '#6f6685', whiteSpace: 'pre-wrap' }}>{p.deskripsi}</p>}
      <div style={{ fontSize: 12, fontWeight: 700, color: habis ? '#b3261e' : 'var(--mint-d)', marginTop: 8 }}>
        {habis ? 'Stok habis' : `✓ Stok tersedia (${p.stok})`}
      </div>

      {!habis && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 99, boxShadow: '0 3px 0 #e6def5', overflow: 'hidden' }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 800, color: 'var(--lavender-d)', width: 40, height: 40 }}>−</button>
              <span style={{ minWidth: 30, textAlign: 'center', fontWeight: 800 }}>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(p.stok, q + 1))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 800, color: 'var(--lavender-d)', width: 40, height: 40 }}>+</button>
            </div>
            <span style={{ color: 'var(--abu)', fontSize: 13 }}>Subtotal: <b style={{ color: 'var(--lavender-d)' }}>{formatRupiah(bayar * qty)}</b></span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="kp-btn putih" onClick={() => tambah(false)} disabled={pending} style={{ flex: 1 }}>+ Keranjang</button>
            <button className="kp-btn" onClick={() => tambah(true)} disabled={pending} style={{ flex: 1 }}>Beli sekarang</button>
          </div>
        </>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </main>
  );
}
