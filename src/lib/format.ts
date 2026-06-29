// src/lib/format.ts — util format tanggal & rupiah (Indonesia)
export function formatTanggal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
export function formatRupiah(n: number): string {
  return 'Rp ' + (n || 0).toLocaleString('id-ID');
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
