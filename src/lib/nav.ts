// src/lib/nav.ts — validasi tujuan navigasi internal.

/**
 * Path internal yang aman dipakai sebagai tujuan `kembali`, atau null bila tidak.
 *
 * Parameter tujuan yang menerima URL apa pun adalah lubang **open redirect**: tautan
 * "kembali" bisa dikirim ke orang lain untuk melemparkannya ke situs asing dari domain
 * kita. Karena itu yang diterima hanya path yang benar-benar dimulai dengan satu `/`.
 *
 * Yang ditolak dan alasannya:
 *   `//luar.example`   → protocol-relative; browser membacanya sebagai host lain
 *   `/\luar.example`   → sebagian browser memperlakukan `\` seperti `/`
 *   `javascript:`/`data:` → bukan navigasi halaman sama sekali
 *   `kelas/abc`        → relatif; tujuannya tergantung halaman asal, jadi tak bisa dijamin
 */
export function pathInternal(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  if (!s.startsWith('/')) return null;
  if (s.startsWith('//') || s.startsWith('/\\')) return null;
  return s;
}
