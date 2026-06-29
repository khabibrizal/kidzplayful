// src/app/keranjang/KeranjangView.tsx
'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setQtyKeranjang, hapusKeranjang, checkout } from '@/lib/data/keranjang-actions';
import type { KeranjangItem } from '@/lib/game/tipe';
import { formatRupiah } from '@/lib/format';

export default function KeranjangView({ awal }: { awal: KeranjangItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<KeranjangItem[]>(awal);
  const [penerima, setPenerima] = useState('');
  const [noHp, setNoHp] = useState('');
  const [alamat, setAlamat] = useState('');
  const [catatan, setCatatan] = useState('');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const subtotal = items.reduce((a, it) => a + it.produk.harga * it.qty, 0);

  function ubahQty(produkId: string, qty: number) {
    const it = items.find((x) => x.produk_id === produkId);
    if (!it) return;
    const max = Math.max(1, it.produk.stok);
    const q = Math.min(Math.max(0, qty), max);
    if (q === 0) { setItems(items.filter((x) => x.produk_id !== produkId)); hapusKeranjang(produkId).catch(() => {}); window.dispatchEvent(new Event('keranjang:update')); return; }
    setItems(items.map((x) => (x.produk_id === produkId ? { ...x, qty: q } : x)));
    setQtyKeranjang(produkId, q).catch(() => {});
    window.dispatchEvent(new Event('keranjang:update'));
  }

  function buatPesanan() {
    setErr('');
    start(async () => {
      try {
        const id = await checkout({ penerima, noHp, alamat, catatan });
        window.dispatchEvent(new Event('keranjang:update'));
        router.push(`/pesanan/${id}`);
      } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal membuat pesanan'); }
    });
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--abu)', padding: '24px 0' }}>
        <div style={{ fontSize: 44 }}>🛒</div>
        <p>Keranjang masih kosong.</p>
        <Link href="/store" className="kp-btn" style={{ display: 'inline-block', marginTop: 8 }}>Belanja sekarang</Link>
      </div>
    );
  }

  return (
    <div>
      {items.map((it) => (
        <div key={it.produk_id} className="kp-card" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 9 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: '#f3eefc', display: 'grid', placeItems: 'center', fontSize: 26, flex: '0 0 auto', overflow: 'hidden' }}>
            {it.produk.gambar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.produk.gambar_url} alt={it.produk.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : <span>🧸</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{it.produk.nama}</div>
            <div style={{ fontWeight: 800, color: 'var(--lavender-d)', fontSize: 13 }}>{formatRupiah(it.produk.harga)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13 }}>
            <button onClick={() => ubahQty(it.produk_id, it.qty - 1)} style={{ border: 'none', background: '#f0ecf9', color: 'var(--lavender-d)', width: 26, height: 26, borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>−</button>
            {it.qty}
            <button onClick={() => ubahQty(it.produk_id, it.qty + 1)} style={{ border: 'none', background: '#f0ecf9', color: 'var(--lavender-d)', width: 26, height: 26, borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>+</button>
          </div>
        </div>
      ))}

      <div className="kp-card" style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, margin: '4px 0' }}><span>Subtotal ({items.length} barang)</span><b>{formatRupiah(subtotal)}</b></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, margin: '4px 0', color: 'var(--abu)' }}><span>Ongkir</span><span style={{ fontSize: 12 }}>dihitung admin</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, borderTop: '1px dashed #e2dbf0', paddingTop: 8, marginTop: 8 }}><span>Total</span><span>{formatRupiah(subtotal)} +</span></div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '16px 0 6px' }}>ALAMAT PENGIRIMAN</div>
      <input className="kp-input" placeholder="Nama penerima" value={penerima} onChange={(e) => setPenerima(e.target.value)} />
      <input className="kp-input" placeholder="No. HP / WhatsApp" value={noHp} onChange={(e) => setNoHp(e.target.value)} />
      <textarea className="kp-input" placeholder="Alamat lengkap (jalan, kota, kode pos)" rows={3} value={alamat} onChange={(e) => setAlamat(e.target.value)} style={{ resize: 'vertical' }} />
      <input className="kp-input" placeholder="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />

      {err && <div className="kp-error" style={{ marginTop: 8 }}>{err}</div>}
      <button className="kp-btn" onClick={buatPesanan} disabled={pending} style={{ width: '100%', marginTop: 10 }}>{pending ? 'Memproses…' : 'Buat Pesanan →'}</button>
      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--abu)', marginTop: 8 }}>Ongkir & total final dikonfirmasi admin sebelum kamu membayar.</p>
    </div>
  );
}
