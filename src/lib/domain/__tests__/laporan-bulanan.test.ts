// src/lib/domain/__tests__/laporan-bulanan.test.ts
import { describe, it, expect } from 'vitest';
import { rentangBulan, ringkasBulan, labelBulan, bulanTerakhir, rapikanDaftar, hitungArea, bulanWib, bulanRekomendasi, deltaTeks, kalimatRingkas } from '../laporan-bulanan';

describe('rentangBulan', () => {
  it('memberi awal & akhir bulan dalam WIB', () => {
    const r = rentangBulan('2026-08');
    // 1 Agu 2026 00:00 WIB = 31 Jul 17:00 UTC; batas akhir = 1 Sep 00:00 WIB
    expect(r.dari).toBe('2026-07-31T17:00:00.000Z');
    expect(r.sampai).toBe('2026-08-31T17:00:00.000Z');
  });
  it('menangani Desember → Januari tahun berikutnya', () => {
    const r = rentangBulan('2026-12');
    expect(r.dari).toBe('2026-11-30T17:00:00.000Z');
    expect(r.sampai).toBe('2026-12-31T17:00:00.000Z');
  });
  it('ym tak sah → bulan berjalan tidak melempar', () => {
    expect(() => rentangBulan('bukan-bulan')).not.toThrow();
  });
});

describe('labelBulan', () => {
  it('menulis nama bulan Indonesia', () => {
    expect(labelBulan('2026-08')).toBe('Agustus 2026');
    expect(labelBulan('2026-01')).toBe('Januari 2026');
  });
});

describe('bulanTerakhir', () => {
  it('mengembalikan N bulan menurun dari bulan berjalan', () => {
    expect(bulanTerakhir(new Date('2026-08-15T00:00:00Z'), 3)).toEqual(['2026-08', '2026-07', '2026-06']);
  });
  it('menyeberangi tahun', () => {
    expect(bulanTerakhir(new Date('2026-01-10T00:00:00Z'), 2)).toEqual(['2026-01', '2025-12']);
  });
});

