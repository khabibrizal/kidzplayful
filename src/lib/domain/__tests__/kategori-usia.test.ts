// src/lib/domain/__tests__/kategori-usia.test.ts
import { describe, it, expect } from 'vitest';
import { tumpukanKategori, petaUmurKategori, kategoriTanpaTema } from '../kategori-usia';

// Master SUNGGUHAN milik pemilik saat bug "semua tema tertutup" dilaporkan.
const NYATA = [
  { id: 'baby', nama: 'Baby (0-1 th)', usia_min: 0, usia_max: 1 },
  { id: 'batita', nama: 'Batita (1-3 th)', usia_min: 1, usia_max: 3 },
  { id: 'balita', nama: 'Balita (3-5 th)', usia_min: 3, usia_max: 5 },
  { id: 'early', nama: 'Early Childhood (5-6 th)', usia_min: 5, usia_max: 6 },
  { id: 'middle', nama: 'Middle Childhood', usia_min: 6, usia_max: 9 },
  { id: 'late', nama: 'Late Childhood', usia_min: 9, usia_max: 12 },
];

describe('tumpukanKategori', () => {
  it('menemukan SEMUA tahun batas yang diklaim dua kategori', () => {
    const t = tumpukanKategori(NYATA);
    expect(t).toHaveLength(5);                       // 1, 3, 5, 6, 9 th
    expect(t.map((x) => x.usia.join(','))).toEqual(['1', '3', '5', '6', '9']);
  });

  it('melaporkan kategori mana yang BENAR-BENAR menang di tahun itu', () => {
    const t = tumpukanKategori(NYATA);
    // Inilah bug yang dilaporkan: anak 6 th mendarat di Early Childhood, bukan Middle.
    const enam = t.find((x) => x.usia.includes(6))!;
    expect(enam.a.nama).toBe('Early Childhood (5-6 th)');
    expect(enam.b.nama).toBe('Middle Childhood');
    expect(enam.menang).toBe('Early Childhood (5-6 th)');

    // Pemenang harus benar-benar DIHITUNG, bukan diambil dari salah satu sisi pasangan:
    // pada tumpukan Balita x Early Childhood di usia 5, yang menang adalah sisi KEDUA.
    const lima = t.find((x) => x.usia.includes(5))!;
    expect(lima.a.nama).toBe('Balita (3-5 th)');
    expect(lima.b.nama).toBe('Early Childhood (5-6 th)');
    expect(lima.menang).toBe(lima.b.nama);
    expect(lima.menang).not.toBe(lima.a.nama);
  });

  it('rentang yang BERSAMBUNG tanpa tumpuk → tak ada laporan', () => {
    const rapi = [
      { id: 'a', nama: 'A', usia_min: 0, usia_max: 2 },
      { id: 'b', nama: 'B', usia_min: 3, usia_max: 5 },
      { id: 'c', nama: 'C', usia_min: 6, usia_max: 9 },
    ];
    expect(tumpukanKategori(rapi)).toEqual([]);
  });

  it('rentang yang saling menelan penuh tetap terdeteksi', () => {
    const t = tumpukanKategori([
      { id: 'lebar', nama: 'Lebar', usia_min: 0, usia_max: 9 },
      { id: 'sempit', nama: 'Sempit', usia_min: 3, usia_max: 4 },
    ]);
    expect(t).toHaveLength(1);
    expect(t[0].usia).toEqual([3, 4]);
  });

  it('daftar kosong / null aman', () => {
    expect(tumpukanKategori([])).toEqual([]);
    expect(tumpukanKategori(null)).toEqual([]);
  });
});

describe('petaUmurKategori', () => {
  it('menunjukkan kategori yang dipakai untuk tiap umur, apa adanya', () => {
    const peta = petaUmurKategori(NYATA, 9);
    const pada = (u: number) => peta.find((x) => x.usia === u)!;
    expect(pada(2).nama).toBe('Batita (1-3 th)');
    expect(pada(4).nama).toBe('Balita (3-5 th)');
    // Anak 6 th JATUH ke Early Childhood — bukan Middle Childhood seperti dugaan admin.
    expect(pada(6).nama).toBe('Early Childhood (5-6 th)');
    expect(pada(7).nama).toBe('Middle Childhood');
  });

  it('menyebut berapa kategori yang mengklaim tiap umur', () => {
    const peta = petaUmurKategori(NYATA, 9);
    expect(peta.find((x) => x.usia === 6)!.jumlahCocok).toBe(2);   // diperebutkan
    expect(peta.find((x) => x.usia === 7)!.jumlahCocok).toBe(1);   // aman
  });

  it('umur yang tak tercakup kategori mana pun → nama null', () => {
    const berlubang = [
      { id: 'a', nama: 'A', usia_min: 0, usia_max: 2 },
      { id: 'c', nama: 'C', usia_min: 6, usia_max: 9 },
    ];
    const peta = petaUmurKategori(berlubang, 9);
    expect(peta.find((x) => x.usia === 4)!.nama).toBeNull();
    expect(peta.find((x) => x.usia === 4)!.jumlahCocok).toBe(0);
  });
});

describe('kategoriTanpaTema', () => {
  const tema = [
    { kategori_usia_id: 'batita' }, { kategori_usia_id: 'batita' },
    { kategori_usia_id: 'middle' }, { kategori_usia_id: null },
  ];
  it('menemukan kategori yang belum diisi materi', () => {
    const kosong = kategoriTanpaTema(NYATA, tema).map((k) => k.id);
    // 'early' adalah kategori tempat anak 6 th mendarat — dan ia KOSONG.
    expect(kosong).toContain('early');
    expect(kosong).toEqual(['baby', 'balita', 'early', 'late']);
  });
  it('kategori yang sudah punya tema tak ikut dilaporkan', () => {
    const kosong = kategoriTanpaTema(NYATA, tema).map((k) => k.id);
    expect(kosong).not.toContain('batita');
    expect(kosong).not.toContain('middle');
  });
  it('tema tanpa kategori tidak dianggap mengisi kategori mana pun', () => {
    expect(kategoriTanpaTema(NYATA, [{ kategori_usia_id: null }])).toHaveLength(NYATA.length);
  });
});
