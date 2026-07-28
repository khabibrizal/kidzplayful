// src/lib/domain/__tests__/reminder.test.ts
import { describe, it, expect } from 'vitest';
import { susunPesanReminder } from '../reminder';

const dasar = { nama: 'Sari', judul: 'Slime Party', tanggal: '2026-08-01', tanggalFmt: '1 Agustus 2026', jamMulai: '09:00', jamSelesai: '11:00', lokasi: 'Studio A', anakNama: ['Nayla'], kelas: 'baby' as string | null, pesanManual: 'Bawa baju ganti ya.' };

describe('susunPesanReminder', () => {
  it('memuat sapaan, teks pengingat (judul), detail, nama anak, pesan manual', () => {
    const p = susunPesanReminder(dasar);
    expect(p).toContain('Halo Kak Sari');
    expect(p).toContain('Terimakasih sudah mendaftar di Slime Party');
    expect(p).toContain('berikut detail informasinya');
    expect(p).toContain('Slime Party');
    expect(p).toContain('1 Agustus 2026');
    expect(p).toContain('09:00-11:00');
    expect(p).toContain('Studio A');
    expect(p).toContain('Nayla');
    expect(p).toContain('Baby Class');
    expect(p).toContain('Bawa baju ganti ya.');
    expect(p).toContain('— KidzPlayful');
  });
  it('baris Kelas tidak muncul untuk gabungan/null', () => {
    expect(susunPesanReminder({ ...dasar, kelas: 'gabungan' })).not.toContain('Kelas:');
    expect(susunPesanReminder({ ...dasar, kelas: null })).not.toContain('Kelas:');
  });
  it('Toddler Class untuk kelas toddler', () => {
    expect(susunPesanReminder({ ...dasar, kelas: 'toddler' })).toContain('Toddler Class');
  });
  it('pesan manual kosong → tanpa baris manual (tetap valid)', () => {
    const p = susunPesanReminder({ ...dasar, pesanManual: null });
    expect(p).not.toContain('Bawa baju ganti');
    expect(p).toContain('Slime Party');
  });
  it('jam & lokasi opsional', () => {
    const p = susunPesanReminder({ ...dasar, jamMulai: null, jamSelesai: null, lokasi: null });
    expect(p).not.toContain('pukul');
    expect(p).not.toContain('📍');
  });
  it('nama kosong → "Halo Kak 👋"', () => {
    expect(susunPesanReminder({ ...dasar, nama: null })).toContain('Halo Kak 👋');
  });
});