describe('ringkasBulan', () => {
  const dasar = {
    kegiatan: [
      { jenis: 'ide-bermain' as const, judul: 'Main Air', waktu: '2026-08-02T03:00:00Z' },
      { jenis: 'ide-bermain' as const, judul: 'Main Air', waktu: '2026-08-05T03:00:00Z' },
      { jenis: 'video' as const, judul: 'Lagu Warna', waktu: '2026-08-06T03:00:00Z' },
    ],
    hasilMain: [
      { area_skill: 'kognitif', bintang: 3, durasi_detik: 60, selesai: true },
      { area_skill: 'kognitif', bintang: 2, durasi_detik: 40, selesai: true },
      { area_skill: 'motorik-halus', bintang: 1, durasi_detik: 30, selesai: false },
    ],
    catatan: [{
      judulEvent: 'Kelas Sensorik', dinilai_oleh: 'Bu Ratih',
      penilaian: [{ area: 'Sensorik', indikator: 'Berani menyentuh tekstur baru', nilai: 'BSH' }],
      catatan: 'Sudah mau mencoba pasir kinetik.',
    }],
    event: ['Kelas Sensorik'],
    rekomendasi: 2,
  };

  it('menghitung jumlah kegiatan per jenis', () => {
    const r = ringkasBulan(dasar);
    expect(r.totalKegiatan).toBe(3);
    expect(r.ideBermain).toBe(2);
    expect(r.video).toBe(1);
  });

  it('mengelompokkan Ide Bermain unik beserta jumlah pengulangannya', () => {
    const r = ringkasBulan(dasar);
    expect(r.daftarIdeBermain).toEqual([{ judul: 'Main Air', jumlah: 2 }]);
  });

  it('menghitung sesi game, bintang, menit, dan per area', () => {
    const r = ringkasBulan(dasar);
    expect(r.totalSesi).toBe(3);
    expect(r.totalBintang).toBe(6);
    expect(r.totalMenit).toBe(2);          // 130 detik → 2 menit
    // Definisi `perArea` MELEBAR (lihat `hitungArea`): kini juga menghitung area dari
    // penilaian guru & fokus_area Ide Bermain, bukan hanya `hasil_main.area_skill`.
    // Fixture ini punya satu penilaian guru ber-area 'Sensorik', jadi ia ikut terhitung.
    expect(r.perArea).toMatchObject({ kognitif: 2, 'motorik-halus': 1 });
    expect(r.perArea.Sensorik).toBe(1);
    expect(r.areaTerbanyak).toBe('kognitif');
  });

  it('membawa catatan guru, event, dan jumlah rekomendasi', () => {
    const r = ringkasBulan(dasar);
    expect(r.catatanGuru).toHaveLength(1);
    expect(r.catatanGuru[0].penilaian).toEqual([{ area: 'Sensorik', indikator: 'Berani menyentuh tekstur baru', nilai: 'BSH' }]);
    expect(r.catatanGuru[0].catatan).toBe('Sudah mau mencoba pasir kinetik.');
    expect(r.event).toEqual(['Kelas Sensorik']);
    expect(r.rekomendasi).toBe(2);
  });

  it('membawa rekomendasi psikolog & item apa adanya', () => {
    const r = ringkasBulan({
      ...dasar,
      rekomendasiPsikolog: [{ judul: 'Latihan motorik', isi: 'Ajak meronce.', butir: [{ judul: 'Pagi', isi: '10 menit' }], oleh: 'Arina, M.Psi.' }],
      rekomendasiItem: [
        { jenis: 'produk', judul: 'Papan Meronce', catatan: null, oleh: 'Arina, M.Psi.' },
        { jenis: 'materi', judul: 'Main Pasir', catatan: 'seminggu 2x', oleh: 'Arina, M.Psi.' },
      ],
    });
    expect(r.rekomendasiPsikolog[0].butir).toEqual([{ judul: 'Pagi', isi: '10 menit' }]);
    expect(r.rekomendasiItem.map((i) => i.jenis)).toEqual(['produk', 'materi']);
  });

  it('membawa evaluasi kurikulum apa adanya, beserta peran penilainya', () => {
    const r = ringkasBulan({
      ...dasar,
      evaluasi: [{ judulTema: 'Main Air', tercapai: 2, total: 3, peran: 'ortu', dinilaiOleh: 'Bunda', belum: ['Menuang tanpa tumpah'] }],
    });
    expect(r.evaluasi[0]).toMatchObject({ judulTema: 'Main Air', tercapai: 2, total: 3, peran: 'ortu' });
    expect(r.evaluasi[0].belum).toEqual(['Menuang tanpa tumpah']);
  });

  it('bulan yang HANYA berisi EVALUASI tetap layak dicetak', () => {
    // Orang tua yang rajin mengisi checklist tapi anaknya tak ikut event mana pun tetap
    // berhak atas rapor — kalau tidak, kerja mereka seolah tak tercatat.
    const r = ringkasBulan({
      kegiatan: [], hasilMain: [], catatan: [], event: [], rekomendasi: 0,
      evaluasi: [{ judulTema: 'Meronce', tercapai: 1, total: 2, peran: 'ortu', dinilaiOleh: null, belum: ['x'] }],
    });
    expect(r.adaIsi).toBe(true);
  });

  it('bulan yang HANYA berisi rekomendasi tetap layak dicetak', () => {
    const r = ringkasBulan({
      kegiatan: [], hasilMain: [], catatan: [], event: [], rekomendasi: 1,
      rekomendasiItem: [{ jenis: 'event', judul: 'Kelas Musik', catatan: null, oleh: null }],
    });
    expect(r.adaIsi).toBe(true);
  });

  it('bulan kosong menghasilkan nol, bukan galat', () => {
    const r = ringkasBulan({ kegiatan: [], hasilMain: [], catatan: [], event: [], rekomendasi: 0 });
    expect(r).toMatchObject({ totalKegiatan: 0, totalSesi: 0, totalBintang: 0, totalMenit: 0, areaTerbanyak: null });
    expect(r.adaIsi).toBe(false);
  });

  it('adaIsi true bila ada kegiatan ATAU sesi game', () => {
    expect(ringkasBulan({ ...dasar, hasilMain: [] }).adaIsi).toBe(true);
    expect(ringkasBulan({ ...dasar, kegiatan: [] }).adaIsi).toBe(true);
  });
});

