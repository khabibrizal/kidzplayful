// src/lib/__tests__/reminder-jadwal.test.ts
import { describe, it, expect } from 'vitest';
import { jadwalUntukKelas } from '../domain/reminder';

const EVENT_BIASA = { tanggal: '2026-08-10', jam_mulai: '09:00', jam_selesai: '11:00' };
// Event yang dipisah Baby/Toddler: jam level atas KOSONG — inilah kasus yang membuat
// pesan reminder dulu tidak memuat jam sama sekali.
const EVENT_PISAH = {
  tanggal: '2026-08-10', jam_mulai: null, jam_selesai: null,
  baby_tanggal: '2026-08-10', baby_jam_mulai: '09:00', baby_jam_selesai: '10:00',
  toddler_tanggal: '2026-08-11', toddler_jam_mulai: '13:00', toddler_jam_selesai: '14:30',
};

describe('jadwalUntukKelas', () => {
  it('event tanpa pemisahan kelas → pakai jadwal event', () => {
    expect(jadwalUntukKelas(EVENT_BIASA, 'gabungan')).toEqual({ tanggal: '2026-08-10', jamMulai: '09:00', jamSelesai: '11:00' });
    expect(jadwalUntukKelas(EVENT_BIASA, null)).toEqual({ tanggal: '2026-08-10', jamMulai: '09:00', jamSelesai: '11:00' });
  });

  it('kelas baby → pakai jadwal Baby Class', () => {
    expect(jadwalUntukKelas(EVENT_PISAH, 'baby')).toEqual({ tanggal: '2026-08-10', jamMulai: '09:00', jamSelesai: '10:00' });
  });

  it('kelas toddler → pakai jadwal Toddler Class (tanggalnya pun bisa beda)', () => {
    expect(jadwalUntukKelas(EVENT_PISAH, 'toddler')).toEqual({ tanggal: '2026-08-11', jamMulai: '13:00', jamSelesai: '14:30' });
  });

  it('kelas gabungan pada event terpisah → jatuh ke jadwal event (jam boleh kosong)', () => {
    expect(jadwalUntukKelas(EVENT_PISAH, 'gabungan')).toEqual({ tanggal: '2026-08-10', jamMulai: null, jamSelesai: null });
  });

  it('kolom kelas kosong → jatuh ke jadwal event, BUKAN menghasilkan jam kosong', () => {
    const ev = { ...EVENT_BIASA, baby_tanggal: null, baby_jam_mulai: null, baby_jam_selesai: null };
    expect(jadwalUntukKelas(ev, 'baby')).toEqual({ tanggal: '2026-08-10', jamMulai: '09:00', jamSelesai: '11:00' });
  });
});
