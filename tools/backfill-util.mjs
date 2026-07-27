// tools/backfill-util.mjs — aturan pemilihan file untuk backfill kompres (murni, teruji).
export function perluKompres(path, size) {
  const p = String(path).toLowerCase();
  if (p.startsWith('event/sertifikat') || p.startsWith('event/stiker')) return false; // template cetak
  const ext = p.split('.').pop();
  if (!['jpg', 'jpeg', 'png'].includes(ext)) return false; // webp/pdf/svg/gif dilewati
  if (size < 300 * 1024) return false; // sudah kecil
  return true;
}
