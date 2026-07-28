// src/lib/domain/reminder.ts — susun pesan WA reminder event (murni, teruji).
export interface InputReminder {
  nama: string | null;
  judul: string;
  tanggal: string | null;
  tanggalFmt?: string;        // tanggal terformat (opsional; fallback ke `tanggal`)
  jamMulai: string | null;
  jamSelesai: string | null;
  lokasi: string | null;
  anakNama: string[];
  kelas: string | null;       // 'baby' | 'toddler' | 'gabungan' | null
  pesanManual: string | null;
}

export function susunPesanReminder(i: InputReminder): string {
  const baris: string[] = [];
  baris.push(`Halo Kak ${i.nama?.trim() ? i.nama.trim() + ' ' : ''}👋`);
  baris.push('');
  baris.push(`Terimakasih sudah mendaftar di ${i.judul}, jangan lupa untuk hadir ya, berikut detail informasinya,`);
  baris.push('');
  baris.push(`📅 *${i.judul}*`);
  const tgl = i.tanggalFmt || i.tanggal;
  if (tgl) {
    const jam = i.jamMulai ? `, pukul ${i.jamMulai}${i.jamSelesai ? `-${i.jamSelesai}` : ''} WIB` : '';
    baris.push(`🗓️ ${tgl}${jam}`);
  }
  if (i.lokasi?.trim()) baris.push(`📍 ${i.lokasi.trim()}`);
  const anak = (i.anakNama ?? []).filter((a) => a && a.trim());
  if (anak.length) baris.push(`🧒 Peserta: ${anak.join(', ')}`);
  const kelasLabel = i.kelas === 'baby' ? 'Baby Class' : i.kelas === 'toddler' ? 'Toddler Class' : null;
  if (kelasLabel) baris.push(`🏷️ Kelas: ${kelasLabel}`);
  if (i.pesanManual?.trim()) { baris.push(''); baris.push(i.pesanManual.trim()); }
  baris.push('');
  baris.push('— KidzPlayful');
  return baris.join('\n');
}
