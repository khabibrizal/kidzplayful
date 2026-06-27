// src/components/FavoritBtn.tsx
'use client';
import { useState, useTransition } from 'react';
import { toggleFavorit } from '@/lib/data/favorit-actions';

export default function FavoritBtn({ kelasId, awal }: { kelasId: string; awal: boolean }) {
  const [fav, setFav] = useState(awal);
  const [pending, start] = useTransition();

  function klik(e: React.MouseEvent) {
    e.stopPropagation();
    const baru = !fav;
    setFav(baru);
    start(() => {
      toggleFavorit(kelasId).catch(() => setFav(!baru)); // kembalikan bila gagal
    });
  }

  return (
    <button
      onClick={klik}
      disabled={pending}
      aria-label={fav ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}
      title={fav ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}
      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}
    >
      {fav ? '❤️' : '🤍'}
    </button>
  );
}
