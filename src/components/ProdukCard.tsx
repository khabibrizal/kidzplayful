// src/components/ProdukCard.tsx — kartu produk di katalog Store
import Link from 'next/link';
import Image from 'next/image';
import type { Produk } from '@/lib/game/tipe';
import { formatRupiah } from '@/lib/format';
import TambahKeranjangBtn from './TambahKeranjangBtn';

export default function ProdukCard({ p }: { p: Produk }) {
  const habis = p.stok <= 0;
  return (
    <div className="kp-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Link href={`/store/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ position: 'relative', aspectRatio: '1/1', background: '#f3eefc', display: 'grid', placeItems: 'center', fontSize: 46 }}>
          {p.gambar_url ? (
            <Image src={p.gambar_url} alt={p.nama} fill sizes="(max-width: 480px) 50vw, 240px" style={{ objectFit: 'cover' }} />
          ) : <span>🧸</span>}
          {p.kategori && <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,.88)', borderRadius: 99, padding: '3px 9px', fontSize: 10, fontWeight: 700, color: 'var(--tinta)' }}>{p.kategori}</span>}
          {habis && <span style={{ position: 'absolute', inset: 0, background: 'rgba(91,81,112,.45)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>Stok habis</span>}
        </div>
      </Link>
      <div style={{ padding: '10px 11px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <Link href={`/store/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}><b style={{ fontSize: 14 }}>{p.nama}</b></Link>
        {p.deskripsi && <div style={{ fontSize: 11.5, color: 'var(--abu)', lineHeight: 1.4, maxHeight: 32, overflow: 'hidden' }}>{p.deskripsi}</div>}
        <div style={{ fontWeight: 800, color: 'var(--lavender-d)', fontSize: 16, marginTop: 2 }}>{formatRupiah(p.harga)}</div>
        <TambahKeranjangBtn produkId={p.id} habis={habis} />
      </div>
    </div>
  );
}
