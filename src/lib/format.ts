// src/lib/format.ts — util format tanggal & rupiah (Indonesia)
export function formatTanggal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
export function formatRupiah(n: number): string {
  return 'Rp ' + (n || 0).toLocaleString('id-ID');
}

// Rubrik PAUD untuk Catatan Perkembangan Bermain
export const ASPEK_PAUD = [
  { key: 'fisik_motorik', label: 'Fisik-Motorik' },
  { key: 'sosial_emosional', label: 'Sosial-Emosional' },
  { key: 'kognitif', label: 'Kognitif' },
  { key: 'bahasa', label: 'Bahasa' },
];
export const SKALA_PAUD: { kode: string; teks: string; warna: string; bg: string }[] = [
  { kode: 'BB', teks: 'Belum Berkembang', warna: '#b3261e', bg: '#fde8e6' },
  { kode: 'MB', teks: 'Mulai Berkembang', warna: '#b88600', bg: '#fff3d6' },
  { kode: 'BSH', teks: 'Berkembang Sesuai Harapan', warna: '#3a78d6', bg: '#d6e6ff' },
  { kode: 'BSB', teks: 'Berkembang Sangat Baik', warna: '#1c7a43', bg: '#dff5e6' },
];
export function metaSkala(kode: string) {
  return SKALA_PAUD.find((s) => s.kode === kode) ?? { kode, teks: kode, warna: 'var(--abu)', bg: '#eee' };
}

// Label + warna status pesanan Store
export const STATUS_PESANAN: Record<string, { teks: string; warna: string; bg: string }> = {
  menunggu_ongkir: { teks: 'Menunggu ongkir', warna: '#b88600', bg: '#fff3d6' },
  menunggu_bayar: { teks: 'Menunggu pembayaran', warna: '#b88600', bg: '#fff3d6' },
  dibayar: { teks: 'Menunggu verifikasi', warna: '#3a78d6', bg: '#d6e6ff' },
  diproses: { teks: 'Diproses', warna: '#7c5cd6', bg: '#efe7fb' },
  dikirim: { teks: 'Dikirim', warna: '#1c7a43', bg: '#dff5e6' },
  selesai: { teks: 'Selesai', warna: '#1c7a43', bg: '#dff5e6' },
  batal: { teks: 'Dibatalkan', warna: '#b3261e', bg: '#fde8e6' },
};
