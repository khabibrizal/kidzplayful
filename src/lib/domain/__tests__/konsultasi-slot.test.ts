// src/lib/domain/__tests__/konsultasi-slot.test.ts
import { describe, it, expect } from 'vitest';
import { memakaiSlotKonsultasi, draftKedaluwarsa, keadaanSlot } from '../konsultasi-slot';

const kini = new Date('2026-08-21T05:00:00Z');   // 12:00 WIB
const nanti = '2026-08-22T05:00:00Z';            // batas bayar besok
const tadi = '2026-08-20T05:00:00Z';             // batas bayar sudah lewat

describe('memakaiSlotKonsultasi', () => {
  it('sesi berbayar TANPA bukti tidak memakai slot — ini inti aturannya', () => {
    expect(memakaiSlotKonsultasi({ status: 'menunggu_bayar', total: 150000, buktiUrl: null })).toBe(false);
    // Baris lama (sebelum 0096) lahir sebagai 'menunggu' walau berbayar; juga tak boleh menahan slot.
    expect(memakaiSlotKonsultasi({ status: 'menunggu', total: 150000, buktiUrl: null })).toBe(false);
  });

  it('bukti terunggah → slot langsung terpakai, walau belum diverifikasi', () => {
    expect(memakaiSlotKonsultasi({ status: 'menunggu_bayar', total: 150000, buktiUrl: 'bukti/x.jpg' })).toBe(true);
  });

  it('sesi bertotal 0 (kuota paket / diskon member 100%) memakai slot sejak awal', () => {
    expect(memakaiSlotKonsultasi({ status: 'menunggu', total: 0, buktiUrl: null })).toBe(true);
    expect(memakaiSlotKonsultasi({ status: 'menunggu', total: null, buktiUrl: null })).toBe(true);
  });

  it('diterima memakai slot; ditolak/batal/selesai tidak', () => {
    expect(memakaiSlotKonsultasi({ status: 'diterima', total: 150000, buktiUrl: 'bukti/x.jpg' })).toBe(true);
    for (const st of ['ditolak', 'batal', 'selesai']) {
      expect(memakaiSlotKonsultasi({ status: st, total: 150000, buktiUrl: 'bukti/x.jpg' })).toBe(false);
    }
  });
});

describe('draftKedaluwarsa', () => {
  it('draft tanpa bukti yang lewat batas = hangus', () => {
    expect(draftKedaluwarsa({ status: 'menunggu_bayar', total: 1, buktiUrl: null, batasBayar: tadi }, kini)).toBe(true);
  });
  it('masih dalam batas, sudah ada bukti, atau tanpa batas = belum hangus', () => {
    expect(draftKedaluwarsa({ status: 'menunggu_bayar', total: 1, buktiUrl: null, batasBayar: nanti }, kini)).toBe(false);
    expect(draftKedaluwarsa({ status: 'menunggu_bayar', total: 1, buktiUrl: 'b.jpg', batasBayar: tadi }, kini)).toBe(false);
    expect(draftKedaluwarsa({ status: 'menunggu_bayar', total: 1, buktiUrl: null, batasBayar: null }, kini)).toBe(false);
  });
  it('status lain tak pernah dianggap hangus', () => {
    expect(draftKedaluwarsa({ status: 'diterima', total: 1, buktiUrl: null, batasBayar: tadi }, kini)).toBe(false);
  });
});

describe('keadaanSlot', () => {
  const buat = (l: Partial<Parameters<typeof keadaanSlot>[0]>) =>
    keadaanSlot({ status: 'menunggu_bayar', total: 150000, buktiUrl: null, batasBayar: nanti, ...l }, kini);

  it('membedakan aman / draft / hangus', () => {
    expect(buat({})).toBe('draft');
    expect(buat({ buktiUrl: 'b.jpg' })).toBe('aman');
    expect(buat({ batasBayar: tadi })).toBe('hangus');
    expect(buat({ status: 'diterima' })).toBe('aman');
    expect(buat({ status: 'ditolak' })).toBe('tak-relevan');
  });

  it('hangus diperiksa LEBIH DULU daripada draft', () => {
    // Kalau urutannya terbalik, sesi hangus akan tampil sebagai "menunggu bayar" selamanya.
    expect(buat({ batasBayar: tadi, status: 'menunggu_bayar' })).toBe('hangus');
  });
});
