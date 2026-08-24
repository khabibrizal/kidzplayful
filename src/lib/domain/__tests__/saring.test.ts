// src/lib/domain/__tests__/saring.test.ts
import { describe, it, expect } from 'vitest';
import { rapikanKunci, cocokCari, tanggalWibDariISO, dalamRentang, rentangTerpakai, tanggalEvent, eventDalamRentang } from '../saring';

describe('rapikanKunci', () => {
  it('merapikan spasi & huruf besar', () => {
    expect(rapikanKunci('  Pelangi   Di  Ujung ')).toBe('pelangi di ujung');
  });
  it('null/undefined → string kosong', () => {
    expect(rapikanKunci(null)).toBe('');
    expect(rapikanKunci(undefined)).toBe('');
  });
});

describe('cocokCari', () => {
  it('kata kunci kosong SELALU cocok — filter yang tak diisi tak menyaring apa pun', () => {
    expect(cocokCari('Aletta', '')).toBe(true);
    expect(cocokCari('Aletta', '   ')).toBe(true);
    expect(cocokCari('Aletta', null)).toBe(true);
  });
  it('tak peka besar-kecil huruf & spasi berlebih', () => {
    expect(cocokCari('Pelangi di Ujung Jari', 'UJUNG')).toBe(true);
    expect(cocokCari('Pelangi di Ujung Jari', '  pelangi   di ')).toBe(true);
  });
  it('cocok sebagian kata, bukan hanya dari awal', () => {
    expect(cocokCari('Misi Menyelamatkan Laut Biru', 'laut')).toBe(true);
  });
  it('tidak cocok → false', () => {
    expect(cocokCari('Aletta', 'bima')).toBe(false);
  });
  it('teks kosong hanya cocok bila kuncinya juga kosong', () => {
    expect(cocokCari(null, 'a')).toBe(false);
    expect(cocokCari(null, '')).toBe(true);
  });
});

describe('tanggalWibDariISO', () => {
  it('cap waktu MALAM UTC sudah masuk tanggal berikutnya di WIB', () => {
    // 23 Agu 18:00Z = 24 Agu 01:00 WIB. `slice(0,10)` akan menjawab 23 — dan catatan itu
    // akan hilang saat dicari di tanggal 24.
    expect(tanggalWibDariISO('2026-08-23T18:00:00Z')).toBe('2026-08-24');
    expect('2026-08-23T18:00:00Z'.slice(0, 10)).toBe('2026-08-23');   // pembanding: cara lama
  });
  it('cap waktu siang tetap di tanggal yang sama', () => {
    expect(tanggalWibDariISO('2026-08-23T05:00:00Z')).toBe('2026-08-23');
  });
  it('tepat di batas 17:00Z = 00:00 WIB hari berikutnya', () => {
    expect(tanggalWibDariISO('2026-08-23T16:59:59Z')).toBe('2026-08-23');
    expect(tanggalWibDariISO('2026-08-23T17:00:00Z')).toBe('2026-08-24');
  });
  it('nilai kosong / tak terbaca → string kosong', () => {
    expect(tanggalWibDariISO(null)).toBe('');
    expect(tanggalWibDariISO('bukan tanggal')).toBe('');
  });
});

describe('dalamRentang', () => {
  it('kedua ujung INKLUSIF — hari terakhir tak boleh terbuang', () => {
    expect(dalamRentang('2026-08-01', '2026-08-01', '2026-08-31')).toBe(true);
    expect(dalamRentang('2026-08-31', '2026-08-01', '2026-08-31')).toBe(true);
  });
  it('di luar rentang → false', () => {
    expect(dalamRentang('2026-07-31', '2026-08-01', '2026-08-31')).toBe(false);
    expect(dalamRentang('2026-09-01', '2026-08-01', '2026-08-31')).toBe(false);
  });
  it('batas kosong = tak dibatasi di sisi itu', () => {
    expect(dalamRentang('2020-01-01', '', '2026-08-31')).toBe(true);
    expect(dalamRentang('2099-01-01', '2026-08-01', '')).toBe(true);
    expect(dalamRentang('2026-08-15', '', '')).toBe(true);
  });
  it('hanya batas AWAL yang diisi', () => {
    expect(dalamRentang('2026-07-31', '2026-08-01', null)).toBe(false);
    expect(dalamRentang('2026-08-01', '2026-08-01', null)).toBe(true);
  });
  it('batas TERBALIK ditukar, bukan menghasilkan nol', () => {
    expect(dalamRentang('2026-08-15', '2026-08-31', '2026-08-01')).toBe(true);
    expect(dalamRentang('2026-09-15', '2026-08-31', '2026-08-01')).toBe(false);
  });
  it('tanggal tak diketahui tetap lolos — jangan sembunyikan yang perlu diperiksa', () => {
    expect(dalamRentang('', '2026-08-01', '2026-08-31')).toBe(true);
    expect(dalamRentang(null, '2026-08-01', '2026-08-31')).toBe(true);
  });
});

