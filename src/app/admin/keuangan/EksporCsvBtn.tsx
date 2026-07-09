// src/app/admin/keuangan/EksporCsvBtn.tsx — unduh data sebagai CSV (dibuka di Excel)
'use client';

export default function EksporCsvBtn({ nama, baris }: { nama: string; baris: (string | number)[][] }) {
  function unduh() {
    const csv = baris.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nama; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button onClick={unduh} style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, padding: '7px 14px', borderRadius: 999, background: '#e6f7ee', color: '#1c7a43' }}>⬇ Ekspor CSV (Excel)</button>
  );
}
