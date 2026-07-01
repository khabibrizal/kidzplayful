// src/lib/game/butir.ts
import type { Mesin, DataTekan, DataSeret, DataCocok, DataMewarnai } from './tipe';

export function butirDariForm(mesin: Mesin, form: unknown): DataTekan | DataSeret | DataCocok | DataMewarnai {
  // form sudah berbentuk objek sesuai mesin; fungsi ini titik normalisasi tunggal
  if (mesin === 'tekan-sesuai') return form as DataTekan;
  if (mesin === 'seret-wadah') return form as DataSeret;
  if (mesin === 'mewarnai') return form as DataMewarnai;
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
    if (b.sumber === 'svg') {
      if (!b.svg || !b.svg.includes('<svg')) return 'Unggah file SVG yang valid.';
      return '';
    }
    if (!b.template) return 'Pilih template gambar.';
    if (b.mode === 'sesuai' && (!b.target || Object.keys(b.target).length === 0)) return 'Mode sesuai butuh warna target.';
    return '';
  }
  const b = butir as DataCocok;
  if (!b.pasangan || b.pasangan.length < 2) return 'Butuh minimal 2 pasangan.';
  return '';
}
