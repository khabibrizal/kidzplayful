// src/lib/domain/__tests__/siklus-kurikulum.test.ts
import { describe, it, expect } from 'vitest';
import {
  tambahBulan, bulanPenuhLewat, siklusBerjalan, bracketUntukUmur,
  konteksKurikulum, statusTemaBracket, kelompokTemaBracket, TANPA_BRACKET,
} from '../siklus-kurikulum';

// Kategori usia per TAHUN — bentuk yang diandaikan skenario pemilik.
const KAT = [
  { id: 'k3', usia_min: 3, usia_max: 3 },
  { id: 'k4', usia_min: 4, usia_max: 4 },
  { id: 'k5', usia_min: 5, usia_max: 5 },
];

describe('tambahBulan', () => {
  it('menambah bulan kalender biasa', () => {
    expect(tambahBulan('2026-01-15', 1)).toBe('2026-02-15');
    expect(tambahBulan('2026-01-15', 12)).toBe('2027-01-15');
  });
  it('menjepit akhir bulan, tidak meluber ke bulan berikutnya', () => {
    // Kalau meluber, siklus anak bergeser maju sehari tiap beberapa bulan dan tak pernah
    // dikoreksi — 31 Jan + 1 bulan harus 28 Feb, bukan 3 Mar.
    expect(tambahBulan('2026-01-31', 1)).toBe('2026-02-28');
    expect(tambahBulan('2024-01-31', 1)).toBe('2024-02-29');   // kabisat
    expect(tambahBulan('2026-03-31', 1)).toBe('2026-04-30');
  });
  it('menyeberang tahun', () => {
    expect(tambahBulan('2026-12-10', 2)).toBe('2027-02-10');
  });
});

describe('bulanPenuhLewat', () => {
  it('menghitung hanya bulan yang GENAP terlewati', () => {
    expect(bulanPenuhLewat('2026-01-15', '2026-02-14')).toBe(0);   // sehari sebelum
    expect(bulanPenuhLewat('2026-01-15', '2026-02-15')).toBe(1);
    expect(bulanPenuhLewat('2026-01-15', '2027-01-15')).toBe(12);
  });
  it('tak pernah negatif', () => {
    expect(bulanPenuhLewat('2026-05-01', '2026-01-01')).toBe(0);
  });
});

describe('siklusBerjalan', () => {
  it('pelanggan tahunan TIDAK membuka 12 bulan sekaligus', () => {
    // Inti perbaikan: `bulan_kurikulum` naik +12 saat bayar, tapi kalender menahannya di 1.
    const r = siklusBerjalan({ mulai: '2026-08-01', hariIni: '2026-08-22', bulanDibayar: 12 });
    expect(r.siklus).toBe(1);
    expect(r.mulaiSiklus).toBe('2026-08-01');
  });
  it('naik satu tiap bulan kalender, sampai batas yang dibayar', () => {
    expect(siklusBerjalan({ mulai: '2026-01-10', hariIni: '2026-03-10', bulanDibayar: 12 }).siklus).toBe(3);
    expect(siklusBerjalan({ mulai: '2026-01-10', hariIni: '2026-03-09', bulanDibayar: 12 }).siklus).toBe(2);
  });
  it('anak yang berhenti berlangganan tidak ikut naik', () => {
    // Bulan yang tidak aktif tidak menambah hitungan: kalender sudah 10 bulan, dibayar 3.
    const r = siklusBerjalan({ mulai: '2026-01-10', hariIni: '2026-11-10', bulanDibayar: 3 });
    expect(r.siklus).toBe(3);
    expect(r.mulaiSiklus).toBe('2026-03-10');
  });
  it('trial & Basic tetap di bulan ke-1', () => {
    expect(siklusBerjalan({ mulai: '2026-01-10', hariIni: '2026-09-10', bulanDibayar: 0 }).siklus).toBe(1);
  });
  it('jam kurikulum belum tersimpan (0104 belum jalan) → PAKAI PERILAKU LAMA, jangan mengunci', () => {
    // Memilih siklus 1 di sini akan mengunci tema bulan ke-2+ untuk anak yang tadinya sudah
    // membukanya — terbaca sebagai fitur dicabut, bukan migrasi yang belum jalan.
    const r = siklusBerjalan({ mulai: null, hariIni: '2026-08-22', bulanDibayar: 5 });
    expect(r).toEqual({ siklus: 5, mulaiSiklus: '2026-08-22' });
    // Tanpa langganan pun tetap minimal 1.
    expect(siklusBerjalan({ mulai: null, hariIni: '2026-08-22', bulanDibayar: 0 }).siklus).toBe(1);
  });
});

