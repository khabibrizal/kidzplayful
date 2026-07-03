// src/lib/game/butir.ts
import type { Mesin, DataTekan, DataSeret, DataCocok, DataMewarnai, DataDekode } from './tipe';

export function butirDariForm(mesin: Mesin, form: unknown): DataTekan | DataSeret | DataCocok | DataMewarnai | DataDekode {
  // form sudah berbentuk objek sesuai mesin; fungsi ini titik normalisasi tunggal
  if (mesin === 'tekan-sesuai') return form as DataTekan;
  if (mesin === 'seret-wadah') return form as DataSeret;
  if (mesin === 'mewarnai') return form as DataMewarnai;
  if (mesin === 'dekode') return form as DataDekode;
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
  const b = butir as DataCocok;
  if (!b.pasangan || b.pasangan.length < 2) return 'Butuh minimal 2 pasangan.';
  return '';
}
