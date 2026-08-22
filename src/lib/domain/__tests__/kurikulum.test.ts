// src/lib/domain/__tests__/kurikulum.test.ts
import { describe, it, expect } from 'vitest';
import { bulanKurikulumAnak, statusTema, kelompokTema, ringkasEvaluasi, susunHasilEvaluasi, posisiTema, evaluasiPerAktivitas, temaTerkunci } from '../kurikulum';

const tema = (bulan: number, judul = `T${bulan}`) => ({ id: judul, judul, bulan_kurikulum: bulan, urutan: 0 });

describe('bulanKurikulumAnak', () => {
  it('anak tanpa langganan tetap dapat bulan ke-1 (trial & Basic ikut kurikulum)', () => {
    expect(bulanKurikulumAnak(0)).toBe(1);
    expect(bulanKurikulumAnak(undefined)).toBe(1);
    expect(bulanKurikulumAnak(null)).toBe(1);
  });
  it('memakai penghitung tersimpan apa adanya', () => {
    expect(bulanKurikulumAnak(3)).toBe(3);
  });
  it('angka aneh tidak melempar', () => {
    expect(bulanKurikulumAnak(-5)).toBe(1);
    expect(bulanKurikulumAnak(2.7)).toBe(2);
  });
});

describe('statusTema', () => {
  it('bulan yang sudah dilewati & bulan ini terbuka penuh', () => {
    expect(statusTema(tema(1), 3)).toBe('terbuka');
    expect(statusTema(tema(3), 3)).toBe('terbuka');
  });
  it('bulan depan hanya judulnya', () => {
    expect(statusTema(tema(4), 3)).toBe('kunci-judul');
  });
  it('lebih dari sebulan ke depan disembunyikan', () => {
    expect(statusTema(tema(5), 3)).toBe('tersembunyi');
  });
  it('tema tanpa bulan (materi lama) dianggap terbuka — jangan mengunci yang tadinya jalan', () => {
    expect(statusTema({ id: 'x', judul: 'x' }, 1)).toBe('terbuka');
  });
});

describe('kelompokTema', () => {
  const list = [tema(1, 'a'), tema(2, 'b'), tema(3, 'c'), tema(4, 'd'), tema(9, 'e')];
  it('membagi bulan ini / sudah terbuka / bulan depan, dan membuang yang tersembunyi', () => {
    const g = kelompokTema(list, 3);
    expect(g.bulanIni.map((t) => t.judul)).toEqual(['c']);
    expect(g.sudahTerbuka.map((t) => t.judul)).toEqual(['b', 'a']);
    expect(g.bulanDepan.map((t) => t.judul)).toEqual(['d']);
  });
  it('sudah terbuka diurutkan dari yang TERBARU (bulan turun)', () => {
    expect(kelompokTema(list, 3).sudahTerbuka.map((t) => t.bulan_kurikulum)).toEqual([2, 1]);
  });
  it('materi lama tanpa bulan masuk "sudah terbuka", bukan hilang', () => {
    const g = kelompokTema([{ id: 'lama', judul: 'lama' }], 2);
    expect(g.sudahTerbuka.map((t) => t.judul)).toEqual(['lama']);
    expect(g.bulanIni).toEqual([]);
  });
  it('daftar kosong / tak sah tidak melempar', () => {
    expect(kelompokTema([], 1)).toEqual({ bulanIni: [], sudahTerbuka: [], bulanDepan: [] });
  });
});

describe('ringkasEvaluasi', () => {
  it('menghitung tercapai & persen', () => {
    expect(ringkasEvaluasi([
      { aktivitas: 'A', butir: 'x', tercapai: true },
      { aktivitas: 'A', butir: 'y', tercapai: false },
    ])).toEqual({ total: 2, tercapai: 1, persen: 50 });
  });
  it('kosong tidak membagi nol', () => {
    expect(ringkasEvaluasi([])).toEqual({ total: 0, tercapai: 0, persen: 0 });
    expect(ringkasEvaluasi(null)).toEqual({ total: 0, tercapai: 0, persen: 0 });
  });
  it('membulatkan persen', () => {
    expect(ringkasEvaluasi([
      { aktivitas: 'A', butir: '1', tercapai: true },
      { aktivitas: 'A', butir: '2', tercapai: false },
      { aktivitas: 'A', butir: '3', tercapai: false },
    ]).persen).toBe(33);
  });
});