describe('bracketUntukUmur', () => {
  it('memilih kategori yang memuat umur itu', () => {
    expect(bracketUntukUmur(KAT, 4)).toBe('k4');
  });
  it('umur di luar semua kategori → tanpa bracket', () => {
    expect(bracketUntukUmur(KAT, 1)).toBe(TANPA_BRACKET);
  });
  it('rentang BERTUMPUK: yang paling sempit menang, dan hasilnya deterministik', () => {
    // Data live pemilik punya 1–3 th dan 3–6 th yang sama-sama memuat usia 3.
    const tumpuk = [{ id: 'lebar', usia_min: 1, usia_max: 6 }, { id: 'sempit', usia_min: 3, usia_max: 3 }];
    expect(bracketUntukUmur(tumpuk, 3)).toBe('sempit');
    expect(bracketUntukUmur([...tumpuk].reverse(), 3)).toBe('sempit');
  });
  it('umur tak diketahui → tanpa bracket', () => {
    expect(bracketUntukUmur(KAT, NaN)).toBe(TANPA_BRACKET);
  });
});

describe('skenario pemilik: join 3th11bl, ulang tahun di tengah siklus', () => {
  // Lahir 1 Sep 2022. Mulai kurikulum 1 Ags 2026 → umur 3 th 11 bl.
  const dasar = { lahir: '2022-09-01', mulai: '2026-08-01', kategori: KAT, bulanDibayar: 12 };

  it('siklus 1: umur dihitung 3th11bl → bracket "3 tahun", bulan ke-1 di bracket itu', () => {
    const ctx = konteksKurikulum({ ...dasar, hariIni: '2026-08-05' });
    expect(ctx.siklus).toBe(1);
    expect(ctx.umurBeku).toBe(3);
    expect(ctx.bracket).toBe('k3');
    expect(ctx.bulanDalamBracket).toBe(1);
  });

  it('ULANG TAHUN DI TENGAH SIKLUS: bracket TIDAK berubah — inilah pembekuannya', () => {
    // 2 Sep 2026 anak sudah 4 tahun, tapi siklus 1 masih berjalan sampai 31 Ags…
    const ctx = konteksKurikulum({ ...dasar, hariIni: '2026-08-31' });
    expect(ctx.umurBeku).toBe(3);
    expect(ctx.bracket).toBe('k3');
    // …dan bahkan setelah ulang tahunnya, selama siklusnya belum berganti.
    const masihSiklus1 = konteksKurikulum({ ...dasar, mulai: '2026-08-15', hariIni: '2026-09-10' });
    expect(masihSiklus1.siklus).toBe(1);
    expect(masihSiklus1.umurBeku).toBe(3);      // umur pada 15 Ags, bukan pada 10 Sep
    expect(masihSiklus1.bracket).toBe('k3');
  });

  it('daftar tema TIDAK berubah saat melewati ulang tahun di dalam satu siklus', () => {
    // Konsekuensi yang sebenarnya dituju: bukan sekadar angka umur, tapi tema yang tampil.
    // Siklus dimulai 15 Ags (anak masih 3 th); ulang tahun ke-4 jatuh 1 Sep; siklus 2 baru
    // dimulai 15 Sep. Sepanjang 15 Ags–14 Sep, daftarnya wajib identik.
    const sebelumUlangTahun = konteksKurikulum({ ...dasar, mulai: '2026-08-15', hariIni: '2026-08-31' });
    const sesudahUlangTahun = konteksKurikulum({ ...dasar, mulai: '2026-08-15', hariIni: '2026-09-14' });
    expect(sesudahUlangTahun.siklus).toBe(1);              // masih siklus yang sama
    expect(sesudahUlangTahun.bracket).toBe(sebelumUlangTahun.bracket);
    expect(sesudahUlangTahun.umurBeku).toBe(sebelumUlangTahun.umurBeku);
    expect(sesudahUlangTahun.maksBulan).toEqual(sebelumUlangTahun.maksBulan);

    const temaK3 = { kategori_usia_id: 'k3', bulan_kurikulum: 1 };
    const temaK4 = { kategori_usia_id: 'k4', bulan_kurikulum: 1 };
    const temaLama = { usia_min: 0, usia_max: 3, bulan_kurikulum: 1 };
    for (const ctx of [sebelumUlangTahun, sesudahUlangTahun]) {
      expect(statusTemaBracket(temaK3, ctx)).toBe('terbuka');
      expect(statusTemaBracket(temaK4, ctx)).toBe('terkunci');
      expect(statusTemaBracket(temaLama, ctx)).toBe('terbuka');   // umur beku 3, bukan 4
    }
  });

  it('siklus 2: umur DIHITUNG ULANG → 4 tahun → bracket "4 tahun", kembali ke bulan ke-1', () => {
    const ctx = konteksKurikulum({ ...dasar, hariIni: '2026-09-01' });
    expect(ctx.siklus).toBe(2);
    expect(ctx.mulaiSiklus).toBe('2026-09-01');
    expect(ctx.umurBeku).toBe(4);
    expect(ctx.bracket).toBe('k4');
    // TIDAK bulan ke-2: bracket baru dimulai dari bulan ke-1.
    expect(ctx.bulanDalamBracket).toBe(1);
  });

  it('bracket lama tetap tercatat sudah dilalui 1 bulan (temanya tak boleh hilang)', () => {
    const ctx = konteksKurikulum({ ...dasar, hariIni: '2026-09-01' });
    expect(ctx.maksBulan).toEqual({ k3: 1, k4: 1 });
  });

  it('bertahan setahun di bracket 4 tahun → bulan di bracket itu ikut naik', () => {
    const ctx = konteksKurikulum({ ...dasar, hariIni: '2026-12-01', bulanDibayar: 12 });
    expect(ctx.siklus).toBe(5);
    expect(ctx.bracket).toBe('k4');
    expect(ctx.bulanDalamBracket).toBe(4);      // Sep, Okt, Nov, Des
    expect(ctx.maksBulan).toEqual({ k3: 1, k4: 4 });
  });
});