describe('rapikanDaftar', () => {
  it('memberi spasi sesudah koma yang menempel', () => {
    // Bug yang terlihat di rapor Agustus 2026.
    expect(rapikanDaftar('Berjalan,melompat,menjaga keseimbangan'))
      .toBe('Berjalan, melompat, menjaga keseimbangan');
  });
  it('koma yang SUDAH bersih tak diubah', () => {
    expect(rapikanDaftar('a, b, c')).toBe('a, b, c');
  });
  it('ANGKA setelah koma tidak disentuh — "1,5" bukan daftar', () => {
    // Memberi spasi di situ mengubah arti bilangannya.
    expect(rapikanDaftar('berat 1,5 kg')).toBe('berat 1,5 kg');
    expect(rapikanDaftar('a,b dan 2,5 cm')).toBe('a, b dan 2,5 cm');
  });
  it('spasi berlebih dirapikan & ujungnya dipangkas', () => {
    expect(rapikanDaftar('  a,b   c  ')).toBe('a, b c');
  });
  it('null/undefined → string kosong', () => {
    expect(rapikanDaftar(null)).toBe('');
    expect(rapikanDaftar(undefined)).toBe('');
  });
});

describe('hitungArea — tiga sumber, bukan hanya sesi game', () => {
  it('kasus rapor Arsyi: 9 ide bermain, 0 game → area TIDAK lagi kosong', () => {
    // Inilah bug yang dilaporkan: dulu hanya `hasil_main.area_skill` yang dihitung, jadi
    // anak yang tak menyentuh game mendapat "Belum ada data" di rapor yang sudah memuat
    // empat domain perkembangan.
    const h = hitungArea({
      ideBermain: [['motorik-kasar', 'bahasa'], ['motorik-kasar'], ['kognitif']],
      catatan: ['motorik-kasar', 'bahasa'],
      game: [],
    });
    expect(h.terbanyak).toEqual(['motorik-kasar']);
    expect(h.perArea['motorik-kasar']).toBe(3);
    expect(h.label).toBe('motorik-kasar');
    expect(h.dariMana).toBe('dihitung dari 3 ide bermain & 2 penilaian guru');
  });

  it('SERI diakui, tidak dipaksa jadi satu', () => {
    const h = hitungArea({ ideBermain: [['a'], ['b']], catatan: [], game: [] });
    expect(h.terbanyak).toEqual(['a', 'b']);
    expect(h.label).toBe('a & b');
  });

  it('seri lebih dari dua diringkas, bukan dipotong diam-diam', () => {
    const h = hitungArea({ ideBermain: [['a'], ['b'], ['c'], ['d']], catatan: [], game: [] });
    expect(h.terbanyak).toEqual(['a', 'b', 'c', 'd']);
    expect(h.label).toBe('a & b & 2 lainnya');
  });

  it('satu tema bisa melatih beberapa area — semuanya dihitung', () => {
    const h = hitungArea({ ideBermain: [['x', 'y', 'z']], catatan: [], game: [] });
    expect(h.perArea).toEqual({ x: 1, y: 1, z: 1 });
  });

  it('sesi game tetap ikut dihitung (sumber lama tak dibuang)', () => {
    const h = hitungArea({ ideBermain: [], catatan: [], game: ['motorik', 'motorik'] });
    expect(h.terbanyak).toEqual(['motorik']);
    expect(h.dariMana).toBe('dihitung dari 2 sesi game');
  });

  it('nilai kosong/whitespace tak menghasilkan area hantu', () => {
    const h = hitungArea({ ideBermain: [[''], ['  '], null], catatan: [null, ''], game: [undefined] });
    expect(h.perArea).toEqual({});
    expect(h.terbanyak).toEqual([]);
    expect(h.label).toBeNull();
    expect(h.dariMana).toBe('');
  });

  it('null/undefined aman', () => {
    expect(hitungArea(null).label).toBeNull();
    expect(hitungArea(undefined).perArea).toEqual({});
  });
});

