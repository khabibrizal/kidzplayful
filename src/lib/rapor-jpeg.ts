// src/lib/rapor-jpeg.ts — render rapor bulanan ke JPEG A4 PORTRAIT.
//
// Memakai ulang helper kanvas yang sama dengan e-sertifikat & kartu Instagram
// (`kartu-bersama.ts`) — tanpa dependensi baru. Alasan memilih kanvas, bukan cetak-ke-PDF:
// ukuran berkasnya PASTI, tidak bergantung setelan skala/margin/header-footer pengguna.
'use client';
import { ukuranPas, muatGambar, keluarga, siapkanFont, jalurKotakBulat } from './kartu-bersama';
import { metaSkala } from './format';
import { rapikanDaftar } from './domain/laporan-bulanan';

// A4 @300dpi = 2480 x 3508 piksel, dicetak PORTRAIT.
//
// Ruang gambarnya tetap dinyatakan dalam satuan LOGIS selebar 3508, lalu seluruh kanvas
// diperkecil dengan `ctx.scale(SKALA, SKALA)` sampai lebarnya jadi 2480 piksel. Sebabnya
// praktis: setiap ukuran huruf, jarak baris, dan lebar kolom di berkas ini sudah ditala satu
// per satu terhadap lebar 3508 — mengubah lebar logisnya berarti menala ulang semuanya, dan
// tiap salah tala hanya terlihat di render, tak pernah di `tsc`. Dengan cara ini
// PROPORSINYA persis sama seperti sebelumnya; yang berubah hanya bentuk kertasnya.
//
// Efek sampingnya menguntungkan: satu halaman portrait memuat ~2x tinggi logis halaman
// landscape, jadi isi yang dulu terpotong sekarang lebih sering muat dalam satu lembar.
const W = 3508;                              // lebar ruang gambar (satuan logis)
const SKALA = 2480 / W;                      // logis -> piksel (2480 px = lebar A4 portrait)
const H_HAL = Math.round(3508 / SKALA);      // tinggi SATU halaman dalam satuan logis
// Palet diambil dari mockup rapor (`rapor_mockup.html`). Namanya dipertahankan seperti di
// mockup supaya perbandingan berikutnya bisa dilakukan berdampingan tanpa menerjemahkan.
const TEKS = '#2B2A33';        // --text     (dulu hitam pekat; terlalu keras untuk dokumen)
const UNGU = '#6C4FE0';        // --purple
const UNGU_TUA = '#4B32A8';    // --purple-dark
const UNGU_MUDA = '#F1EEFC';   // --purple-soft
const LATAR = '#F6F5FB';       // --bg       (di luar kartu)
const KARTU = '#FFFFFF';       // --card
const ABU = '#6B6975';         // --text-muted
const GARIS = '#E4E0F5';       // --border
const HIJAU = '#1D9E75';       // --green    (delta naik)
const AMBER = '#BA7517';       // --amber    (delta turun)
const PINK_KARTU = '#FCEBEB';  // .psych-card
const PINK_TEKS = '#4B1528';   // .psych-note
const PINK_JUDUL = '#993556';  // .psych-count

// Faktor mockup(px @980) -> satuan logis di sini (@3508). Dipakai untuk radius & garis supaya
// angkanya bisa ditelusuri balik ke mockup, bukan hasil coba-coba.
const M = W / 980;

/** Perubahan satu angka dibanding bulan lalu. Teks kosong = tak ada bulan pembanding. */
export interface DeltaKartu { teks: string; arah: 'naik' | 'turun' | 'sama' | 'tanpa-pembanding' }

export interface IsiRapor {
  namaAnak: string;
  periode: string;                   // mis. "Agustus 2026"
  /** mis. "3 tahun 11 bulan" — kosong bila tanggal lahir belum diisi */
  umurTeks?: string | null;
  /** satu paragraf pembuka; sudah jadi kalimat, tak ada angka baru yang lahir di sini */
  ringkas?: string | null;
  /** judul tema bulan depan untuk baris penggoda di kaki rapor */
  temaBulanDepan?: string | null;
  delta?: {
    ideBermain?: DeltaKartu; video?: DeltaKartu; sesiGame?: DeltaKartu;
    totalAktivitas?: DeltaKartu; bintang?: DeltaKartu;
  };
  ideBermain: number;
  video: number;
  sesiGame: number;
  bintang: number;
  menit: number;
  areaTerbanyak: string | null;
  /** total Ide Bermain + video + sesi game bulan itu */
  totalAktivitas: number;
  /** kalimat asal-usul `areaTerbanyak` */
  areaDariMana: string;
  daftarIdeBermain: { judul: string; jumlah: number }[];
  daftarVideo: { judul: string; jumlah: number }[];
  event: string[];
  catatanGuru: {
    judulEvent: string; dinilai_oleh: string | null;
    penilaian: { area: string; indikator: string; nilai: string }[];
    catatan: string | null;
  }[];
  rekomendasi: number;
  rekomendasiPsikolog: { judul: string | null; isi: string | null; butir: { judul: string | null; isi: string | null }[]; oleh: string | null }[];
  rekomendasiItem: { jenis: 'produk' | 'event' | 'materi'; judul: string | null; catatan: string | null }[];
  /** 0098 — checklist evaluasi kurikulum yang disimpan pada periode ini */
  evaluasi: {
    judulTema: string; tercapai: number; total: number; peran: string; belum: string[];
    bulan?: number | null; minggu?: number | null;
    perAktivitas?: { aktivitas: string; tercapai: number; total: number }[];
  }[];
}

/**
 * Rapor bulanan sebagai JPEG. Boleh MEMBENTANG DUA HALAMAN bila isinya tak cukup satu.
 *
 * Halamannya tidak ditebak dari jumlah baris — tinggi teks di kanvas bergantung pada
 * pembungkusan kata dan pada `ukuranPas` yang mengecilkan huruf sampai muat, dua hal yang
 * tak bisa dihitung tanpa menggambarnya. Jadi badan gambarnya dijalankan pada SATU halaman
 * lebih dulu, sambil menghitung berapa banyak isi yang ia potong (`terpotong`). Nol potongan
 * berarti satu halaman memang cukup; selain itu, digambar ulang pada dua halaman.
 *
 * Urutannya sengaja satu-halaman-dulu, bukan dua-halaman-dulu. Tata letak rapor ini elastis:
 * batas kolom & plafon bagiannya diturunkan dari tinggi kanvas, jadi isi yang digambar pada
 * kanvas dua halaman SELALU memanjang mengisinya — mengukur di sana akan menyimpulkan "butuh
 * dua halaman" bahkan untuk rapor sependek satu tema. Halaman kedua yang hampir kosong lebih
 * buruk bagi orang tua daripada satu halaman yang rapat.
 */