describe('statusTemaBracket', () => {
  const ctx = konteksKurikulum({
    lahir: '2022-09-01', mulai: '2026-08-01', kategori: KAT, bulanDibayar: 12, hariIni: '2026-09-01',
  }); // siklus 2, bracket k4 bulan 1; k3 pernah dilalui 1 bulan

  it('tema bracket berjalan, bulan yang sudah dicapai → terbuka', () => {
    expect(statusTemaBracket({ kategori_usia_id: 'k4', bulan_kurikulum: 1 }, ctx)).toBe('terbuka');
  });
  it('tema bracket berjalan, bulan depan → judul saja', () => {
    expect(statusTemaBracket({ kategori_usia_id: 'k4', bulan_kurikulum: 2 }, ctx)).toBe('kunci-judul');
  });
  it('tema bracket berjalan, dua bulan ke depan → terkunci', () => {
    expect(statusTemaBracket({ kategori_usia_id: 'k4', bulan_kurikulum: 3 }, ctx)).toBe('terkunci');
  });
  it('tema bracket LAMA yang sudah dilalui tetap TERBUKA selamanya', () => {
    expect(statusTemaBracket({ kategori_usia_id: 'k3', bulan_kurikulum: 1 }, ctx)).toBe('terbuka');
  });
  it('tema bracket lama yang belum sempat dicapai tetap terkunci, dan bukan "bulan depan"', () => {
    // Anak hanya 1 bulan di k3, jadi bulan ke-2 k3 tak pernah ia jalani — dan ia sudah
    // meninggalkan kategori itu, jadi tak boleh dijanjikan sebagai "bulan depan".
    expect(statusTemaBracket({ kategori_usia_id: 'k3', bulan_kurikulum: 2 }, ctx)).toBe('terkunci');
  });
  it('tema kategori yang belum pernah dijalani → terkunci', () => {
    expect(statusTemaBracket({ kategori_usia_id: 'k5', bulan_kurikulum: 1 }, ctx)).toBe('terkunci');
  });

  it('materi lama TANPA kategori memakai rentang usia vs UMUR BEKU', () => {
    // Umur beku siklus 2 = 4 tahun.
    expect(statusTemaBracket({ usia_min: 3, usia_max: 6, bulan_kurikulum: 1 }, ctx)).toBe('terbuka');
    expect(statusTemaBracket({ usia_min: 0, usia_max: 2, bulan_kurikulum: 1 }, ctx)).toBe('terkunci');
  });
  it('tema tanpa bulan kurikulum dianggap terbuka (materi lama / migrasi belum jalan)', () => {
    expect(statusTemaBracket({ kategori_usia_id: 'k4' }, ctx)).toBe('terbuka');
    expect(statusTemaBracket({ usia_min: 3, usia_max: 6 }, ctx)).toBe('terbuka');
  });
  it('tanggal lahir kosong → usia tidak menyaring apa pun', () => {
    const tanpaLahir = konteksKurikulum({
      lahir: null, mulai: '2026-08-01', kategori: KAT, bulanDibayar: 1, hariIni: '2026-08-10',
    });
    expect(statusTemaBracket({ usia_min: 5, usia_max: 6, bulan_kurikulum: 1 }, tanpaLahir)).toBe('terbuka');
  });
});