describe('susunHasilEvaluasi', () => {
  const aktivitas = [
    { judul: 'Meronce', evaluasi: ['Memegang manik', 'Menyelesaikan 5 manik'] },
    { judul: 'Menjepit', evaluasi: ['Menjepit pompom'] },
  ];

  it('kalimatnya diambil dari MATERI, klien hanya menyebut indeks yang dicentang', () => {
    expect(susunHasilEvaluasi(aktivitas, { '0': [1] })).toEqual([
      { aktivitas: 'Meronce', butir: 'Memegang manik', tercapai: false },
      { aktivitas: 'Meronce', butir: 'Menyelesaikan 5 manik', tercapai: true },
      { aktivitas: 'Menjepit', butir: 'Menjepit pompom', tercapai: false },
    ]);
  });

  it('indeks yang menunjuk butir tak ada diabaikan, bukan menambah baris karangan', () => {
    // Materi berubah sejak layar dibuka; klien mengirim indeks 9 yang sudah tak ada.
    const h = susunHasilEvaluasi(aktivitas, { '0': [9], '7': [0] });
    expect(h).toHaveLength(3);
    expect(h.every((x) => !x.tercapai)).toBe(true);
  });

  it('butir kosong tak pernah jadi baris rapor', () => {
    expect(susunHasilEvaluasi([{ judul: 'A', evaluasi: ['  ', 'nyata'] }], { '0': [1] }))
      .toEqual([{ aktivitas: 'A', butir: 'nyata', tercapai: true }]);
  });

  it('aktivitas tanpa judul diberi nama urut, bukan kosong', () => {
    expect(susunHasilEvaluasi([{ judul: '', evaluasi: ['x'] }], {})[0].aktivitas).toBe('Aktivitas 1');
  });

  it('materi tanpa evaluasi menghasilkan daftar kosong (bukan galat)', () => {
    expect(susunHasilEvaluasi([{ judul: 'A' }], { '0': [0] })).toEqual([]);
    expect(susunHasilEvaluasi(null, null)).toEqual([]);
  });
});

describe('posisiTema', () => {
  const semua = [
    { id: 'a', judul: 'A', bulan_kurikulum: 1, urutan: 0 },
    { id: 'b', judul: 'B', bulan_kurikulum: 1, urutan: 1 },
    { id: 'c', judul: 'C', bulan_kurikulum: 2, urutan: 0 },
    { id: 'd', judul: 'D', bulan_kurikulum: 1, urutan: 2 },
  ];

  it('minggu diturunkan dari urutan DI DALAM bulannya', () => {
    expect(posisiTema(semua, 'a')).toEqual({ bulan: 1, minggu: 1 });
    expect(posisiTema(semua, 'b')).toEqual({ bulan: 1, minggu: 2 });
    expect(posisiTema(semua, 'd')).toEqual({ bulan: 1, minggu: 3 });
  });

  it('tiap bulan memulai hitungan minggu dari 1 lagi', () => {
    expect(posisiTema(semua, 'c')).toEqual({ bulan: 2, minggu: 1 });
  });

  it('materi lama tanpa bulan tak punya posisi kurikulum', () => {
    expect(posisiTema([{ id: 'x', judul: 'X' }], 'x')).toBeNull();
    expect(posisiTema(semua, 'tak-ada')).toBeNull();
  });
});

describe('evaluasiPerAktivitas', () => {
  const hasil = [
    { aktivitas: 'Meronce', butir: 'Memegang manik', tercapai: true },
    { aktivitas: 'Meronce', butir: 'Menyelesaikan 5 manik', tercapai: false },
    { aktivitas: 'Menjepit', butir: 'Menjepit pompom', tercapai: true },
  ];

  it('mengelompokkan per aktivitas beserta butir yang belum tercapai', () => {
    expect(evaluasiPerAktivitas(hasil)).toEqual([
      { aktivitas: 'Meronce', tercapai: 1, total: 2, belum: ['Menyelesaikan 5 manik'] },
      { aktivitas: 'Menjepit', tercapai: 1, total: 1, belum: [] },
    ]);
  });

  it('urutannya mengikuti urutan butir tersimpan, bukan abjad', () => {
    expect(evaluasiPerAktivitas(hasil).map((g) => g.aktivitas)).toEqual(['Meronce', 'Menjepit']);
  });

  it('kosong / null aman', () => {
    expect(evaluasiPerAktivitas([])).toEqual([]);
    expect(evaluasiPerAktivitas(null)).toEqual([]);
  });
});

describe('temaTerkunci', () => {
  const list = [tema(1, 'a'), tema(2, 'b'), tema(3, 'c'), tema(9, 'd')];

  it('memuat SEMUA tema yang belum terbuka — bulan depan MAUPUN yang lebih jauh', () => {
    // Pemilik melihat 5 tema aktif di admin; halaman pengguna tak boleh menampilkan 4.
    // Yang belum waktunya dikunci, bukan disembunyikan.
    expect(temaTerkunci(list, 1).map((t) => t.judul)).toEqual(['b', 'c', 'd']);
  });

  it('diurutkan dari bulan terdekat', () => {
    expect(temaTerkunci(list, 1).map((t) => t.bulan_kurikulum)).toEqual([2, 3, 9]);
  });

  it('tema yang sudah terbuka tidak ikut', () => {
    expect(temaTerkunci(list, 3).map((t) => t.judul)).toEqual(['d']);
    expect(temaTerkunci(list, 99)).toEqual([]);
  });

  it('materi lama tanpa bulan dianggap terbuka, jadi tak ikut terkunci', () => {
    expect(temaTerkunci([{ id: 'x', judul: 'X' }], 1)).toEqual([]);
  });
});
