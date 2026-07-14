// src/lib/menu-admin.ts — katalog menu admin (dipakai AdminNav, checklist akses, & enforcement)
// key = segmen path setelah /admin (dashboard = '' pada href '/admin').
export interface MenuAdmin { key: string; href: string; label: string }

export const MENU_ADMIN: MenuAdmin[] = [
  { key: 'dashboard', href: '/admin', label: '🏠 Dashboard' },
  { key: 'analitik', href: '/admin/analitik', label: '📈 Analitik' },
  { key: 'event', href: '/admin/event', label: '🗓️ Event' },
  { key: 'produk', href: '/admin/produk', label: '🛍️ Produk' },
  { key: 'pesanan', href: '/admin/pesanan', label: '📦 Pesanan' },
  { key: 'kelas-bermain', href: '/admin/kelas-bermain', label: '🎈 Kelas Bermain' },
  { key: 'artikel', href: '/admin/artikel', label: '📝 Artikel' },
  { key: 'video', href: '/admin/video', label: '📺 Video' },
  { key: 'langganan', href: '/admin/langganan', label: '💳 Langganan' },
  { key: 'keuangan', href: '/admin/keuangan', label: '💼 Keuangan' },
  { key: 'sponsor', href: '/admin/sponsor', label: '🤝 Sponsor' },
  { key: 'anak', href: '/admin/anak', label: '🧒 Anak' },
  { key: 'tantangan', href: '/admin/tantangan', label: '🏆 Tantangan' },
  { key: 'pengaturan-bayar', href: '/admin/pengaturan-bayar', label: '💰 Pembayaran' },
  { key: 'pengaturan-trial', href: '/admin/pengaturan-trial', label: '⏳ Trial' },
  { key: 'laporan', href: '/admin/laporan', label: '📊 Laporan' },
  { key: 'komunitas', href: '/admin/komunitas', label: '💬 Komunitas' },
  { key: 'feedback', href: '/admin/feedback', label: '⭐ Masukan' },
  { key: 'guru', href: '/admin/guru', label: '🍎 Guru' },
  { key: 'users', href: '/admin/users', label: '👤 Pengguna' },
  { key: 'reminder', href: '/admin/reminder', label: '📣 Reminder' },
  { key: 'akses-menu', href: '/admin/akses-menu', label: '🔐 Akses Menu' },
];

// default menu yang khusus super user (dipakai bila tabel pengaturan_menu belum ada)
export const MENU_SUPER_DEFAULT = ['keuangan', 'users', 'pengaturan-bayar', 'pengaturan-trial', 'sponsor'];

// Menu yang SELALU khusus super user (tak bisa diubah): halaman pengelola akses & role.
export const MENU_SUPER_TETAP = ['akses-menu'];

/** segmen key dari path admin (mis. /admin/keuangan/kpi → 'keuangan'). */
export function keyMenuDariPath(pathname: string): string {
  const seg = pathname.replace(/^\/admin\/?/, '').split('/')[0];
  return seg || 'dashboard';
}
