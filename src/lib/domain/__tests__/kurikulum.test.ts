// src/lib/domain/__tests__/kurikulum.test.ts
import { describe, it, expect } from 'vitest';
import { bulanKurikulumAnak, statusTema, kelompokTema, ringkasEvaluasi, susunHasilEvaluasi, posisiTema, evaluasiPerAktivitas, temaTerkunci, cocokUsia, posisiBerikutnya, MAKS_URUTAN_BULAN, salinTemaKeKategoriLain, RESET_SALINAN_TEMA } from '../kurikulum';

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
    { id: 'a', judul: 'A', bulan_kurikulum: 1, urutan: 1 },
    { id: 'b', judul: 'B', bulan_kurikulum: 1, urutan: 2 },
    { id: 'c', judul: 'C', bulan_kurikulum: 2, urutan: 1 },
    { id: 'd', judul: 'D', bulan_kurikulum: 1, urutan: 4 },
  ];

  it('URUTAN itulah minggunya (1..4) — bukan diturunkan dari indeks', () => {
    // Diturunkan dari indeks, menghapus satu tema akan menggeser nomor minggu tema lain.
    expect(posisiTema(semua, 'a')).toEqual({ bulan: 1, minggu: 1 });
    expect(posisiTema(semua, 'b')).toEqual({ bulan: 1, minggu: 2 });
    expect(posisiTema(semua, 'd')).toEqual({ bulan: 1, minggu: 4 });
  });

  it('tiap bulan memulai hitungan minggu dari 1 lagi', () => {
    expect(posisiTema(semua, 'c')).toEqual({ bulan: 2, minggu: 1 });
  });

  it('materi lama berurutan 0 jatuh ke penomoran menurut posisinya di bulan itu', () => {
    const lama = [
      { id: 'x', judul: 'X', bulan_kurikulum: 1, urutan: 0 },
      { id: 'y', judul: 'Y', bulan_kurikulum: 1, urutan: 0 },
    ];
    expect(posisiTema(lama, 'x')?.minggu).toBe(1);
    expect(posisiTema(lama, 'y')?.minggu).toBe(2);
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

describe('cocokUsia', () => {
  const t35 = { usia_min: 3, usia_max: 5 };

  it('di dalam rentang → cocok, termasuk tepat di batasnya', () => {
    expect(cocokUsia(t35, 3)).toBe(true);
    expect(cocokUsia(t35, 4)).toBe(true);
    expect(cocokUsia(t35, 5)).toBe(true);
  });

  it('di luar rentang → tidak cocok', () => {
    expect(cocokUsia(t35, 2)).toBe(false);
    expect(cocokUsia(t35, 6)).toBe(false);
  });

  it('batas kosong berarti TAK dibatasi — materi lama tak boleh hilang', () => {
    expect(cocokUsia({}, 1)).toBe(true);
    expect(cocokUsia({ usia_min: 3 }, 9)).toBe(true);
    expect(cocokUsia({ usia_max: 5 }, 1)).toBe(true);
    expect(cocokUsia({ usia_min: null, usia_max: null }, 7)).toBe(true);
  });

  it('rentang terbalik (salah ketik admin) tidak menyaring apa pun', () => {
    // Lebih baik menampilkan tema yang seharusnya tersaring daripada mengosongkan
    // layar anak tanpa sebab yang terlihat.
    expect(cocokUsia({ usia_min: 6, usia_max: 2 }, 4)).toBe(true);
  });

  it('umur tak sah (tanggal lahir belum diisi) tidak menyaring', () => {
    expect(cocokUsia(t35, NaN)).toBe(true);
  });
});

describe('posisiBerikutnya', () => {
  const pos = (bulan: number, urutan: number) => ({ bulan_kurikulum: bulan, urutan });

  it('kategori kosong dimulai dari bulan 1 urutan 1', () => {
    expect(posisiBerikutnya([])).toEqual({ bulan: 1, urutan: 1 });
  });

  it('mengisi urutan berikutnya di bulan yang sama', () => {
    expect(posisiBerikutnya([pos(1, 1)])).toEqual({ bulan: 1, urutan: 2 });
    expect(posisiBerikutnya([pos(1, 1), pos(1, 2), pos(1, 3)])).toEqual({ bulan: 1, urutan: 4 });
  });

  it('TIDAK ADA urutan ke-5 — yang kelima pindah ke bulan berikutnya urutan 1', () => {
    expect(MAKS_URUTAN_BULAN).toBe(4);
    expect(posisiBerikutnya([pos(1, 1), pos(1, 2), pos(1, 3), pos(1, 4)])).toEqual({ bulan: 2, urutan: 1 });
  });

  it('melanjutkan ke bulan 3 saat bulan 1 & 2 penuh', () => {
    const penuh = [1, 2].flatMap((b) => [1, 2, 3, 4].map((u) => pos(b, u)));
    expect(posisiBerikutnya(penuh)).toEqual({ bulan: 3, urutan: 1 });
  });

  it('mengisi LUBANG bekas tema yang dihapus, bukan melompat ke ujung', () => {
    expect(posisiBerikutnya([pos(1, 1), pos(1, 3), pos(1, 4), pos(2, 1)])).toEqual({ bulan: 1, urutan: 2 });
  });

  it('materi lama berurutan 0 tak dianggap memakai slot 1', () => {
    // Urutan 0 adalah nilai bawaan lama, bukan minggu ke-0.
    expect(posisiBerikutnya([{ bulan_kurikulum: 1, urutan: 0 }])).toEqual({ bulan: 1, urutan: 1 });
  });

  it('daftar null / bulan kosong tidak melempar', () => {
    expect(posisiBerikutnya(null as unknown as [])).toEqual({ bulan: 1, urutan: 1 });
    expect(posisiBerikutnya([{ bulan_kurikulum: null, urutan: 1 }])).toEqual({ bulan: 1, urutan: 2 });
  });
});

describe('salinTemaKeKategoriLain', () => {
  const sumber = {
    judul: 'Pelangi di Ujung Jari',
    tujuan: 'Melatih motorik halus',
    sampulUrl: 'https://x/kelas/1.webp',
    fokusArea: ['Motorik Halus', 'Kognitif'],
    peranOrtu: 'Dampingi anak',
    kategoriUsiaId: 'kat-bayi',
    usiaMin: 0,
    usiaMax: 2,
    bahan: [{ nama: 'Cat', link: '', produkId: 'p1' }],
    aktivitas: [{
      judul: 'Meronce manik',
      caraMembuat: 'Siapkan manik',
      langkah: ['Ambil manik', 'Ronce'],
      catatanOrtu: 'Awasi',
      evaluasi: ['Anak memegang manik tanpa dibantu'],
      gamePaketId: 'game-1',
    }],
    linkIde: 'https://ide',
    worksheetUrl: 'https://x/worksheet/1.pdf',
    bulanKurikulum: 3,
    urutan: 2,
  };

  it('membawa seluruh isi materi, termasuk butir evaluasi & pilihan game', () => {
    const salinan = salinTemaKeKategoriLain(sumber);
    expect(salinan.judul).toBe('Pelangi di Ujung Jari');
    expect(salinan.tujuan).toBe('Melatih motorik halus');
    expect(salinan.sampulUrl).toBe('https://x/kelas/1.webp');
    expect(salinan.fokusArea).toEqual(['Motorik Halus', 'Kognitif']);
    expect(salinan.peranOrtu).toBe('Dampingi anak');
    expect(salinan.bahan).toEqual([{ nama: 'Cat', link: '', produkId: 'p1' }]);
    expect(salinan.aktivitas).toEqual(sumber.aktivitas);
    expect(salinan.linkIde).toBe('https://ide');
    expect(salinan.worksheetUrl).toBe('https://x/worksheet/1.pdf');
  });

  it('TIDAK membawa kategori usia \u2014 itulah gunanya duplikat ini', () => {
    const salinan = salinTemaKeKategoriLain(sumber);
    expect(salinan.kategoriUsiaId).toBe('');
    expect(salinan.usiaMin).toBe(0);
    expect(salinan.usiaMax).toBe(6);
  });

  it('TIDAK mewarisi posisi kurikulum sumber (akan bentrok / belum tentu kosong)', () => {
    const salinan = salinTemaKeKategoriLain(sumber);
    expect(salinan.bulanKurikulum).toBe(1);
    expect(salinan.urutan).toBe(1);
    expect(salinan.urutan).not.toBe(sumber.urutan);
  });

  it('salinannya DALAM: menyunting aktivitas salinan tak mengubah tema sumber', () => {
    const salinan = salinTemaKeKategoriLain(sumber);
    salinan.aktivitas[0].judul = 'Meronce manik BESAR';
    salinan.aktivitas[0].langkah.push('Hitung manik');
    salinan.aktivitas[0].evaluasi[0] = 'diganti';
    salinan.bahan[0].nama = 'Cat air';
    salinan.fokusArea.push('Bahasa');
    expect(sumber.aktivitas[0].judul).toBe('Meronce manik');
    expect(sumber.aktivitas[0].langkah).toEqual(['Ambil manik', 'Ronce']);
    expect(sumber.aktivitas[0].evaluasi).toEqual(['Anak memegang manik tanpa dibantu']);
    expect(sumber.bahan[0].nama).toBe('Cat');
    expect(sumber.fokusArea).toEqual(['Motorik Halus', 'Kognitif']);
  });

  it('setiap field sumber ikut tersalin kecuali yang memang di-reset', () => {
    const salinan = salinTemaKeKategoriLain(sumber);
    const direset = Object.keys(RESET_SALINAN_TEMA);
    for (const k of Object.keys(sumber)) {
      if (direset.includes(k)) continue;
      expect(salinan[k as keyof typeof salinan]).toEqual(sumber[k as keyof typeof sumber]);
    }
    // Dan tak ada field baru yang diam-diam muncul di salinan.
    expect(Object.keys(salinan).sort()).toEqual(Object.keys(sumber).sort());
  });
});
