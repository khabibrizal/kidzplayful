// src/lib/form-reset.ts — jalankan pembersihan state saat <form> induk di-reset.
//
// LATAR: React 19 mereset <form action={serverAction}> secara otomatis setelah action
// selesai, TAPI itu hanya memulihkan field UNCONTROLLED ke nilai default-nya. Komponen
// client yang menyimpan nilai di useState (input bermask, pemilih berkas, dropdown
// ber-info) tidak ikut bersih — nilainya tetap tertinggal untuk entri berikutnya.
//
// Pola yang dipakai di repo ini: nilai yang IKUT TER-SUBMIT dibuat uncontrolled (biar
// dibersihkan React sendiri), dan hook ini hanya menyinkronkan state TAMPILAN.
'use client';
import { useEffect, useRef, type RefObject } from 'react';

export function usePadaResetForm<T extends HTMLElement>(
  ref: RefObject<T | null>,
  saatReset: () => void,
) {
  const cb = useRef(saatReset);
  useEffect(() => { cb.current = saatReset; }, [saatReset]);

  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const tangani = () => cb.current();
    form.addEventListener('reset', tangani);
    return () => form.removeEventListener('reset', tangani);
  }, [ref]);
}
