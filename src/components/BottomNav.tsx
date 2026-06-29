// src/components/BottomNav.tsx — navigasi bawah untuk halaman orang tua
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/pilih-anak', label: 'Beranda', icon: '🏠' },
  { href: '/kelas-saya', label: 'Kelas', icon: '🎈' },
  { href: '/store', label: 'Store', icon: '🛒' },
  { href: '/pesanan', label: 'Pesanan', icon: '📦' },
  { href: '/komunitas', label: 'Komunitas', icon: '💬' },
  { href: '/pengaturan', label: 'Akun', icon: '👤' },
];

export default function BottomNav() {
  const path = usePathname();
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
            <span style={{ fontSize: 20, opacity: aktif ? 1 : 0.7 }}>{it.icon}</span>
            <span style={{ fontSize: 9.5, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
