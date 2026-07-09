// src/app/admin/keuangan/KeuanganNav.tsx — sub-navigasi modul Keuangan
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINK = [
  { href: '/admin/keuangan', label: '📊 Dashboard' },
  { href: '/admin/keuangan/kpi', label: '🎯 KPI' },
  { href: '/admin/keuangan/insight', label: '💡 Insight' },
  { href: '/admin/keuangan/transaksi', label: '📒 Transaksi' },
  { href: '/admin/keuangan/expense', label: '💸 Pengeluaran' },
  { href: '/admin/keuangan/aset', label: '🖥️ Aset' },
  { href: '/admin/keuangan/anggaran', label: '🎯 Anggaran' },
  { href: '/admin/keuangan/laporan', label: '📈 Laporan' },
  { href: '/admin/keuangan/pajak', label: '🧾 Pajak' },
  { href: '/admin/keuangan/master', label: '⚙️ Master' },
];

export default function KeuanganNav() {
  const p = usePathname();
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
      {LINK.map((l) => {
        const on = l.href === '/admin/keuangan' ? p === '/admin/keuangan' : p.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} style={{ flex: '0 0 auto', whiteSpace: 'nowrap', textDecoration: 'none', fontSize: 12, fontWeight: 800, padding: '7px 13px', borderRadius: 999, background: on ? 'var(--lavender-d)' : '#efe7fb', color: on ? '#fff' : 'var(--lavender-d)' }}>{l.label}</Link>
        );
      })}
    </div>
  );
}
