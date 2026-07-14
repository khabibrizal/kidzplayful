// src/app/admin/AdminNav.tsx — navigasi admin persisten + tombol Back (filter menu khusus super user)
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MENU_ADMIN, MENU_SUPER_TETAP } from '@/lib/menu-admin';

export default function AdminNav({ superOnly = [], isSuperuser = false }: { superOnly?: string[]; isSuperuser?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const aktif = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  const diDashboard = pathname === '/admin';

  const kunci = new Set([...superOnly, ...MENU_SUPER_TETAP]); // menu khusus super user
  const menu = MENU_ADMIN.filter((m) => isSuperuser || !kunci.has(m.key));

  return (
    <div style={{ marginBottom: 16 }}>
      {!diDashboard && (
        <button
          type="button"
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--abu)', fontSize: 13, padding: '4px 0', marginBottom: 8, fontFamily: 'inherit' }}
        >
          ← Kembali
        </button>
      )}
      <nav style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
        {menu.map((m) => {
          const on = aktif(m.href);
          return (
            <Link
              key={m.href}
              href={m.href}
              style={{
                flex: '0 0 auto', whiteSpace: 'nowrap', textDecoration: 'none',
                fontSize: 12, fontWeight: 800, padding: '7px 14px', borderRadius: 999,
                background: on ? 'var(--lavender-d)' : '#efe7fb',
                color: on ? '#fff' : 'var(--lavender-d)',
                boxShadow: on ? '0 3px 0 rgba(120,90,180,.28)' : '0 3px 0 rgba(120,90,180,.12)',
              }}
            >
              {m.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
