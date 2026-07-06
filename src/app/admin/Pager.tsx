// src/app/admin/Pager.tsx — navigasi halaman sederhana untuk list admin (server component)
import Link from 'next/link';
import s from './admin.module.css';

export default function Pager({ hal, totalHal, total, basePath }: { hal: number; totalHal: number; total: number; basePath: string }) {
  if (totalHal <= 1) return null;
  const link = (h: number) => `${basePath}?hal=${h}`;
  const gaya = { background: '#efe7fb', color: 'var(--lavender-d)' };
  return (
    <div className={s.row} style={{ justifyContent: 'center', gap: 12, margin: '16px 0 4px' }}>
      {hal > 1
        ? <Link className={s.btnSm} style={gaya} href={link(hal - 1)}>← Sebelumnya</Link>
        : <span className={s.btnSm} style={{ ...gaya, opacity: 0.4 }}>← Sebelumnya</span>}
      <span className={s.muted}>Hal {hal} / {totalHal} · {total} total</span>
      {hal < totalHal
        ? <Link className={s.btnSm} style={gaya} href={link(hal + 1)}>Berikutnya →</Link>
        : <span className={s.btnSm} style={{ ...gaya, opacity: 0.4 }}>Berikutnya →</span>}
    </div>
  );
}
