// src/app/store/StoreView.tsx — filter kategori + grid produk
'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Produk } from '@/lib/game/tipe';
import ProdukCard from '@/components/ProdukCard';

export default function StoreView({ produk, status = 'kadaluarsa' }: { produk: Produk[]; status?: string }) {
  const kategoriList = ['Semua', ...Array.from(new Set(produk.map((p) => p.kategori).filter(Boolean) as string[]))];
  const [aktif, setAktif] = useState('Semua');
  const tampil = aktif === 'Semua' ? produk : produk.filter((p) => p.kategori === aktif);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Link href="/keranjang" className="kp-btn putih" style={{ padding: '7px 14px', fontSize: 13 }}>🛒 Keranjang</Link>
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
        <p style={{ color: 'var(--abu)' }}>Belum ada produk{aktif !== 'Semua' ? ' di kategori ini' : ''}.</p>
      ) : (
        <div className="kp-grid-produk">
          {tampil.map((p) => <ProdukCard key={p.id} p={p} status={status} />)}
        </div>
      )}
    </div>
  );
}
