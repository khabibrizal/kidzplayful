// src/components/InputSandi.tsx — input kata sandi dengan tombol mata (lihat/sembunyikan).
// Membantu pengguna memeriksa ketikannya, terutama di HP yang rawan salah ketik.
'use client';
import { useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

function IkonMata({ terbuka }: { terbuka: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
      {/* garis miring = kondisi "tersembunyi" */}
      {!terbuka && <path d="M3.5 3.5 20.5 20.5" />}
    </svg>
  );
}

export default function InputSandi({ className = 'kp-input', style, ...rest }: Props) {
  const [lihat, setLihat] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <input
        {...rest}
        type={lihat ? 'text' : 'password'}
        className={className}
        // ruang kanan supaya teks tidak tertimpa tombol
        style={{ paddingRight: 46, ...style }}
      />
      <button
        type="button"                       // WAJIB: tanpa ini tombol ikut men-submit form
        onClick={() => setLihat((v) => !v)}
        aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        aria-pressed={lihat}
        title={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        style={{
          position: 'absolute', top: 0, right: 6, height: 47, width: 38,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'transparent', cursor: 'pointer',
          color: lihat ? 'var(--lavender-d)' : '#9a93ab', padding: 0,
        }}
      >
        <IkonMata terbuka={lihat} />
      </button>
    </span>
  );
}