describe('rentangTerpakai', () => {
  it('melaporkan rentang apa adanya bila urutannya benar', () => {
    expect(rentangTerpakai('2026-08-01', '2026-08-31'))
      .toEqual({ dari: '2026-08-01', sampai: '2026-08-31', aktif: true, ditukar: false });
  });
  it('menandai bahwa batasnya DITUKAR, supaya bisa ditulis di layar', () => {
    expect(rentangTerpakai('2026-08-31', '2026-08-01'))
      .toEqual({ dari: '2026-08-01', sampai: '2026-08-31', aktif: true, ditukar: true });
  });
  it('tanpa batas sama sekali → tidak aktif', () => {
    expect(rentangTerpakai('', '')).toMatchObject({ aktif: false, ditukar: false });
    expect(rentangTerpakai(null, undefined)).toMatchObject({ aktif: false });
  });
  it('satu batas saja tetap aktif', () => {
    expect(rentangTerpakai('2026-08-01', '')).toMatchObject({ aktif: true, ditukar: false });
  });
});

describe('tanggalEvent', () => {
  it('mengumpulkan tanggal gabungan DAN tanggal per kelas', () => {
    expect(tanggalEvent({ tanggal: '2026-09-01', baby_tanggal: '2026-09-02', toddler_tanggal: '2026-09-03' }))
      .toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });
  it('event yang tanggalnya HANYA di kelas tetap punya tanggal', () => {
    // Menyaring hanya pada `tanggal` akan menghilangkan event seperti ini sepenuhnya.
    expect(tanggalEvent({ tanggal: null, baby_tanggal: '2026-09-02' })).toEqual(['2026-09-02']);
  });
  it('tanggal kembar dihitung sekali, dan urut', () => {
    expect(tanggalEvent({ tanggal: '2026-09-05', baby_tanggal: '2026-09-05', toddler_tanggal: '2026-09-01' }))
      .toEqual(['2026-09-01', '2026-09-05']);
  });
  it('tanpa tanggal sama sekali → daftar kosong', () => {
    expect(tanggalEvent({})).toEqual([]);
    expect(tanggalEvent(null)).toEqual([]);
  });
});

describe('eventDalamRentang', () => {
  const ev = { tanggal: null, baby_tanggal: '2026-09-10', toddler_tanggal: '2026-09-11' };

  it('tanpa rentang aktif → semua lolos', () => {
    expect(eventDalamRentang(ev, '', '')).toBe(true);
    expect(eventDalamRentang({}, null, null)).toBe(true);
  });
  it('cukup SATU tanggal yang masuk rentang', () => {
    expect(eventDalamRentang(ev, '2026-09-11', '2026-09-30')).toBe(true);   // hanya toddler
    expect(eventDalamRentang(ev, '2026-09-01', '2026-09-10')).toBe(true);   // hanya baby
  });
  it('semua tanggalnya di luar rentang → tidak lolos', () => {
    expect(eventDalamRentang(ev, '2026-10-01', '2026-10-31')).toBe(false);
  });
  it('kedua ujung rentang INKLUSIF', () => {
    expect(eventDalamRentang({ tanggal: '2026-09-01' }, '2026-09-01', '2026-09-01')).toBe(true);
  });
  it('event TANPA tanggal tetap lolos — justru ia yang perlu diperiksa', () => {
    expect(eventDalamRentang({}, '2026-09-01', '2026-09-30')).toBe(true);
  });
  it('batas terbalik ditukar, sama seperti dalamRentang', () => {
    expect(eventDalamRentang(ev, '2026-09-30', '2026-09-01')).toBe(true);
  });
});
