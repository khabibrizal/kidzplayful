// src/lib/domain/__tests__/entitlement.test.ts
// Matriks hak akses diuji di sini, BUKAN dengan memeriksa 7 halaman satu per satu.
import { describe, it, expect } from 'vitest';
import { hakAksesAnak, hakAksesAkun, HAK_KOSONG, tambahHari, bolehBukaTema } from '../entitlement';
import type { PaketLangganan, BarisLanggananAnak } from '@/lib/game/tipe';

const paket = (kode: string, urutan: number, lebih: Partial<PaketLangganan> = {}): PaketLangganan => ({
  id: `id-${kode}`, kode, nama: kode, deskripsi: null, benefit: [], harga_bulanan: 75000,
  diskon_keluarga: [], akses_ide_bermain: true, akses_game: true, akses_video: true,
  akses_komunitas: true, worksheet: false, konsultasi_gratis_jumlah: 0,
  worksheet_kuota_jumlah: 0, worksheet_kuota_satuan: 'bulan',
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

  // ---- Regresi: batas hari & penghentian oleh admin -----------------------
  //
  // Keduanya lahir dari satu laporan: admin menekan "Hentikan", halaman ortu menyebut
  // langganannya berhenti, TAPI konsultasi online masih gratis memakai kuota paket.

  it('hari TERAKHIR periode masih aktif sepanjang hari WIB', () => {
    // 21 Agu 2026 pukul 23:00 WIB = 16:00 UTC. Aturan lama (Date vs 00:00 UTC) sudah
    // menyebut ini 'tenggang' sejak pagi — sehari yang sudah dibayar hilang.
    const h = hakAksesAnak(baris({ paket_id: PRESCHOOL.id, aktif_sampai: '2026-08-21' }),
      map, trial, new Date('2026-08-21T16:00:00Z'));
    expect(h.status).toBe('aktif');
    expect(h.worksheet).toBe(true);
  });

  it('sehari sesudah periode habis baru masuk tenggang', () => {
    const h = hakAksesAnak(baris({ paket_id: PRESCHOOL.id, aktif_sampai: '2026-08-21' }),
      map, trial, new Date('2026-08-22T16:00:00Z'));
    expect(h.status).toBe('tenggang');
  });

  it('dihentikan admin (paket dikosongkan) = kadaluarsa SEKARANG, tanpa tenggang', () => {
    // Inilah bentuk baris sesudah `hentikanPaketAnak`: aktif_sampai = kemarin, paket_id null.
    const kini = new Date('2026-08-21T05:00:00Z');            // 12:00 WIB
    const h = hakAksesAnak(baris({ paket_id: null, aktif_sampai: tambahHari('2026-08-21', -1) }),
      map, trial, kini);
    expect(h.status).toBe('kadaluarsa');
    expect(h.konsultasiGratis).toEqual({ jumlah: 0, satuan: 'bulan' });
    expect(h.worksheet).toBe(false);
    // Trial akun TIDAK boleh menyalakannya kembali: baris berbayar sudah ada.
    const masihTrial = { ...trial, trialMulai: '2026-08-01' };
    expect(hakAksesAnak(baris({ paket_id: null, aktif_sampai: '2026-08-20' }), map, masihTrial, kini).status)
      .toBe('kadaluarsa');
  });

  it('penghentian versi LAMA (aktif_sampai hari ini, paket tetap) memang tak mencabut apa pun', () => {
    // Dokumentasi bug: perilaku lama membiarkan hak paket penuh — hari ini masih aktif,
    // lalu 3 hari tenggang. Ditulis sebagai tes supaya tak ada yang "menyederhanakan"
    // hentikanPaketAnak kembali ke bentuk itu.
    const h = hakAksesAnak(baris({ paket_id: PRESCHOOL.id, aktif_sampai: '2026-08-21' }),
      map, trial, new Date('2026-08-21T05:00:00Z'));
    expect(h.status).toBe('aktif');
    expect(h.konsultasiGratis.jumlah).toBe(1);
  });

  it('tambahHari menyeberangi bulan & tahun', () => {
    expect(tambahHari('2026-08-01', -1)).toBe('2026-07-31');
    expect(tambahHari('2026-01-01', -1)).toBe('2025-12-31');
    expect(tambahHari('2026-08-21', 3)).toBe('2026-08-24');
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
    expect(hakAksesAkun([])).toEqual({
      paketTertinggi: null, diskonKode: null, komunitas: false, status: 'kadaluarsa',
    });
    const akun = hakAksesAkun([hakUntuk(PRESCHOOL.id, '2026-06-01')]);
    expect(akun.paketTertinggi).toBeNull();
    expect(akun.diskonKode).toBeNull();
    expect(akun.status).toBe('kadaluarsa');
  });

  it('status MENGIKUTI anak yang paketnya terpilih, bukan anak lain', () => {
    // Kenapa penting: hak yang berasal dari TRIAL tidak setara hak berbayar (unduh worksheet
    // dibatasi satu kali untuk trial). Kalau status diambil dari anak mana pun, akun bisa
    // tampak berbayar hanya karena salah satu anaknya masih trial — atau sebaliknya.
    const berbayar = { ...hakUntuk(PRESCHOOL.id, '2027-01-01'), status: 'aktif' as const };
    const trial = { ...hakUntuk(BASIC.id, '2027-01-01'), status: 'trial' as const };
    // Preschool (urutan lebih tinggi) yang terpilih → statusnya 'aktif'.
    expect(hakAksesAkun([trial, berbayar]).status).toBe('aktif');
    // Hanya anak trial → statusnya 'trial', walau paketnya terisi.
    const hanyaTrial = hakAksesAkun([trial]);
    expect(hanyaTrial.paketTertinggi?.kode).toBe('basic');
    expect(hanyaTrial.status).toBe('trial');
  });
});

