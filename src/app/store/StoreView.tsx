// src/app/store/StoreView.tsx — filter kategori + grid produk
'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Produk } from '@/lib/game/tipe';
import ProdukCard from '@/components/ProdukCard';

export default function StoreView({ produk, status = 'kadaluarsa' }: { produk: Produk[]; status?: string }) {
  const kategoriList = ['Semua', ...Array.from(new Set(produk.map((p) => p.kategori).filter(Boolean) as string[]))];
  const [aktif, setAktif] = useState('Semua');
  const [cari, setCari] = useState('');
  const q = cari.trim().toLowerCase();
  const tampil = produk
    .filter((p) => aktif === 'Semua' || p.kategori === aktif)
    .filter((p) => !q || p.nama.toLowerCase().includes(q) || (p.deskripsi ?? '').toLowerCase().includes(q));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Link href="/keranjang" className="kp-btn putih" style={{ padding: '7px 14px', fontSize: 13 }}>🛒 Keranjang</Link>
      </div>

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--abu)', fontSize: 15 }}>🔍</span>
        <input
          className="kp-input"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama produk…"
          style={{ marginBottom: 0, paddingLeft: 36 }}
          aria-label="Cari produk"
        />
        {cari && (
          <button onClick={() => setCari('')} aria-label="Hapus pencarian"
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--abu)', fontSize: 16 }}>✕</button>
        )}
      </div>

      {kategoriList.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
          {kategoriList.map((k) => (
            <button key={k} onClick={() => setAktif(k)} style={{
              flex: '0 0 auto', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, borderRadius: 99,
              padding: '8px 15px', background: aktif === k ? 'var(--lavender-d)' : '#fff',
              color: aktif === k ? '#fff' : 'var(--tinta)', boxShadow: aktif === k ? '0 3px 0 #5e43ad' : '0 2px 0 #e6def5',
            }}>{k}</button>
          ))}
        </div>
      )}

      {tampil.length === 0 ? (
        <p style={{ color: 'var(--abu)' }}>{q ? `Tidak ada produk cocok dengan "${cari.trim()}".` : `Belum ada produk${aktif !== 'Semua' ? ' di kategori ini' : ''}.`}</p>
      ) : (
        <div className="kp-grid-produk">
          {tampil.map((p) => <ProdukCard key={p.id} p={p} status={status} />)}
        </div>
      )}
    </div>
  );
}