describe('ringkasBulan: totalAktivitas', () => {
  const kosong = { kegiatan: [], hasilMain: [], catatan: [], event: [], rekomendasi: 0 };
  it('menjumlahkan Ide Bermain + video + sesi game', () => {
    const r = ringkasBulan({
      ...kosong,
      kegiatan: [
        { jenis: 'ide-bermain', judul: 'A', waktu: '2026-08-01T00:00:00Z' },
        { jenis: 'ide-bermain', judul: 'A', waktu: '2026-08-02T00:00:00Z' },
        { jenis: 'video', judul: 'V', waktu: '2026-08-03T00:00:00Z' },
      ],
      hasilMain: [{ area_skill: 'x', bintang: 1, durasi_detik: 60, selesai: true }],
    });
    expect(r.totalAktivitas).toBe(4);
  });
  it('nol bila memang tak ada apa-apa', () => {
    expect(ringkasBulan(kosong).totalAktivitas).toBe(0);
  });
});

describe('bulanRekomendasi', () => {
  const peta = new Map([['p1', '2026-08-30'], ['p2', '2026-09-01']]);

  it('memakai bulan KONSULTASI, bukan bulan penulisan', () => {
    // Sesi 30 Agustus, rekomendasinya ditulis 2 September — miliknya rapor AGUSTUS.
    expect(bulanRekomendasi({ pendaftaran_id: 'p1', created_at: '2026-09-02T04:00:00.000Z' }, peta)).toBe('2026-08');
  });

  it('mencocokkan peta lewat pendaftaran_id, bukan id barisnya sendiri', () => {
    // `id` rekomendasi juga ada di peta tapi menunjuk bulan lain — memakai kunci yang salah
    // akan menghasilkan bulan yang salah tanpa error apa pun.
    const r = { id: 'p2', pendaftaran_id: 'p1', created_at: '2026-09-02T04:00:00.000Z' };
    expect(bulanRekomendasi(r, peta)).toBe('2026-08');
  });

  it('memakai created_at (WIB) untuk rekomendasi lepas tanpa pendaftaran', () => {
    // 1 Sep 03:00 WIB = 31 Agu 20:00 UTC — harus terhitung September, bukan Agustus.
    expect(bulanRekomendasi({ pendaftaran_id: null, created_at: '2026-08-31T20:00:00.000Z' })).toBe('2026-09');
  });

  it('pendaftaran yang tak dikenal jatuh ke created_at, bukan ikut hilang', () => {
    expect(bulanRekomendasi({ pendaftaran_id: 'entah', created_at: '2026-07-10T05:00:00.000Z' }, peta)).toBe('2026-07');
  });

  it('data tak sah menghasilkan string kosong (tak cocok bulan mana pun)', () => {
    expect(bulanRekomendasi({ pendaftaran_id: null, created_at: null })).toBe('');
    expect(bulanWib('bukan tanggal')).toBe('');
  });
});

