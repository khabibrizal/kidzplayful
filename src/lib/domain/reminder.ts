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

/** Jadwal satu event, termasuk jadwal khusus per kelas (Baby/Toddler). */
export interface JadwalEvent {
  tanggal: string | null;
  jam_mulai: string | null;
  jam_selesai: string | null;
  baby_tanggal?: string | null;
  baby_jam_mulai?: string | null;
  baby_jam_selesai?: string | null;
  toddler_tanggal?: string | null;
  toddler_jam_mulai?: string | null;
  toddler_jam_selesai?: string | null;
}

/**
 * Pilih tanggal & jam yang BENAR untuk sebuah pendaftaran.
 *
 * Event yang dipisah Baby/Toddler menyimpan jadwalnya di kolom per kelas, dan
 * `event.jam_mulai` level atas sering KOSONG di event seperti itu — akibatnya pesan
 * reminder tidak memuat jam sama sekali. Jadi: pakai jadwal kelas bila ada, dan
 * jatuh ke jadwal event untuk kelas 'gabungan' atau bila kolom kelasnya kosong.
 */
export function jadwalUntukKelas(ev: JadwalEvent, kelas: string | null): { tanggal: string | null; jamMulai: string | null; jamSelesai: string | null } {
  const pakai = (tgl?: string | null, m?: string | null, s?: string | null) =>
    (m || s || tgl) ? { tanggal: tgl ?? ev.tanggal, jamMulai: m ?? null, jamSelesai: s ?? null } : null;

  const dari =
    kelas === 'baby' ? pakai(ev.baby_tanggal, ev.baby_jam_mulai, ev.baby_jam_selesai)
    : kelas === 'toddler' ? pakai(ev.toddler_tanggal, ev.toddler_jam_mulai, ev.toddler_jam_selesai)
    : null;

  return dari ?? { tanggal: ev.tanggal, jamMulai: ev.jam_mulai, jamSelesai: ev.jam_selesai };
}
