// src/lib/img.ts — kompres & resize gambar di sisi klien SEBELUM upload,
// agar file tersimpan kecil → game/halaman ringan saat dimainkan.
'use client';

export interface KompresOpsi { maksDim?: number; kualitas?: number }

/**
 * Kompres gambar: downscale ke `maksDim` (sisi terpanjang) + encode WebP (jaga transparansi).
 * SVG dibiarkan apa adanya (vektor, sudah ringan). Bila kompresi gagal / hasil lebih besar,
 * kembalikan file asli. Mengembalikan { blob, ext }.
 */
export async function kompresGambar(file: File, opsi: KompresOpsi = {}): Promise<{ blob: Blob; ext: string }> {
  const maksDim = opsi.maksDim ?? 640;
  const kualitas = opsi.kualitas ?? 0.82;
  const tipe = file.type;

  // Lewati non-raster (SVG/gif animasi) — biarkan asli
  if (!tipe.startsWith('image/') || tipe === 'image/svg+xml' || tipe === 'image/gif') {
    return { blob: file, ext: (file.name.split('.').pop() || 'png').toLowerCase() };
  }

  try {
    const bitmap = await muatBitmap(file);
    const skala = Math.min(1, maksDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * skala));
    const h = Math.max(1, Math.round(bitmap.height * skala));

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { blob: file, ext: (file.name.split('.').pop() || 'png').toLowerCase() };
    ctx.drawImage(bitmap, 0, 0, w, h);
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', kualitas));
    // Pakai hasil hanya bila valid & benar-benar lebih kecil dari asli
    if (blob && blob.size > 0 && blob.size < file.size) return { blob, ext: 'webp' };
    return { blob: file, ext: (file.name.split('.').pop() || 'png').toLowerCase() };
  } catch {
    return { blob: file, ext: (file.name.split('.').pop() || 'png').toLowerCase() };
  }
}

async function muatBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file); } catch { /* fallback di bawah */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('load')); img.src = url; });
    return img;
  } finally {
    // revoke ditunda agar drawImage sempat memakai (img sudah loaded)
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