describe('kelompokTemaBracket', () => {
  // Siklus 2, bracket k4 bulan 1; k3 sudah dilalui 1 bulan.
  const ctx = konteksKurikulum({
    lahir: '2022-09-01', mulai: '2026-08-01', kategori: KAT, bulanDibayar: 12, hariIni: '2026-09-01',
  });
  const tema = [
    { id: 'a', kategori_usia_id: 'k4', bulan_kurikulum: 1, urutan: 1 },
    { id: 'b', kategori_usia_id: 'k4', bulan_kurikulum: 1, urutan: 2 },
    { id: 'c', kategori_usia_id: 'k4', bulan_kurikulum: 2, urutan: 1 },
    { id: 'd', kategori_usia_id: 'k4', bulan_kurikulum: 3, urutan: 1 },
    { id: 'e', kategori_usia_id: 'k3', bulan_kurikulum: 1, urutan: 1 },
    { id: 'f', kategori_usia_id: 'k5', bulan_kurikulum: 1, urutan: 1 },
  ];

  it('bulan ini hanya bracket berjalan; bracket lama masuk "sudah terbuka"', () => {
    const g = kelompokTemaBracket(tema, ctx);
    expect(g.bulanIni.map((x) => x.id)).toEqual(['a', 'b']);
    expect(g.sudahTerbuka.map((x) => x.id)).toEqual(['e']);
  });
  it('bulan depan hanya bracket berjalan', () => {
    expect(kelompokTemaBracket(tema, ctx).bulanDepan.map((x) => x.id)).toEqual(['c']);
  });
  it('terkunci memuat bulan depan DAN yang lebih jauh — tak ada yang disembunyikan', () => {
    const g = kelompokTemaBracket(tema, ctx);
    expect(g.terkunci.map((x) => x.id).sort()).toEqual(['c', 'd', 'f']);
    // Semua tema terhitung sekali di gabungan terbuka + terkunci.
    expect(g.bulanIni.length + g.sudahTerbuka.length + g.terkunci.length).toBe(tema.length);
  });
});
