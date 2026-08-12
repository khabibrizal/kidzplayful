// src/components/BottomNav.tsx — navigasi bawah untuk halaman orang tua
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { jumlahKeranjang } from '@/lib/data/keranjang-actions';

const ITEMS = [
  { href: '/pilih-anak', label: 'Beranda', icon: '🏠' },
  { href: '/kelas-saya', label: 'Ide', icon: '🎈' },
  { href: '/store', label: 'Store', icon: '🛒', badge: true },
  { href: '/pesanan', label: 'Pesanan', icon: '📦' },
  { href: '/komunitas', label: 'Komunitas', icon: '💬' },
  { href: '/konsultasi', label: 'Konsultasi', icon: '🧠' },
  { href: '/pengaturan', label: 'Akun', icon: '👤' },
];

export default function BottomNav() {
  const path = usePathname();
  const [cart, setCart] = useState(0);

  useEffect(() => {
    let batal = false;
    const muat = () => jumlahKeranjang().then((n) => { if (!batal) setCart(n); }).catch(() => {});
    muat();
    // segarkan badge saat keranjang berubah (add/ubah qty/checkout)
    window.addEventListener('keranjang:update', muat);
    return () => { batal = true; window.removeEventListener('keranjang:update', muat); };
  }, [path]);

  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 70,
      background: '#fff', borderTop: '1px solid #eee', boxShadow: '0 -4px 16px rgba(91,81,112,0.07)',
      display: 'flex', justifyContent: 'space-around', padding: '7px 2px 9px',
    }}>
      {ITEMS.map((it) => {
        const aktif = it.href === '/pilih-anak' ? path === '/pilih-anak' : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            textDecoration: 'none', flex: 1, minWidth: 0,
            color: aktif ? 'var(--lavender-d)' : 'var(--abu)',
            fontWeight: aktif ? 700 : 500,
          }}>
            <span style={{ position: 'relative', fontSize: 20, opacity: aktif ? 1 : 0.7 }}>
              {it.icon}
              {it.badge && cart > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -10, background: '#e8804f', color: '#fff',
                  fontSize: 10, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 99,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  border: '1.5px solid #fff',
                }}>{cart > 99 ? '99+' : cart}</span>
              )}
            </span>
            <span style={{ fontSize: 9.5, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