describe('bolehBukaTema — gerbang HAK, terpisah dari gerbang bulan/usia', () => {
  const trial = { status: 'trial' as const, ideBermain: true };
  const aktif = { status: 'aktif' as const, ideBermain: true };
  const tenggang = { status: 'tenggang' as const, ideBermain: true };
  const kadaluarsa = { status: 'kadaluarsa' as const, ideBermain: false };

  it('tema BUKAN untuk trial tidak boleh dibuka user trial', () => {
    // Inti bug: pemeriksa lama memakai `!paketTertinggi`, dan anak trial PUNYA paket (paket
    // trial), jadi syarat itu tak pernah terpenuhi — temanya tetap bisa dibuka.
    expect(bolehBukaTema({ boleh_trial: false }, trial)).toBe('perlu-langganan');
  });
  it('tema yang sama boleh dibuka pelanggan berbayar', () => {
    expect(bolehBukaTema({ boleh_trial: false }, aktif)).toBe('boleh');
  });
  it('masa tenggang dihitung berbayar', () => {
    expect(bolehBukaTema({ boleh_trial: false }, tenggang)).toBe('boleh');
  });
  it('tema yang MEMANG boleh trial tetap terbuka untuk trial', () => {
    expect(bolehBukaTema({ boleh_trial: true }, trial)).toBe('boleh');
    expect(bolehBukaTema({}, trial)).toBe('boleh');            // tak ditandai = boleh
    expect(bolehBukaTema({ boleh_trial: null }, trial)).toBe('boleh');
  });
  it('paket tanpa hak Ide Bermain menutup SEMUA tema, bahkan yang boleh trial', () => {
    expect(bolehBukaTema({ boleh_trial: true }, { status: 'aktif', ideBermain: false }))
      .toBe('perlu-langganan');
    expect(bolehBukaTema({ boleh_trial: true }, kadaluarsa)).toBe('perlu-langganan');
  });
  it('hak kosong/null tak pernah membuka', () => {
    expect(bolehBukaTema({ boleh_trial: true }, { status: 'trial', ideBermain: false }))
      .toBe('perlu-langganan');
  });
});
