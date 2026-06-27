// src/components/UnduhPdfBtn.tsx
'use client';

/** Unduh tampilan kelas bermain sebagai PDF via dialog cetak browser (Simpan sebagai PDF). */
export default function UnduhPdfBtn({ judul }: { judul: string }) {
  function unduh() {
    const asli = document.title;
    document.title = judul || 'Kelas Bermain'; // jadi nama file PDF default
    window.print();
    setTimeout(() => { document.title = asli; }, 800);
  }
  return (
    <button onClick={unduh} className="kp-btn" style={{ display: 'inline-block', marginTop: 8 }}>
      ⬇ Unduh PDF
    </button>
  );
}
