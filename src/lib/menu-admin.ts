// src/lib/menu-admin.ts — katalog menu admin + akses per role (dipakai AdminNav, checklist, enforcement)
// key = segmen path setelah /admin (dashboard = '' pada href '/admin').
export interface MenuAdmin { key: string; href: string; label: string }

export const MENU_ADMIN: MenuAdmin[] = [
  { key: 'dashboard', href: '/admin', label: '🏠 Dashboard' },
  { key: 'analitik', href: '/admin/analitik', label: '📈 Analitik' },
  { key: 'event', href: '/admin/event', label: '🗓️ Event' },
  { key: 'produk', href: '/admin/produk', label: '🛍️ Produk' },
  { key: 'pesanan', href: '/admin/pesanan', label: '📦 Pesanan' },
  { key: 'voucher', href: '/admin/voucher', label: '🎟️ Voucher' },
  { key: 'kelas-bermain', href: '/admin/kelas-bermain', label: '🎈 Ide Bermain' },
  { key: 'fokus-area', href: '/admin/fokus-area', label: '🧩 Fokus Area' },
  { key: 'kategori-usia', href: '/admin/kategori-usia', label: '👶 Kategori Usia' },
  { key: 'artikel', href: '/admin/artikel', label: '📝 Artikel' },
  { key: 'video', href: '/admin/video', label: '📺 Video' },
  { key: 'langganan', href: '/admin/langganan', label: '💳 Langganan' },
  { key: 'paket', href: '/admin/paket', label: '🎟️ Paket' },
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
  { key: 'psikolog', href: '/admin/psikolog', label: '🧠 Psikolog' },
  { key: 'users', href: '/admin/users', label: '👤 Pengguna' },
  { key: 'reminder', href: '/admin/reminder', label: '📣 Reminder' },
  { key: 'akses-menu', href: '/admin/akses-menu', label: '🔐 Akses Menu' },
];

// role yang bisa diatur aksesnya (super user selalu full)
export type RoleAkses = 'admin' | 'investor' | 'guru';
export const ROLE_AKSES: { key: RoleAkses; label: string }[] = [
  { key: 'admin', label: 'Admin' },
  { key: 'investor', label: 'Investor' },
  { key: 'guru', label: 'Guru' },
];

export interface AksesMenu { admin: string[]; investor: string[]; guru: string[] }

// menu yang selalu khusus super user (tak muncul di matriks)
export const MENU_SUPER_TETAP = ['akses-menu'];
// menu yang bisa dikonfigurasi di matriks (kecuali dashboard & akses-menu)
export const KEY_KONFIGURABEL = MENU_ADMIN.map((m) => m.key).filter((k) => k !== 'dashboard' && !MENU_SUPER_TETAP.includes(k));
// default: menu sensitif hanya super user (admin pun tak dapat kecuali dicentang)
// 'paket' ikut sensitif: paket menentukan HARGA, jangan terbuka untuk semua admin diam-diam.
const SENSITIF = ['keuangan', 'users', 'pengaturan-bayar', 'pengaturan-trial', 'sponsor', 'paket'];
export const DEFAULT_AKSES: AksesMenu = {
  admin: KEY_KONFIGURABEL.filter((k) => !SENSITIF.includes(k)),
  investor: [],
  guru: [],
};

/** segmen key dari path admin (mis. /admin/keuangan/kpi → 'keuangan'). */
export function keyMenuDariPath(pathname: string): string {
  const seg = pathname.replace(/^\/admin\/?/, '').split('/')[0];
  return seg || 'dashboard';
}

/** Kumpulan menu yang boleh diakses user berdasarkan role-nya (gabungan). */
export function menuUntukRole(akses: AksesMenu, role: { is_admin?: boolean; is_investor?: boolean; is_guru?: boolean }): Set<string> {
  const set = new Set<string>();
  if (role.is_admin) akses.admin.forEach((k) => set.add(k));
  if (role.is_investor) akses.investor.forEach((k) => set.add(k));
  if (role.is_guru) akses.guru.forEach((k) => set.add(k));
  return set;
}

// ——— Akses Fitur Admin, Guru & Psikolog (diatur super user) ———
export type RoleFitur = 'admin' | 'guru' | 'psikolog';
export const ROLE_FITUR: { key: RoleFitur; label: string }[] = [
  { key: 'psikolog', label: 'Psikolog' },
  { key: 'guru', label: 'Guru' },
  { key: 'admin', label: 'Admin' },
];
export type FiturKey = 'chat' | 'nilai' | 'produk' | 'event' | 'materi';
export const FITUR_AKSES: { key: FiturKey; label: string }[] = [
  { key: 'chat', label: '💬 Chat / Konsultasi Psikolog' },
  { key: 'nilai', label: '📋 Memberi Nilai Perkembangan' },
  { key: 'produk', label: '🛍️ Rekomendasi Produk' },
  { key: 'event', label: '🎈 Rekomendasi Event' },
  { key: 'materi', label: '🏠 Rekomendasi Materi di Rumah' },
];
// penanda bahwa konfigurasi sudah versi berisi chat/nilai (utk migrasi config lama)
export const FITUR_MARK = '_v2';
export interface AksesFitur { admin: string[]; guru: string[]; psikolog: string[] }
// default: admin, guru & psikolog boleh semua fitur
export const DEFAULT_FITUR: AksesFitur = {
  admin: FITUR_AKSES.map((f) => f.key),
  guru: FITUR_AKSES.map((f) => f.key),
  psikolog: FITUR_AKSES.map((f) => f.key),
};

/** Fitur yang boleh dipakai user (gabungan role admin/guru/psikolog). */
export function fiturUntukRole(fitur: AksesFitur, role: { is_admin?: boolean; is_guru?: boolean; is_psikolog?: boolean }): Set<string> {
  const set = new Set<string>();
  if (role.is_admin) fitur.admin.forEach((k) => set.add(k));
  if (role.is_guru) fitur.guru.forEach((k) => set.add(k));
  if (role.is_psikolog) fitur.psikolog.forEach((k) => set.add(k));
  return set;
}
