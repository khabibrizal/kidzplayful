// src/lib/game/butir.ts
import type { Mesin, DataTekan, DataSeret, DataCocok, DataMewarnai, DataDekode, DataUrutan, DataJalur, DataHitung, DataCocokkan, DataEjaKata, DataGaris, DataSukuKata, DataJiplak, DataHitungBenda, DataIngatan } from './tipe';
import { JALUR_KARAKTER } from './jiplak-path';

export function butirDariForm(mesin: Mesin, form: unknown): DataTekan | DataSeret | DataCocok | DataMewarnai | DataDekode | DataUrutan | DataJalur | DataHitung | DataCocokkan | DataEjaKata | DataGaris | DataSukuKata | DataJiplak | DataHitungBenda | DataIngatan {
  // form sudah berbentuk objek sesuai mesin; fungsi ini titik normalisasi tunggal
  if (mesin === 'tekan-sesuai') return form as DataTekan;
  if (mesin === 'seret-wadah') return form as DataSeret;
  if (mesin === 'mewarnai') return form as DataMewarnai;
  if (mesin === 'dekode') return form as DataDekode;
  if (mesin === 'urutan') return form as DataUrutan;
  if (mesin === 'jalur') return form as DataJalur;
  if (mesin === 'hitung') return form as DataHitung;
  if (mesin === 'cocokkan') return form as DataCocokkan;
  if (mesin === 'ejakata') return form as DataEjaKata;
  if (mesin === 'garis') return form as DataGaris;
  if (mesin === 'sukukata') return form as DataSukuKata;
  if (mesin === 'jiplak') return form as DataJiplak;
  if (mesin === 'hitung-benda') return form as DataHitungBenda;
  if (mesin === 'ingatan') return form as DataIngatan;
  return form as DataCocok;
}