describe('deltaTeks', () => {
  it('tidak mengarang perbandingan saat tak ada bulan pembanding', () => {
    // Bulan pertama seorang anak: `null`, BUKAN 0. "+9 dari bulan lalu" pada rapor pertama
    // adalah perbandingan terhadap bulan yang tak pernah ada.
    expect(deltaTeks(9, null)).toEqual({ arah: 'tanpa-pembanding', teks: '' });
    expect(deltaTeks(9, undefined)).toEqual({ arah: 'tanpa-pembanding', teks: '' });
    expect(deltaTeks(9, NaN)).toEqual({ arah: 'tanpa-pembanding', teks: '' });
  });

  it('membedakan naik, turun, dan sama', () => {
    expect(deltaTeks(9, 6)).toEqual({ arah: 'naik', teks: '+3 dari bulan lalu' });
    expect(deltaTeks(4, 6)).toEqual({ arah: 'turun', teks: '-2 dari bulan lalu' });
    expect(deltaTeks(6, 6)).toEqual({ arah: 'sama', teks: 'sama seperti bulan lalu' });
  });

  it('bulan lalu NOL tetap dibandingkan — itu berbeda dari tanpa pembanding', () => {
    expect(deltaTeks(3, 0)).toEqual({ arah: 'naik', teks: '+3 dari bulan lalu' });
  });

  it('membawa satuan pada angka yang butuh', () => {
    expect(deltaTeks(165, 125, 'm').teks).toBe('+40m dari bulan lalu');
  });
});

describe('kalimatRingkas', () => {
  const dasar = {
    totalAktivitas: 9, rekomendasi: 0, areaTerbanyak: null,
    daftarIdeBermain: [] as { judul: string; jumlah: number }[],
    rekomendasiPsikolog: [] as { judul: string | null }[],
  };
  const buat = (x: Partial<typeof dasar>) => kalimatRingkas({ ...dasar, ...x } as never, 'Arsyi');

  it('bulan kosong tidak berpura-pura ada isinya', () => {
    expect(buat({ totalAktivitas: 0 })).toBe('Bulan ini belum ada aktivitas yang tercatat untuk Arsyi.');
  });

  it('menyebut tema yang PALING SERING, bukan yang pertama di daftar', () => {
    const k = buat({ daftarIdeBermain: [{ judul: 'Laut Biru', jumlah: 1 }, { judul: 'Dinosaurus', jumlah: 7 }] });
    expect(k).toContain('“Dinosaurus”');
    expect(k).not.toContain('Laut Biru');
  });

  it('menghilangkan bagian yang tak berdata, bukan mengisinya dengan tanda hubung', () => {
    const k = buat({});
    expect(k).toBe('Bulan ini Arsyi menyelesaikan 9 aktivitas.');
    expect(k).not.toContain('—');
    expect(k).not.toContain('undefined');
  });

  it('memakai label area yang sudah diterjemahkan bila diberikan', () => {
    const k = kalimatRingkas({ ...dasar, areaTerbanyak: 'motorik-kasar' } as never, 'Arsyi', 'Motorik Kasar');
    expect(k).toContain('Motorik Kasar');
    expect(k).not.toContain('motorik-kasar');
  });

  it('menyebut konsultasi beserta topiknya bila ada', () => {
    const k = buat({ rekomendasi: 2, rekomendasiPsikolog: [{ judul: 'Kesiapan sosial' }] });
    expect(k).toContain('2 sesi konsultasi psikolog bulan ini');
    expect(k).toContain('kesiapan sosial');
  });

  it('tidak menyebut konsultasi sama sekali bila tak ada sesi', () => {
    expect(buat({ rekomendasi: 0, rekomendasiPsikolog: [{ judul: 'Kesiapan sosial' }] }))
      .not.toContain('konsultasi');
  });
});

describe('umurTeksPanjang dipakai rapor', () => {
  it('memakai kata penuh, bukan singkatan', async () => {
    const { umurTeksPanjang } = await import('../anak');
    expect(umurTeksPanjang(new Date('2022-09-15'), new Date('2026-08-24'))).toBe('3 tahun 11 bulan');
    expect(umurTeksPanjang(new Date('2022-08-15'), new Date('2026-08-24'))).toBe('4 tahun');
    expect(umurTeksPanjang(new Date('2026-02-15'), new Date('2026-08-24'))).toBe('6 bulan');
  });
});
