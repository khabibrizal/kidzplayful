// src/components/InputRupiah.tsx — input nominal dengan format ribuan otomatis (id-ID)
// Menampilkan "1.000.000"; nilai yang ter-submit tetap dibersihkan ke angka oleh server action.
'use client';
import { useState } from 'react';

const fmt = (s: string | number) => {
  const d = String(s).replace(/[^0-9]/g, '');
  return d ? Number(d).toLocaleString('id-ID') : '';
};

export default function InputRupiah({ name, placeholder, className, style, awal = '' }: {
  name: string; placeholder?: string; className?: string; style?: React.CSSProperties; awal?: string | number;
}) {
  const [v, setV] = useState(fmt(awal));
  return (
    <input
      name={name}
      inputMode="numeric"
      value={v}
      onChange={(e) => setV(fmt(e.target.value))}
      placeholder={placeholder}
      className={className}
      style={style}
    />
  );
}