export function validasiButir(mesin: Mesin, butir: unknown): string {
  if (mesin === 'tekan-sesuai') {
    const b = butir as DataTekan;
    if (!b.soal?.length) return 'Minimal 1 soal.';
    for (const s of b.soal) {
      if (!s.tanya?.trim() || !s.benar?.trim() || !s.salah?.length) return 'Tiap soal butuh pertanyaan, jawaban benar, dan minimal 1 pengecoh.';
    }
    return '';
  }
  if (mesin === 'seret-wadah') {
    const b = butir as DataSeret;
    if (!b.wadah?.length || !b.benda?.length) return 'Butuh minimal 1 wadah dan 1 benda.';
    return '';
  }
  if (mesin === 'mewarnai') {
    const b = butir as DataMewarnai;
    if (!b.palette?.length) return 'Palet warna kosong.';
    const perluTarget = b.mode === 'sesuai' || b.mode === 'berkode'; // berkode = color-by-number, butuh target
    if (b.sumber === 'svg') {
      if (!b.svg || !b.svg.includes('<svg')) return 'Unggah file SVG yang valid.';
      if (perluTarget && (!b.target || Object.keys(b.target).length === 0)) return 'Atur warna target minimal 1 area (mode sesuai/berkode).';
      return '';
    }
    if (!b.template) return 'Pilih template gambar.';
    if (perluTarget && (!b.target || Object.keys(b.target).length === 0)) return 'Mode sesuai/berkode butuh warna target.';
    return '';
  }
  if (mesin === 'dekode') {
    const b = butir as DataDekode;
    if (!b.legenda?.length) return 'Legenda kode kosong (butuh minimal 1 simbol).';
    for (const m of b.legenda) if (!m.simbol?.trim() || !m.nilai?.trim()) return 'Tiap legenda butuh simbol dan nilai.';
    if (!b.soal?.length) return 'Butuh minimal 1 soal.';
    const set = new Set(b.legenda.map((m) => m.simbol));
    for (const s of b.soal) {
      if (!s?.length) return 'Tiap soal butuh minimal 1 simbol.';
      for (const sim of s) if (!set.has(sim)) return `Simbol "${sim}" pada soal tidak ada di legenda.`;
    }
    return '';
  }
  if (mesin === 'urutan') {
    const b = butir as DataUrutan;
    if (!b.soal?.length) return 'Butuh minimal 1 soal.';
    if (b.tipe === 'urutkan') {
      for (const sq of b.soal) if (!sq.urut || sq.urut.length < 2) return 'Tiap soal "urutkan" butuh minimal 2 item.';
    } else {
      for (const sq of b.soal) {
        if (!sq.tampil?.length) return 'Tiap soal "pola" butuh urutan yang ditampilkan.';
        if (!sq.benar?.trim()) return 'Tiap soal "pola" butuh jawaban benar.';
        if (!sq.salah?.length) return 'Tiap soal "pola" butuh minimal 1 pengecoh.';
      }
    }
    return '';
  }
  if (mesin === 'jalur') {
    const b = butir as DataJalur;
    if (!b.soal?.length) return 'Butuh minimal 1 soal.';
    for (const sq of b.soal) {
      if (!sq.kolom || !sq.baris || sq.kolom < 2 || sq.baris < 2) return 'Ukuran grid minimal 2×2.';
      const inB = (pt?: [number, number]) => !!pt && pt[0] >= 0 && pt[1] >= 0 && pt[0] < sq.kolom && pt[1] < sq.baris;
      if (!inB(sq.mulai) || !inB(sq.tujuan)) return 'Posisi mulai/tujuan di luar grid.';
      if (sq.mulai[0] === sq.tujuan[0] && sq.mulai[1] === sq.tujuan[1]) return 'Mulai dan tujuan tidak boleh sama.';
    }
    return '';
  }
  if (mesin === 'hitung') {
    const b = butir as DataHitung;
    if (!b.legenda?.length) return 'Legenda angka kosong.';
    for (const m of b.legenda) { if (!m.simbol?.trim()) return 'Tiap legenda butuh simbol.'; if (typeof m.nilai !== 'number' || Number.isNaN(m.nilai)) return 'Tiap legenda butuh nilai angka.'; }
    if (!b.soal?.length) return 'Butuh minimal 1 soal.';
    const nilai = new Map(b.legenda.map((m) => [m.simbol, m.nilai]));
    for (const sq of b.soal) {
      if (!nilai.has(sq.kiri) || !nilai.has(sq.kanan)) return 'Simbol pada soal tidak ada di legenda.';
      if (sq.operasi !== '+' && sq.operasi !== '-' && sq.operasi !== 'x' && sq.operasi !== ':') return 'Operasi harus +, −, × (x), atau ÷ (:).';
      if (sq.operasi === '-' && (nilai.get(sq.kiri)! < nilai.get(sq.kanan)!)) return 'Untuk pengurangan, nilai kiri harus ≥ nilai kanan (hindari hasil minus).';
      if (sq.operasi === ':') {
        const ka = nilai.get(sq.kanan)!;
        if (ka === 0) return 'Untuk pembagian, nilai kanan tidak boleh 0.';
        if (nilai.get(sq.kiri)! % ka !== 0) return 'Untuk pembagian, nilai kiri harus habis dibagi nilai kanan (hasil bulat).';
      }
    }
    return '';
  }
  if (mesin === 'cocokkan') {
    const b = butir as DataCocokkan;
    if (!b.pasangan || b.pasangan.length < 2) return 'Butuh minimal 2 pasangan.';
    for (const pr of b.pasangan) if (!pr.kiri?.trim() || !pr.kanan?.trim()) return 'Tiap pasangan butuh isi kiri dan kanan.';
    return '';
  }
  if (mesin === 'ejakata') {
    const b = butir as DataEjaKata;
    if (!b.soal?.length) return 'Butuh minimal 1 soal.';
    for (const sq of b.soal) { if (!sq.kata?.trim()) return 'Tiap soal butuh kata yang dieja.'; if (sq.kata.trim().length < 2) return 'Kata minimal 2 huruf.'; }
    return '';
  }
  if (mesin === 'sukukata') {
    const b = butir as DataSukuKata;
    if (!b.soal?.length) return 'Butuh minimal 1 soal.';
    for (const sq of b.soal) {
      if (!sq.kata?.trim()) return 'Tiap soal butuh kata.';
      if (!sq.sukuKata?.length) return 'Tiap soal butuh suku kata (pisahkan dengan strip, mis. bu-ku).';
      if (sq.sukuKata.join('') !== sq.kata.replace(/[\s-]/g, '')) return `Gabungan suku kata "${sq.sukuKata.join('-')}" tidak sama dengan kata "${sq.kata}".`;
      if (sq.mode === 'susun' && sq.sukuKata.length < 2) return 'Mode susun butuh minimal 2 suku kata.';
      if (sq.mode === 'dengar' && !(sq.pengecoh?.filter((x) => x.trim()).length)) return 'Mode dengar butuh minimal 1 pengecoh.';
    }
    return '';
  }
  if (mesin === 'jiplak') {
    const b = butir as DataJiplak;
    if (!b.soal?.length) return 'Butuh minimal 1 karakter.';
    for (const sq of b.soal) {
      if (!sq.karakter || !JALUR_KARAKTER[sq.karakter]) return `Karakter "${sq.karakter}" belum tersedia (pakai A–Z, a–z, 0–9).`;
    }
    return '';
  }
  if (mesin === 'hitung-benda') {
    const b = butir as DataHitungBenda;
    if (!b.soal?.length) return 'Butuh minimal 1 soal.';
    for (const sq of b.soal) {
      if (!sq.benda?.trim()) return 'Tiap soal butuh benda (emoji/gambar).';
      if (!Number.isInteger(sq.jumlah) || sq.jumlah < 1 || sq.jumlah > 10) return 'Jumlah benda harus 1–10.';
      if (sq.mode === 'banyak-mana') {
        if (!sq.benda2?.trim()) return 'Mode banyak-mana butuh benda kedua.';
        if (!Number.isInteger(sq.jumlah2) || (sq.jumlah2 ?? 0) < 1 || (sq.jumlah2 ?? 0) > 10) return 'Jumlah benda kedua harus 1–10.';
        if (sq.jumlah2 === sq.jumlah) return 'Mode banyak-mana: kedua jumlah tidak boleh sama.';
      }
    }
    return '';
  }
  if (mesin === 'ingatan') {
    const b = butir as DataIngatan;
    const pairs = (b.pasangan ?? []).map((p) => (typeof p === 'string' ? { a: p } : p)).filter((p) => p.a && p.a.trim());
    if (pairs.length < 2) return 'Butuh minimal 2 pasangan.';
    return '';
  }
  if (mesin === 'garis') {
    const b = butir as DataGaris;
    if (!b.soal?.length) return 'Butuh minimal 1 soal.';
    for (const sq of b.soal) {
      if (!sq.kolom || !sq.baris || sq.kolom < 2 || sq.baris < 2) return 'Ukuran grid titik minimal 2×2.';
      if (!sq.garis?.length) return 'Tiap soal butuh minimal 1 garis (hubungkan 2 titik).';
      const n = sq.kolom * sq.baris;
      for (const g of sq.garis) if (g[0] < 0 || g[1] < 0 || g[0] >= n || g[1] >= n || g[0] === g[1]) return 'Garis menghubungkan 2 titik berbeda yang valid.';
    }
    return '';
  }
  const b = butir as DataCocok;
  if (!b.pasangan || b.pasangan.length < 2) return 'Butuh minimal 2 pasangan.';
  return '';
}
