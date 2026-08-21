// src/lib/domain/__tests__/harga.test.ts
import { describe, it, expect } from 'vitest';
import { persenUntukPaket, hargaEventUntukPaket, hargaProdukUntukPaket } from '../harga';

describe('persenUntukPaket', () => {
  const ev = { diskon_paket: { basic: 5, preschool: 10 }, diskon_langganan_persen: 7 };

  it('memakai persen paket bila ada di peta', () => {
    expect(persenUntukPaket(ev, 'preschool')).toBe(10);
    expect(persenUntukPaket(ev, 'basic')).toBe(5);
  });

  it('jatuh ke kolom lama bila paket tak ada di peta', () => {
    expect(persenUntukPaket(ev, 'paket-baru')).toBe(7);
  });

  it('bukan pelanggan tidak dapat diskon', () => {
    expect(persenUntukPaket(ev, null)).toBe(0);
  });

  it('peta kosong / kolom belum ada → kolom lama, lalu 0', () => {
    expect(persenUntukPaket({ diskon_langganan_persen: 8 }, 'basic')).toBe(8);
    expect(persenUntukPaket({}, 'basic')).toBe(0);
    expect(persenUntukPaket({ diskon_paket: null, diskon_langganan_persen: null }, 'basic')).toBe(0);
  });

  it('nol yang DITULIS admin mengalahkan kolom lama', () => {
    // 0 di peta artinya "paket ini sengaja tanpa diskon" — jangan jatuh ke kolom lama.
    expect(persenUntukPaket({ diskon_paket: { basic: 0 }, diskon_langganan_persen: 9 }, 'basic')).toBe(0);
  });

  it('persen dijaga di rentang 0-100', () => {
    expect(persenUntukPaket({ diskon_paket: { basic: 150 } }, 'basic')).toBe(100);
    expect(persenUntukPaket({ diskon_paket: { basic: -5 } }, 'basic')).toBe(0);
  });
});

describe('hargaEventUntukPaket', () => {
  it('memotong harga sesuai persen paket', () => {
    expect(hargaEventUntukPaket({ harga_per_anak: 100000, diskon_paket: { preschool: 10 } }, 'preschool')).toBe(90000);
  });
  it('tanpa paket harga penuh', () => {
    expect(hargaEventUntukPaket({ harga_per_anak: 100000, diskon_paket: { preschool: 10 } }, null)).toBe(100000);
  });
  it('pembulatan ke rupiah terdekat', () => {
    expect(hargaEventUntukPaket({ harga_per_anak: 95000, diskon_paket: { basic: 7 } }, 'basic')).toBe(88350);
  });
});

describe('hargaProdukUntukPaket', () => {
  it('memotong harga produk sesuai persen paket', () => {
    expect(hargaProdukUntukPaket({ harga: 50000, diskon_paket: { preschool: 20 } }, 'preschool')).toBe(40000);
  });
  it('tanpa paket harga penuh', () => {
    expect(hargaProdukUntukPaket({ harga: 50000, diskon_paket: { preschool: 20 } }, null)).toBe(50000);
  });
});