export async function buatRaporJpeg(isi: IsiRapor): Promise<Blob> {
  /** Menggambar seluruh rapor pada tinggi `hTotal`; mengembalikan sampai mana isinya turun. */
  const render = async (hTotal: number) => {
    const canvas = document.createElement('canvas');
    // Ukuran PIKSEL diturunkan dari satuan logis, lalu konteksnya diskalakan sekali di sini.
    // Sesudah baris `scale` ini, seluruh kode di bawah memakai satuan logis dan tak perlu
    // tahu apa-apa soal piksel — termasuk `hindariPotongan` dan penanda halaman.
    canvas.width = Math.round(W * SKALA);
    canvas.height = Math.round(hTotal * SKALA);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas tak didukung');
    ctx.scale(SKALA, SKALA);

    const fJudul = keluarga('--font-baloo', 'system-ui, sans-serif');
    const fTeks = keluarga('--font-quick', 'system-ui, sans-serif');
    await siapkanFont(fJudul, fTeks);
    const logo = await muatGambar('/logo.png').catch(() => null);

    // Latar + kartu halaman (mengikuti mockup: latar abu-ungu, kartu putih bersudut bulat).
    //
    // Gradien ungu-ke-hijau versi lama diganti warna rata. Di layar gradien itu manis; dicetak
    // di atas kertas ia jadi bidang warna seluas A4 yang menghabiskan tinta dan membuat teks
    // hitam terbaca kurang tajam — dan rapor ini memang untuk dicetak.
    ctx.fillStyle = LATAR; ctx.fillRect(0, 0, W, hTotal);
    // Kartu digambar PER HALAMAN, bukan satu kotak mengelilingi keduanya: kertasnya dipotong
    // di `H_HAL`, jadi satu kartu besar akan tercetak sebagai dua kartu yang terbuka.
    for (let hal = 0; hal * H_HAL < hTotal; hal++) {
      jalurKotakBulat(ctx, 46, hal * H_HAL + 46, W - 92, H_HAL - 92, 28 * M);
      ctx.fillStyle = KARTU; ctx.fill();
      ctx.strokeStyle = UNGU; ctx.lineWidth = 2.5 * M; ctx.stroke();
    }

    // Kepala
    if (logo) {
      const h = 150, w = (logo.width / logo.height) * h;
      ctx.drawImage(logo, 140, 130, w, h);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = ABU; ctx.font = `600 56px ${fTeks}`;
    ctx.fillText('RAPOR BULANAN', W - 140, 200);
    ctx.fillStyle = UNGU; ctx.font = `800 72px ${fJudul}`;
    ctx.fillText(isi.periode, W - 140, 285);

    ctx.textAlign = 'left';
    ctx.fillStyle = ABU; ctx.font = `600 52px ${fTeks}`;
    ctx.fillText('Nama anak', 140, 420);

    // Kepala TIDAK lagi memakai koordinat tetap.
    //
    // Mockup menyisipkan dua blok baru (pil usia & kotak ringkasan) di antara nama dan kartu
    // angka, dan tinggi kotak ringkasan bergantung pada berapa baris kalimatnya terbungkus.
    // Dengan angka `y` yang dipaku seperti sebelumnya, satu kalimat yang lebih panjang akan
    // menabrak kartu angka di bawahnya — dan itu hanya terlihat di render.
    let yKepala: number;
    {
      const { px, baris } = ukuranPas(ctx, isi.namaAnak, W * 0.55, 1, (p) => `800 ${p}px ${fJudul}`, 120, 60);
      ctx.fillStyle = TEKS; ctx.font = `800 ${px}px ${fJudul}`;
      const nama = baris[0] ?? isi.namaAnak;
      const yNama = 420 + px;
      ctx.fillText(nama, 140, yNama);
      yKepala = yNama;

      // Pil usia menempel di sebelah nama (mockup: .child-age).
      const umur = (isi.umurTeks ?? '').trim();
      if (umur) {
        const xPil = 140 + ctx.measureText(nama).width + 34;
        ctx.font = `700 44px ${fTeks}`;
        const wPil = ctx.measureText(umur).width + 60, hPil = 78;
        // Diselaraskan ke bagian BAWAH nama, bukan ke tengahnya: nama memakai huruf 120px dan
        // pil 44px, jadi menyelaraskan titik tengahnya membuat pil tampak melayang.
        jalurKotakBulat(ctx, xPil, yNama - hPil + 14, wPil, hPil, hPil / 2);
        ctx.fillStyle = UNGU_MUDA; ctx.fill();
        ctx.fillStyle = UNGU_TUA;
        ctx.fillText(umur, xPil + 30, yNama - 12);
      }
    }

    // Kotak ringkasan naratif (mockup: .summary-box).
    const ringkas = (isi.ringkas ?? '').trim();
    if (ringkas) {
      const lebar = W - 280 - 88;
      const { px, baris } = ukuranPas(ctx, ringkas, lebar, 4, (p) => `500 ${p}px ${fTeks}`, 50, 38);
      const hBaris = Math.round(px * 1.5);
      const hKotak = baris.length * hBaris + 56;
      const yKotak = yKepala + 60;
      jalurKotakBulat(ctx, 140, yKotak, W - 280, hKotak, 16 * M);
      ctx.fillStyle = UNGU_MUDA; ctx.fill();
      ctx.fillStyle = UNGU_TUA; ctx.font = `500 ${px}px ${fTeks}`;
      let yb = yKotak + 28 + px;
      for (const b of baris) { ctx.fillText(b, 184, yb); yb += hBaris; }
      yKepala = yKotak + hKotak;
    }

    // Empat angka utama
    const kotak: { n: string; l: string; d?: DeltaKartu }[] = [
      { n: String(isi.ideBermain), l: 'Ide Bermain', d: isi.delta?.ideBermain },
      { n: String(isi.video), l: 'Video ditonton', d: isi.delta?.video },
      { n: String(isi.sesiGame), l: 'Sesi game', d: isi.delta?.sesiGame },
      // Angka utama keempat = TOTAL AKTIVITAS, bukan "total waktu main".
      //
      // 🐞 Durasi hanya tercatat untuk sesi game (`hasil_main.durasi_detik`);
      // `kegiatan_anak` tak punya kolom durasi sama sekali. Jadi "waktu main" tak pernah bisa
      // mewakili seluruh aktivitas, dan anak yang mengerjakan 9 Ide Bermain tanpa menyentuh
      // game mendapat rapor berbunyi "0 m" — terbaca seperti rapor yang rusak. Mockup masih
      // memakai "Total waktu main"; angkanya sengaja TIDAK diikuti, tata letaknya diikuti.
      { n: String(isi.totalAktivitas), l: 'Total aktivitas', d: isi.delta?.totalAktivitas },
    ];
    const kw = (W - 280 - 3 * 40) / 4;
    const yKartu = yKepala + 70;
    const hKartu = 340;
    kotak.forEach((k, i) => {
      const x = 140 + i * (kw + 40);
      jalurKotakBulat(ctx, x, yKartu, kw, hKartu, 16 * M);
      ctx.fillStyle = KARTU; ctx.fill();
      ctx.strokeStyle = GARIS; ctx.lineWidth = 1.5 * M; ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = UNGU; ctx.font = `800 118px ${fJudul}`;
      ctx.fillText(k.n, x + kw / 2, yKartu + 170);
      ctx.fillStyle = ABU; ctx.font = `600 46px ${fTeks}`;
      ctx.fillText(k.l, x + kw / 2, yKartu + 260);
      // Baris delta hanya digambar bila ADA pembandingnya — lihat `deltaTeks` di
      // `domain/laporan-bulanan.ts`: bulan pertama seorang anak tak punya bulan lalu.
      const d = k.d;
      if (d && d.teks) {
        ctx.font = `700 38px ${fTeks}`;
        ctx.fillStyle = d.arah === 'naik' ? HIJAU : d.arah === 'turun' ? AMBER : ABU;
        const tanda = d.arah === 'naik' ? '▲ ' : d.arah === 'turun' ? '▼ ' : '= ';
        ctx.fillText(tanda + d.teks, x + kw / 2, yKartu + 320);
      }
    });
    ctx.textAlign = 'left';

    // ——— Dua kolom isi ———
    //
    // Pembagiannya SENGAJA: kolom kiri untuk daftar pendek (kegiatan, area, event), kolom kanan
    // sepenuhnya untuk dua bagian panjang — catatan perkembangan & hasil konsultasi. Versi
    // pertama menaruh semuanya di kanan, dan hasilnya bagian konsultasi TIDAK IKUT TERCETAK
    // sementara kolom kiri kosong separuh. Itu ditemukan dari memeriksa gambarnya, bukan kodenya.
    const kiriX = 140, kananX = W / 2 + 40, kolomL = W / 2 - 220;
    // Ruang kaki halaman. Batas isi menentukan kapan teks dipotong, jadi setiap baris baru di
    // kaki WAJIB menaikkan angka ini — kalau tidak, isi kolom akan menabrak kaki halamannya.
    // Isinya sekarang: garis putus-putus, legenda BSH/MB, kartu penggoda bulan depan (bila
    // ada), dan kalimat penutup.
    const adaTeaser = !!(isi.temaBulanDepan ?? '').trim();
    const TINGGI_KAKI = adaTeaser ? 490 : 310;
    const BATAS_BAWAH = hTotal - TINGGI_KAKI;
    // Kolom isi mulai tepat di bawah kartu angka, bukan pada angka tetap — tingginya kini
    // bergantung pada ada tidaknya kotak ringkasan di atasnya.
    let yK = yKartu + hKartu + 140, yR = yKartu + hKartu + 140;

    /**
     * Berapa banyak isi yang TIDAK termuat pada tinggi ini. Inilah yang memutuskan perlu
     * tidaknya halaman kedua.
     *
     * Bukan "sampai mana `yK`/`yR` turun" — percobaan pertama memakai itu dan SELALU
     * menyimpulkan dua halaman. Sebabnya: tata letak ini elastis. Hampir semua batas
     * (`batasKiri`, `plafonCatatan`, `plafonNaratif`) diturunkan dari tinggi kanvas, jadi
     * mengukur pada kanvas dua halaman membuat isinya ikut memanjang mengisi kanvas itu.
     * Yang menandakan "tidak cukup" adalah adanya isi yang dipotong, bukan panjangnya isi.
     */
    let terpotong = 0;
    /**
     * Anggaran panjang daftar, diturunkan dari TINGGI halaman — bukan angka tetap.
     *
     * Angka-angka aslinya (7 baris evaluasi, 8 ide bermain, 5 video) ditala pada halaman
     * LANDSCAPE yang tinggi logisnya 2480. Begitu kertasnya jadi portrait, tinggi logis satu
     * halaman jadi hampir dua kali itu — dan angka tetap yang sama membuat rapor melompat ke
     * halaman kedua padahal separuh halaman pertama masih kosong. Sebabnya angka tetap bukan
     * batas RUANG, melainkan batas jumlah: ia memotong isi lalu penghitung `terpotong`
     * membacanya sebagai "tidak cukup".
     */
    const muat = (padaLandscape: number) => Math.max(1, Math.round((padaLandscape * hTotal) / 2480));

    /**
     * Menggeser sebuah baris ke halaman 2 bila ia akan TERBELAH oleh potongan kertas.
     *
     * Cukup satu penjaga karena seluruh isi kolom digambar lewat empat pembantu di bawah ini;
     * masing-masing memanggilnya lebih dulu dengan tinggi yang ia perlukan. Tanpa ini, kanvas
     * dua halaman tetap "berhasil" di mata tipe dan build, tapi satu baris teks tercetak
     * separuh di bawah halaman 1 dan separuh di atas halaman 2.
     */
    const ATAS_HAL1 = H_HAL - 160;     // di bawah ini tinggal ruang penanda "halaman 1 dari 2"
    const hindariPotongan = (y: number, tinggi: number) => {
      if (hTotal <= H_HAL) return y;   // satu halaman: tak ada yang bisa terbelah
      if (y > ATAS_HAL1) return y;     // sudah di halaman 2
      if (y + tinggi <= ATAS_HAL1) return y;
      return H_HAL + 190;              // mulai lagi di bawah margin atas halaman 2
    };

    const judulBagian = (teks: string, x: number, y: number) => {
      // Judul butuh ruang untuk DIRINYA plus baris pertama isinya — judul yang berdiri
      // sendirian di kaki halaman 1 memisahkan kepala dari isinya.
      y = hindariPotongan(y, 170);
      ctx.fillStyle = UNGU; ctx.font = `800 54px ${fJudul}`;
      ctx.fillText(teks, x, y);
      return y + 70;
    };
    // Baris RINGKAS untuk daftar kolom kiri: satu halaman A4 harus memuat daftar kegiatan,
    // catatan guru, konsultasi, DAN evaluasi kurikulum. Dengan ukuran baris biasa, bagian
    // terakhir selalu kalah — dan yang kalah itu justru isi yang paling dicari orang tua.
    const barisRingkas = (teks: string, x: number, y: number, lebar: number) => {
      y = hindariPotongan(y, 44);
      const { px, baris } = ukuranPas(ctx, teks, lebar, 1, (p) => `500 ${p}px ${fTeks}`, 38, 26);
      ctx.fillStyle = TEKS; ctx.font = `500 ${px}px ${fTeks}`;
      for (const b of baris) { ctx.fillText(b, x, y); y += Math.round(px * 1.28); }
      return y + 4;
    };
    // `warna` opsional: isi di dalam kartu ber-tint memakai warna teksnya sendiri (mockup
    // .psych-note), sebab teks abu-gelap standar di atas latar merah muda terbaca kusam.
    const barisTeks = (teks: string, x: number, y: number, lebar: number, maksBaris = 2, warna = TEKS) => {
      y = hindariPotongan(y, maksBaris * 58);
      const { px, baris } = ukuranPas(ctx, teks, lebar, maksBaris, (p) => `500 ${p}px ${fTeks}`, 44, 32);
      ctx.fillStyle = warna; ctx.font = `500 ${px}px ${fTeks}`;
      for (const b of baris) { ctx.fillText(b, x, y); y += Math.round(px * 1.28); }
      return y + 6;
    };

    /**
     * Batang progres untuk evaluasi kurikulum: rel abu + isi ungu + pecahan di ujung kanan.
     *
     * Menggantikan "— 2/3" berupa teks polos. Pecahannya TETAP ditulis di sebelah batang,
     * bukan diganti persentase: "2/3" memberi tahu ada berapa butir seluruhnya, sedangkan
     * "67%" menyembunyikannya — dan bagi orang tua, "2 dari 3" itulah yang bisa ditindaklanjuti.
     */
    /** Lebar batang dibatasi: selebar kolom ia terbaca sebagai GARIS PEMISAH, bukan progres. */
    const LEBAR_BATANG = 430;
    const barisProgres = (x: number, y: number, lebar: number, tercapai: number, total: number) => {
      y = hindariPotongan(y, 62);
      const tot = Math.max(0, Math.floor(total));
      const cap = Math.min(Math.max(0, Math.floor(tercapai)), tot);
      const pecahan = `${cap}/${tot}`;
      const h = 20, wRel = Math.min(Math.max(120, lebar - 140), LEBAR_BATANG);
      // `barisRingkas`/`barisTeks` memakai `y` sebagai BASELINE baris yang digambarnya, dan
      // mengembalikan baseline baris berikutnya. Jadi batang ini menempati "satu baris" itu:
      // pucuknya sedikit di atas baseline (seperti pucuk huruf), bukan di bawahnya —
      // menggambarnya di bawah baseline membuatnya menimpa teks baris selanjutnya.
      const yRel = y - 22;
      ctx.fillStyle = '#e6e0f2';
      jalurKotakBulat(ctx, x, yRel, wRel, h, h / 2); ctx.fill();
      if (tot > 0 && cap > 0) {
        ctx.fillStyle = UNGU;
        jalurKotakBulat(ctx, x, yRel, Math.max(h, (wRel * cap) / tot), h, h / 2); ctx.fill();
      }
      // Pecahan menempel di sebelah KANAN batang, bukan di tepi kolom: angka yang terpisah
      // jauh dari batangnya tak lagi terbaca sebagai keterangan batang itu.
      ctx.font = `800 34px ${fTeks}`;
      ctx.fillStyle = UNGU; ctx.textAlign = 'left';
      ctx.fillText(pecahan, x + wRel + 20, y + 2);
      // Jarak sesudah batang dibuat LAPANG (bukan setinggi batangnya): baris di bawahnya bisa
      // berupa teks ber-emoji atau JUDUL BAGIAN 54px, yang glyph-nya jauh lebih tinggi daripada
      // teks biasa. Perhitungan yang pas-pasan membuat batang menimpa keduanya — dan itu hanya
      // terlihat di render, tak pernah di tipe atau di build.
      return y + 62;
    };

    /**
     * Tag kode skala PAUD (BB/MB/BSH/BSB) dengan warna latar.
     *
     * Warnanya diambil dari `SKALA_PAUD` — sumber yang SAMA dengan yang dipakai layar aplikasi,
     * bukan dari dua warna contoh di mockup. Alasannya: mockup hanya memuat BSH & MB, dan
     * warna hijau yang dipakainya untuk BSH bertumpuk dengan BSB pada skala penuh
     * (BB merah → MB kuning → BSH biru → BSB hijau). Memakai warna mockup akan membuat
     * "Berkembang Sesuai Harapan" dan "Berkembang Sangat Baik" tak lagi bisa dibedakan.
     */
    const tagSkala = (kode: string, kananX2: number, y: number) => {
      const m = metaSkala(kode);
      ctx.font = `800 32px ${fTeks}`;
      const w = ctx.measureText(m.kode).width + 34, h = 46;
      ctx.fillStyle = m.bg;
      jalurKotakBulat(ctx, kananX2 - w, y - h + 10, w, h, 12); ctx.fill();
      ctx.fillStyle = m.warna; ctx.textAlign = 'center';
      ctx.fillText(m.kode, kananX2 - w / 2, y + 2);
      ctx.textAlign = 'left';
    };

    // Ruang untuk EVALUASI KURIKULUM di dasar kolom kiri DICADANGKAN lebih dulu, bukan
    // disisakan: pelajaran dari blok "Direkomendasikan" yang dulu terpotong habis karena
    // hanya kebagian sisa. Semua batas kolom kiri memakai `batasKiri`, bukan BATAS_BAWAH.
    // Anggaran evaluasi dihitung per BARIS, bukan per tema: satu tema bisa punya beberapa
    // aktivitas, dan nama aktivitasnya IKUT dicetak — nama tema saja tak cukup untuk tahu
    // bagian mana yang sudah dikuasai. Barisnya disusun dulu lalu dipotong pada anggaran,
    // baru ruangnya dicadangkan; jadi yang tercetak persis sama dengan yang direncanakan.
    const MAKS_BARIS_EVAL = muat(7);
    const barisEval: { teks: string; anak?: boolean; tercapai?: number; total?: number }[] = [];
    let temaTertulis = 0;
    let aktivitasTerpotong = 0;
    for (const e of isi.evaluasi ?? []) {
      if (barisEval.length >= MAKS_BARIS_EVAL) break;
      const peran = e.peran === 'ortu' ? 'orang tua' : e.peran;
      // Posisi kurikulum ditulis SINGKAT (B2·M3) — barisnya sempit, dan kepanjangan akan
      // memaksa `ukuranPas` mengecilkan huruf sampai sulit dibaca.
      // Kode internal seperti "[B1·M4]" TIDAK dirender ke rapor orang tua — ia bahasa admin.
      // Posisinya tetap disebut, tapi dengan kata yang bisa dibaca siapa pun.
      const pos = e.bulan ? ` (bulan ke-${e.bulan} · minggu ke-${e.minggu ?? 1})` : '';
      // Pecahannya TIDAK lagi di dalam teks: ia digambar sebagai batang progres di baris
      // berikutnya, jadi menuliskannya dua kali hanya menggandakan informasi yang sama.
      barisEval.push({ teks: `• ${e.judulTema}${pos} (${peran})`, tercapai: e.tercapai, total: e.total });
      temaTertulis++;
      for (const g of e.perAktivitas ?? []) {
        if (barisEval.length >= MAKS_BARIS_EVAL) { aktivitasTerpotong++; continue; }
        barisEval.push({ teks: g.aktivitas, anak: true, tercapai: g.tercapai, total: g.total });
      }
    }
    const sisaTema = (isi.evaluasi?.length ?? 0) - temaTertulis;
    const nEval = barisEval.length;
    // Tak ada lagi "cadangan": evaluasi digambar lebih dulu, jadi batas kolom kiri = batas
    // halaman. Daftar di bawahnyalah yang mengalah, dan itu terlihat lewat "…dan N lainnya".
    const batasKiri = BATAS_BAWAH;

    // ——— KOLOM KIRI, bagian 1: EVALUASI KURIKULUM ———
    // Perannya IKUT ditulis: "dinilai orang tua" dan "dinilai guru" tak setara sebagai bukti,
    // dan rapor yang meleburkannya membuat pembaca salah menimbang.
    if (nEval > 0) {
      // DITARUH PALING ATAS, bukan di dasar kolom. Empat percobaan sebelumnya mencoba
      // "mencadangkan ruang" untuk blok ini di bawah, dan tiap kali kalah oleh daftar di
      // atasnya — berujung pemotongan senyap. Menempatkan yang paling penting lebih dulu
      // menghapus seluruh persoalan itu: daftar kegiatan di bawahnyalah yang menyusut, dan
      // penyusutannya SELALU disebut lewat "…dan N lainnya".
      yK = judulBagian('📋 Evaluasi kurikulum', kiriX, yK);
      // Penjaga BERLAPIS: cadangan ruang di atas sudah menyisakan tempat, tapi bila daftar
      // sebelumnya tetap meluber, baris di sini berhenti sendiri sebelum menabrak footer.
      let evalDicetak = 0;
      for (const b of barisEval) {
        // Penjaga berlapis: berhenti satu baris lebih awal supaya "…dan N tema lain" pasti
        // kebagian tempat. Tanpa itu, pemotongan kembali jadi senyap.
        // Anggarannya dinaikkan: tiap baris kini bisa membawa BATANG PROGRES di bawahnya,
        // jadi berhenti pada ambang lama akan membuat batang terakhir tergambar di footer.
        if (yK > BATAS_BAWAH - 150) break;
        // Baris aktivitas menjorok ke dalam supaya terbaca sebagai bagian dari temanya.
        const jorok = b.anak ? 96 : 0;   // sejajar dengan teks aktivitas yang menjorok
        const adaBatang = typeof b.total === 'number' && b.total > 0;
        // Teks dan BATANGNYA dipindah halaman sebagai SATU paket. Kalau masing-masing menanyai
        // `hindariPotongan` sendiri-sendiri, teksnya masih muat di kaki halaman 1 sementara
        // batangnya terdorong ke halaman 2 — dan batang progres tanpa barisnya, di puncak
        // halaman, hanyalah angka "3/3" yang tak diketahui milik siapa.
        yK = hindariPotongan(yK, adaBatang ? 44 + 62 : 44);
        yK = barisRingkas(b.anak ? `    🎯 ${b.teks}` : b.teks, kiriX, yK, kolomL);
        if (adaBatang && typeof b.total === 'number') {
          yK = barisProgres(kiriX + jorok + 26, yK, kolomL - jorok - 26, b.tercapai ?? 0, b.total);
        }
        evalDicetak += 1;
      }
      terpotong += barisEval.length - evalDicetak;
      // Sisa yang tak muat DISEBUT, bukan dihilangkan diam-diam — baik tema maupun baris
      // rincian aktivitas yang kena anggaran.
      // `yK` WAJIB diperbarui: dulu blok ini paling bawah sehingga nilai baliknya tak
      // berpengaruh, tapi sekarang ada bagian lain di bawahnya — mengabaikannya membuat
      // baris ini bertumpuk dengan judul berikutnya.
      terpotong += sisaTema + aktivitasTerpotong;
      if (sisaTema > 0) yK = barisRingkas(`…dan ${sisaTema} tema lain`, kiriX, yK, kolomL);
      else if (aktivitasTerpotong > 0) yK = barisRingkas('…rincian aktivitas dipersingkat', kiriX, yK, kolomL);
    }

    // ——— KOLOM KIRI, bagian 2: daftar pendek ———
    yK = judulBagian('🎈 Ide Bermain di rumah', kiriX, yK);
    if (isi.daftarIdeBermain.length === 0) yK = barisTeks('Belum ada kegiatan tercatat bulan ini.', kiriX, yK, kolomL);
    else {
      // Yang tak muat DISEBUT jumlahnya. Pemotongan diam-diam membuat rapor terbaca seolah
      // itulah seluruh kegiatan anak bulan itu — dan orang tua tak punya cara menyadarinya.
      let n = 0;
      for (const it of isi.daftarIdeBermain.slice(0, muat(8))) {
        yK = barisRingkas(`• ${it.judul}${it.jumlah > 1 ? ` (${it.jumlah}×)` : ''}`, kiriX, yK, kolomL);
        n++;
        if (yK > batasKiri - 420) break;
      }
      terpotong += isi.daftarIdeBermain.length - n;
      if (n < isi.daftarIdeBermain.length) yK = barisRingkas(`…dan ${isi.daftarIdeBermain.length - n} lainnya`, kiriX, yK, kolomL);
    }

    // Setiap bagian berikutnya hanya digambar bila ruangnya cukup untuk JUDUL + 1 baris.
    // Tanpa penjaga ini, judulnya tetap tercetak lalu isinya menembus footer.
    const adaRuang = (butuh: number) => yK + butuh <= BATAS_BAWAH;

    if (adaRuang(70 + 52)) {
    yK += 26;
    yK = judulBagian('📺 Video yang ditonton', kiriX, yK);
    if (isi.daftarVideo.length === 0) yK = barisTeks('Belum ada video ditonton bulan ini.', kiriX, yK, kolomL);
    else {
      let n = 0;
      for (const it of isi.daftarVideo.slice(0, muat(5))) {
        yK = barisRingkas(`• ${it.judul}${it.jumlah > 1 ? ` (${it.jumlah}×)` : ''}`, kiriX, yK, kolomL);
        n++;
        if (yK > batasKiri - 250) break;
      }
      terpotong += isi.daftarVideo.length - n;
      if (n < isi.daftarVideo.length) yK = barisRingkas(`…dan ${isi.daftarVideo.length - n} lainnya`, kiriX, yK, kolomL);
    }

    } else terpotong += 1;   // seluruh bagian "Video yang ditonton" tak kebagian ruang

    if (adaRuang(70 + 104)) {
    yK += 26;
    yK = judulBagian('🌱 Area yang paling dilatih', kiriX, yK);
    // Keadaan kosong SERAGAM & menyebut apa yang kosong. "Belum ada data" tak memberi tahu
    // data apa, dan bercampur dengan tanda "—" di bagian lain membuat rapor terlihat setengah
    // jadi. Di sini sekalian dijelaskan dari mana angkanya dihitung — lihat catatan di
    // `sesiGame`/`menit`: keduanya HANYA dari sesi game.
    yK = barisTeks(isi.areaTerbanyak ?? 'Belum ada aktivitas yang tercatat bulan ini.', kiriX, yK, kolomL, 1);
    // Asal-usul angkanya ikut ditulis: "area paling dilatih" tanpa penjelasan hanya klaim.
    if (isi.areaTerbanyak && isi.areaDariMana) yK = barisTeks(isi.areaDariMana, kiriX + 26, yK, kolomL - 26);
    // Delta bintang ditulis MENEMPEL pada angkanya (mockup: "(+9 dari bulan lalu)"), bukan di
    // baris sendiri: ia keterangan atas satu angka, dan baris terpisah membuatnya terbaca
    // sebagai butir baru.
    const dB = isi.delta?.bintang;
    yK = barisTeks(
      `Total ⭐ ${isi.bintang} bintang terkumpul${dB?.teks ? ` (${dB.teks})` : ''}`,
      kiriX, yK, kolomL, 1,
    );

    // Event yang catatan gurunya sudah tercetak di kolom kanan TIDAK diulang di sini —
    // barisnya persis sama, dan pengulangan itu memakan ruang yang dibutuhkan evaluasi.
    } else terpotong += 1;   // bagian "Area yang paling dilatih" tak kebagian ruang

    const eventBelumTertulis = isi.event.filter((e) => !isi.catatanGuru.some((c) => c.judulEvent === e));
    if (eventBelumTertulis.length > 0 && adaRuang(70 + 52)) {
      yK += 26;
      yK = judulBagian('🎈 Kelas bermain yang diikuti', kiriX, yK);
      let n = 0;
      for (const e of eventBelumTertulis.slice(0, 5)) {
        yK = barisRingkas(`• ${e}`, kiriX, yK, kolomL);
        n++;
        if (yK > batasKiri - 104) break;   // sisakan 2 baris ringkas
      }
      terpotong += eventBelumTertulis.length - n;
      if (n < eventBelumTertulis.length) yK = barisRingkas(`…dan ${eventBelumTertulis.length - n} lainnya`, kiriX, yK, kolomL);
    } else if (eventBelumTertulis.length > 0) terpotong += eventBelumTertulis.length;

    // ——— KOLOM KANAN, bagian 1: catatan perkembangan ———
    // Diberi PLAFON agar bagian konsultasi di bawahnya dijamin kebagian ruang. Sisa yang tak
    // termuat disebut jumlahnya — tidak dihilangkan diam-diam.
    const adaKonsultasi = isi.rekomendasiPsikolog.length > 0 || isi.rekomendasiItem.length > 0 || isi.rekomendasi > 0;
    // Pembagian ruang kolom kanan digeser 0,55 -> 0,45 ke arah bagian PSIKOLOG.
    //
    // Alasannya prioritas isi: bagian psikolog memuat naratif DAN butir saran yang bisa
    // ditindaklanjuti orang tua ("Di rumah: perbanyak bermain peran"), dan dengan 55% untuk
    // catatan, butirnya tak pernah kebagian tempat sama sekali. Catatan perkembangan yang
    // menyusut sudah punya pemberitahuannya sendiri ("…dan N catatan lain"), jadi
    // penyusutannya terlihat — bukan senyap.
    const plafonCatatan = adaKonsultasi ? 1160 + (BATAS_BAWAH - 1160) * 0.45 : BATAS_BAWAH;

    yR = judulBagian('📝 Catatan perkembangan', kananX, yR);
    if (isi.catatanGuru.length === 0) yR = barisTeks('Belum ada catatan perkembangan bulan ini.', kananX, yR, kolomL, 1);
    else {
      let dicetak = 0;
      for (const c of isi.catatanGuru) {
        if (yR > plafonCatatan - 90) break;
        yR = barisTeks(`• ${c.judulEvent}${c.dinilai_oleh ? ` — ${c.dinilai_oleh}` : ''}`, kananX, yR, kolomL, 1);
        // 🐞 Baris penilaian yang tak muat dulu hilang TANPA JEJAK. Pemberitahuan
        // "…dan N catatan lain" di bawah hanya menghitung CATATAN yang utuh tak tercetak, bukan
        // baris domain yang terpotong di dalam sebuah catatan — jadi rapor bisa menampilkan
        // tiga dari empat domain dan tampak lengkap.
        let nilaiDicetak = 0;
        for (const n of c.penilaian) {
          // Berhenti lebih awal supaya pemberitahuannya kebagian tempat.
          if (yR > plafonCatatan - 120) break;
          // Kode skalanya dipindah dari teks ke TAG BERWARNA di tepi kanan kolom.
          // Tagnya digambar SEBELUM teksnya bergulir ke bawah, jadi ia sejajar dengan baris
          // pertama entri — menaruhnya sesudah baris terakhir butuh posisi-x akhir teks, dan
          // `barisTeks` hanya mengembalikan y (teksnya bisa membungkus beberapa baris).
          const yTag = yR;
          const lebarTeks = kolomL - 26 - 200;   // sisakan ruang untuk tagnya (tag ~110px + jarak)
          yR = barisTeks(`${rapikanDaftar(n.area)}: ${rapikanDaftar(n.indikator)}`, kananX + 26, yR, lebarTeks);
          if ((n.nilai ?? '').trim()) tagSkala(n.nilai, kananX + kolomL, yTag);
          nilaiDicetak += 1;
        }
        terpotong += c.penilaian.length - nilaiDicetak;
        if (nilaiDicetak < c.penilaian.length && yR < plafonCatatan - 40) {
          yR = barisTeks(`   …${c.penilaian.length - nilaiDicetak} penilaian lain — lihat di aplikasi`, kananX + 26, yR, kolomL - 26, 1);
        }
        if (c.catatan && yR < plafonCatatan - 40) yR = barisTeks(`"${c.catatan}"`, kananX + 26, yR, kolomL - 26);
        dicetak += 1;
      }
      terpotong += isi.catatanGuru.length - dicetak;
      if (dicetak < isi.catatanGuru.length) {
        yR = barisTeks(`…dan ${isi.catatanGuru.length - dicetak} catatan lain — lihat di aplikasi`, kananX, yR, kolomL, 1);
      }
    }

    // ——— KOLOM KANAN, bagian 2: hasil konsultasi psikolog ———
    if (adaKonsultasi) {
      // Daftar item (produk / event / ide bermain) DIJAMIN kebagian ruang: tingginya dicadangkan
      // dulu, lalu bagian naratif di atasnya dibatasi sisa ruangnya. Tanpa cadangan ini, blok
      // rekomendasi item hilang total begitu rekomendasi naratifnya panjang — dan itu justru
      // bagian yang paling ditunggu orang tua.
      const MAKS_ITEM = 4;
      const nItem = Math.min(isi.rekomendasiItem.length, MAKS_ITEM);
      const cadanganItem = nItem > 0 ? 70 + nItem * 60 + (isi.rekomendasiItem.length > MAKS_ITEM ? 60 : 0) : 0;
      const plafonNaratif = BATAS_BAWAH - cadanganItem;

      // Bagian ini mengikuti tepat di bawah catatan, TIDAK dipaku ke `plafonCatatan`.
      //
      // Dulu barisnya `Math.max(yR + 26, plafonCatatan)`, yang memaksanya mulai di 45% kolom
      // walau catatannya selesai lebih awal. Pada halaman landscape yang sempit itu tak
      // kelihatan karena catatannya hampir selalu memenuhi plafonnya; pada halaman portrait
      // ia meninggalkan LUBANG kosong sebesar seperempat kolom. `plafonCatatan` tetap
      // berguna sebagai BATAS bagi catatan di atasnya — yang tak berguna adalah memakainya
      // sebagai titik mulai yang dipaku.
      yR = yR + 26;
      yR = judulBagian('🧠 Hasil konsultasi psikolog', kananX, yR);
      // Awal kartu ber-tint dicatat: isinya digambar dulu, tintnya menyusul di akhir.
      const tintDari = yR - 52;
      // Keadaan kosong DISEBUT, sama seperti di layar: bagian yang hanya memuat "2 sesi
      // konsultasi bulan ini" terbaca sebagai "psikolognya tidak memberi apa-apa", padahal
      // yang benar adalah rekomendasi tertulisnya belum ada pada periode ini.
      if (isi.rekomendasi > 0) yR = barisTeks(`${isi.rekomendasi} sesi konsultasi bulan ini`, kananX, yR, kolomL, 1, PINK_JUDUL);
      if (isi.rekomendasiPsikolog.length === 0 && isi.rekomendasiItem.length === 0) {
        yR = barisTeks('Belum ada rekomendasi tertulis dari psikolog untuk periode ini.', kananX, yR, kolomL, 2, PINK_TEKS);
      }
      let naratifDicetak = 0;
      for (const x of isi.rekomendasiPsikolog) {
        if (yR > plafonNaratif - 80) break;
        yR = barisTeks(`• ${x.judul || 'Rekomendasi'}${x.oleh ? ` — ${x.oleh}` : ''}`, kananX, yR, kolomL, 1, PINK_TEKS);
        // Naratif psikolog diberi 5 baris, bukan 2 (bawaan `barisTeks`).
        //
        // 🐞 Dengan 2 baris, `ukuranPas` gagal memuat kalimat sepanjang ini bahkan pada ukuran
        // huruf terkecilnya, lalu MEMOTONGNYA dengan "…" — dan yang terpotong justru isi paling
        // berharga di rapor: kesimpulan psikolog. Efek sampingnya menguntungkan: dengan ruang
        // baris yang cukup, `ukuranPas` memilih huruf yang LEBIH BESAR, bukan lebih kecil.
        // 3 baris, bukan 4: kolom kanan kelebihan muatan, dan naratif yang lebih panjang
        // MENELAN butir rekomendasinya. Naratif adalah konteks; butir ("Di rumah: perbanyak
        // bermain peran") adalah yang bisa ditindaklanjuti orang tua — jadi butirlah yang
        // dimenangkan saat ruang berebut, dan sisa naratifnya yang diringkas.
        if (x.isi && yR < plafonNaratif - 40) yR = barisTeks(x.isi, kananX + 26, yR, kolomL - 26, 3, PINK_TEKS);
        // 🐞 Butir rekomendasi dulu hilang TANPA JEJAK begitu naratifnya panjang: loop ini
        // sekadar `break`, tanpa memberi tahu ada yang tak tercetak. Padahal butir inilah
        // bagian yang bisa ditindaklanjuti orang tua ("Di rumah: perbanyak bermain peran"),
        // dan rapor yang menelannya diam-diam membuat orang tua tak pernah tahu ia ada.
        let butirDicetak = 0;
        for (const b of x.butir) {
          // Berhenti LEBIH AWAL supaya baris "…N saran lain" pasti kebagian tempat — pola yang
          // sama dengan evaluasi kurikulum di kolom kiri. Tanpa cadangan ini, barisnya
          // tergambar di luar kartu dan menabrak footer.
          if (yR > plafonNaratif - 130) break;
          yR = barisTeks(`– ${b.judul ? `${b.judul}: ` : ''}${b.isi ?? ''}`, kananX + 26, yR, kolomL - 26, 2, PINK_TEKS);
          butirDicetak += 1;
        }
        terpotong += x.butir.length - butirDicetak;
        if (butirDicetak < x.butir.length && yR < plafonNaratif - 40) {
          yR = barisTeks(`   …${x.butir.length - butirDicetak} saran lain — lihat di aplikasi`, kananX + 26, yR, kolomL - 26, 1, PINK_TEKS);
        }
        naratifDicetak += 1;
      }
      terpotong += isi.rekomendasiPsikolog.length - naratifDicetak;
      if (naratifDicetak < isi.rekomendasiPsikolog.length) {
        yR = barisTeks(`…dan ${isi.rekomendasiPsikolog.length - naratifDicetak} rekomendasi lain — lihat di aplikasi`, kananX, yR, kolomL, 1, PINK_TEKS);
      }

      // Tint kartu digambar SESUDAH isinya, memakai blend `multiply`.
      //
      // Tingginya baru diketahui setelah teksnya tergambar (teks membungkus, jadi tak bisa
      // dihitung di muka), dan `destination-over` tak menolong karena latar halaman sudah opak
      // — tintnya akan tersembunyi di belakangnya. `multiply` dengan warna terang menggelapkan
      // latar putih menjadi tint yang diminta, sementara teks yang nyaris hitam tetap hitam.
      {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = PINK_KARTU;
        // Tinggi tint DIJEPIT ke batas isi: tanpa itu, baris "…N saran lain" yang muncul di
        // ujung anggaran bisa menyeret kartunya turun sampai menyentuh footer.
        const tintSampai = Math.min(yR + 16, BATAS_BAWAH);
        jalurKotakBulat(ctx, kananX - 28, tintDari, kolomL + 56, Math.max(80, tintSampai - tintDari), 28);
        ctx.fill();
        ctx.restore();
      }

      if (nItem > 0) {
        yR = Math.max(yR + 8, plafonNaratif);
        yR = barisTeks('🎁 Direkomendasikan:', kananX, yR, kolomL, 1);
        for (const it of isi.rekomendasiItem.slice(0, MAKS_ITEM)) {
          const label = it.jenis === 'materi' ? 'ide bermain' : it.jenis;
          yR = barisTeks(`• ${it.judul ?? '—'} (${label})${it.catatan ? ` · ${it.catatan}` : ''}`, kananX + 26, yR, kolomL - 26, 1);
        }
        terpotong += isi.rekomendasiItem.length - MAKS_ITEM;
        if (isi.rekomendasiItem.length > MAKS_ITEM) {
          barisTeks(`…dan ${isi.rekomendasiItem.length - MAKS_ITEM} rekomendasi lain`, kananX + 26, yR, kolomL - 26, 1);
        }
      }
    }

    // ——— Kaki halaman (mockup: .footer) ———
    //
    // Urutannya mengikuti mockup: garis putus-putus, legenda singkatan, kartu penggoda bulan
    // depan, lalu kalimat penutup. Semua diukur dari `y0` — pangkal ruang kaki — supaya
    // menambah atau menghapus baris di sini cukup mengubah `TINGGI_KAKI` di satu tempat.
    const y0 = hTotal - TINGGI_KAKI;

    ctx.save();
    ctx.strokeStyle = GARIS; ctx.lineWidth = 1.5 * M; ctx.setLineDash([14, 12]);
    ctx.beginPath(); ctx.moveTo(140, y0 + 20); ctx.lineTo(W - 140, y0 + 20); ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'center';
    // Legenda singkatan: istilah BSH/MB dipakai di kolom kanan tapi tak dijelaskan di mana pun,
    // dan orang tua tak wajib tahu kosakata PAUD.
    ctx.font = `600 40px ${fTeks}`; ctx.fillStyle = ABU;
    ctx.fillText('BSH = Berkembang Sesuai Harapan  ·  MB = Mulai Berkembang', W / 2, y0 + 105);

    const teaser = (isi.temaBulanDepan ?? '').trim();
    if (teaser) {
      // Kartu ungu pekat dengan teks putih (mockup: .teaser). Hanya digambar bila temanya
      // BENAR-BENAR ada — janji "tema baru menanti" yang temanya belum disiapkan admin adalah
      // janji yang tak bisa ditepati bulan depan.
      jalurKotakBulat(ctx, 140, y0 + 145, W - 280, 160, 14 * M);
      ctx.fillStyle = UNGU; ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = `700 46px ${fTeks}`;
      const teks = `✨ Bulan depan: tema baru “${teaser}” menanti ${isi.namaAnak}!`;
      const { px, baris } = ukuranPas(ctx, teks, W - 380, 2, (q) => `700 ${q}px ${fTeks}`, 46, 34);
      ctx.font = `700 ${px}px ${fTeks}`;
      const hb = Math.round(px * 1.32);
      let yb = y0 + 145 + (160 - baris.length * hb) / 2 + px;
      for (const b of baris) { ctx.fillText(b, W / 2, yb); yb += hb; }
      ctx.fillStyle = ABU;
    }

    ctx.font = `italic 46px ${fTeks}`; ctx.fillStyle = ABU;
    ctx.fillText('Teruslah bermain, belajar, dan bertumbuh, ya! 💛  ·  KidzPlayful',
      W / 2, y0 + (teaser ? 390 : 215));

    // Penanda potongan: rapor ini dicetak di atas dua lembar, jadi batasnya harus TERLIHAT.
    if (hTotal > H_HAL) {
      ctx.save();
      ctx.strokeStyle = '#c9bfe4'; ctx.lineWidth = 5; ctx.setLineDash([28, 22]);
      ctx.beginPath(); ctx.moveTo(46, H_HAL); ctx.lineTo(W - 46, H_HAL); ctx.stroke();
      ctx.restore();
      ctx.textAlign = 'right';
      ctx.fillStyle = ABU; ctx.font = `700 36px ${fTeks}`;
      ctx.fillText('halaman 1 dari 2', W - 90, H_HAL - 70);
      ctx.fillText('halaman 2 dari 2', W - 90, hTotal - 60);
      ctx.textAlign = 'left';
    }

    return { canvas, terpotong };
  };

  // Satu halaman DULU. Bila tak ada isi yang terpotong, itulah rapornya — rapor pendek tak
  // pantas dicetak di dua lembar dengan satu lembar nyaris kosong. Baru bila ada yang tak
  // termuat, digambar ulang pada dua halaman.
  const satu = await render(H_HAL);
  const canvas = satu.terpotong === 0 ? satu.canvas : (await render(H_HAL * 2)).canvas;

  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob gagal'))), 'image/jpeg', 0.92));
}
