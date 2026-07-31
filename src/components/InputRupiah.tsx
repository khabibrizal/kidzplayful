// src/components/InputRupiah.tsx — input nominal dengan format ribuan otomatis (id-ID)
// Menampilkan "1.000.000"; nilai yang ter-submit tetap dibersihkan ke angka oleh server action.
//
// SENGAJA UNCONTROLLED (tanpa useState). Versi controlled sebelumnya membuat nominal TETAP
// TERISI setelah data tersimpan, karena React 19 hanya mereset field uncontrolled saat
// <form action={serverAction}> selesai. Mask ribuan diterapkan langsung ke nilai DOM,
// sehingga tampilan tetap berformat tapi field ikut dibersihkan React setelah simpan.
'use client';

const fmt = (s: string | number) => {
  const d = String(s).replace(/[^0-9]/g, '');
  return d ? Number(d).toLocaleString('id-ID') : '';
};

export default function InputRupiah({ name, placeholder, className, style, awal = '' }: {
  name: string; placeholder?: string; className?: string; style?: React.CSSProperties; awal?: string | number;
}) {
  return (
    <input
      name={name}
      inputMode="numeric"
      defaultValue={fmt(awal)}
      onChange={(e) => {
        const el = e.currentTarget;
        const f = fmt(el.value);
        if (el.value === f) return;
        // Pertahankan jarak kursor dari UJUNG kanan, supaya menyunting di tengah angka
        // (mis. menghapus satu digit di "1.000.000") tidak melompatkan kursor ke akhir.
        const dariKanan = el.value.length - (el.selectionStart ?? el.value.length);
        el.value = f;
        const pos = Math.max(0, f.length - dariKanan);
        el.setSelectionRange(pos, pos);
      }}
      placeholder={placeholder}
      className={className}
      style={style}
    />
  );
}
