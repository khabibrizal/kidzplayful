// src/lib/domain/__tests__/entitlement.test.ts
// Matriks hak akses diuji di sini, BUKAN dengan memeriksa 7 halaman satu per satu.
import { describe, it, expect } from 'vitest';
import { hakAksesAnak, hakAksesAkun, HAK_KOSONG } from '../entitlement';
import type { PaketLangganan, BarisLanggananAnak } from '@/lib/game/tipe';

const paket = (kode: string, urutan: number, lebih: Partial<PaketLangganan> = {}): PaketLangganan => ({
  id: `id-${kode}`, kode, nama: kode, deskripsi: null, benefit: [], harga_bulanan: 75000,
  diskon_keluarga: [], akses_ide_bermain: true, akses_game: true, akses_video: true,
  akses_komunitas: true, worksheet: false, konsultasi_gratis_jumlah: 0,
  konsultasi_gratis_satuan: 'bulan', rapor_bulanan: false, urutan, aktif: true, ...lebih,
});

const BASIC = paket('basic', 10, { konsultasi_gratis_jumlah: 1, konsultasi_gratis_satuan: 'langganan' });
const PRESCHOOL = paket('preschool', 20, { worksheet: true, rapor_bulanan: true, konsultasi_gratis_jumlah: 1 });
const map = new Map([[BASIC.id, BASIC], [PRESCHOOL.id, PRESCHOOL]]);

const baris = (lebih: Partial<BarisLanggananAnak> = {}): BarisLanggananAnak =>
  ({ anak_id: 'a1', paket_id: null, paket_berikutnya_id: null, aktif_sampai: null, ...lebih });

const trial = { trialMulai: '2026-06-01', trialHari: 30, tenggangHari: 3, trialPaketId: BASIC.id };
const kini = new Date('2026-08-01T00:00:00Z');

describe('hakAksesAnak', () => {
  it('anak berbayar aktif memakai hak paketnya', () => {
    const h = hakAksesAnak(baris({ paket_id: PRESCHOOL.id, aktif_sampai: '2026-09-01' }), map, trial, kini);
    expect(h.status).toBe('aktif');
    expect(h.worksheet).toBe(true);
    expect(h.raporBulanan).toBe(true);
    expect(h.konsultasiGratis).toEqual({ jumlah: 1, satuan: 'bulan' });
  });

  it('anak Basic aktif TIDAK dapat worksheet & rapor bulanan', () => {
    const h = hakAksesAnak(baris({ paket_id: BASIC.id, aktif_sampai: '2026-09-01' }), map, trial, kini);
    expect(h.status).toBe('aktif');
    expect(h.game).toBe(true);
    expect(h.worksheet).toBe(false);
    expect(h.raporBulanan).toBe(false);
    expect(h.konsultasiGratis).toEqual({ jumlah: 1, satuan: 'langganan' });
  });

  it('anak tanpa baris langganan tapi akun masih trial memakai paket acuan trial', () => {
    const trialAktif = { ...trial, trialMulai: '2026-07-20' };
    const h = hakAksesAnak(null, map, trialAktif, kini);
    expect(h.status).toBe('trial');
    expect(h.paket?.kode).toBe('basic');
    expect(h.worksheet).toBe(false);
    expect(h.game).toBe(true);
  });

  it('trial yang sudah lewat 30 hari + tenggang jadi kadaluarsa', () => {
    const h = hakAksesAnak(null, map, trial, kini);   // mulai 1 Juni, kini 1 Agustus
    expect(h.status).toBe('kadaluarsa');
    expect(h.paket).toBeNull();
  });

  it('lewat masa aktif tapi masih tenggang tetap memakai paket terakhir', () => {
    const h = hakAksesAnak(baris({ paket_id: PRESCHOOL.id, aktif_sampai: '2026-07-31' }), map, trial, kini);
    expect(h.status).toBe('tenggang');
    expect(h.worksheet).toBe(true);
  });

  it('kadaluarsa tidak punya hak konten apa pun', () => {
    const h = hakAksesAnak(baris({ paket_id: PRESCHOOL.id, aktif_sampai: '2026-06-01' }), map, trial, kini);
    expect(h.status).toBe('kadaluarsa');
    expect(h).toMatchObject({ ...HAK_KOSONG, status: 'kadaluarsa', paket: null });
  });

  it('paket_id yang tak ada di master jatuh ke hak kosong, bukan melempar', () => {
    const h = hakAksesAnak(baris({ paket_id: 'id-hilang', aktif_sampai: '2026-09-01' }), map, trial, kini);
    expect(h.status).toBe('aktif');
    expect(h.paket).toBeNull();
    expect(h.worksheet).toBe(false);
  });

  it('akun tanpa trial_mulai (data lama) tidak melempar', () => {
    const h = hakAksesAnak(null, map, { ...trial, trialMulai: null }, kini);
    expect(h.status).toBe('kadaluarsa');
  });

  it('peta paket kosong (migrasi belum jalan) tetap aman', () => {
    const h = hakAksesAnak(null, new Map(), { ...trial, trialMulai: '2026-07-20' }, kini);
    expect(h.status).toBe('trial');
    expect(h.paket).toBeNull();
    expect(h.worksheet).toBe(false);
  });
});

describe('hakAksesAkun', () => {
  const hakUntuk = (paketId: string | null, aktifSampai: string | null) =>
    hakAksesAnak(baris({ paket_id: paketId, aktif_sampai: aktifSampai }), map, trial, kini);

  it('memakai paket TERTINGGI di antara anak yang aktif', () => {
    const akun = hakAksesAkun([hakUntuk(BASIC.id, '2026-09-01'), hakUntuk(PRESCHOOL.id, '2026-09-01')]);
    expect(akun.paketTertinggi?.kode).toBe('preschool');
    expect(akun.diskonKode).toBe('preschool');
    expect(akun.komunitas).toBe(true);
  });

  it('urutan anak tidak memengaruhi hasil', () => {
    const akun = hakAksesAkun([hakUntuk(PRESCHOOL.id, '2026-09-01'), hakUntuk(BASIC.id, '2026-09-01')]);
    expect(akun.paketTertinggi?.kode).toBe('preschool');
  });

  it('anak yang kadaluarsa tidak ikut dihitung', () => {
    const akun = hakAksesAkun([hakUntuk(PRESCHOOL.id, '2026-06-01'), hakUntuk(BASIC.id, '2026-09-01')]);
    expect(akun.paketTertinggi?.kode).toBe('basic');
  });

  it('akun tanpa anak aktif tidak punya paket tertinggi', () => {
    expect(hakAksesAkun([])).toEqual({ paketTertinggi: null, diskonKode: null, komunitas: false });
    const akun = hakAksesAkun([hakUntuk(PRESCHOOL.id, '2026-06-01')]);
    expect(akun.paketTertinggi).toBeNull();
    expect(akun.diskonKode).toBeNull();
  });
});
