// src/components/game/CariPager.tsx — kotak cari + navigasi halaman untuk daftar Mode Anak.
//
// Dipakai bersama oleh Main Hari Ini, Game Edukasi, dan Pojok Video supaya ketiganya
// berperilaku sama: cari menyaring SELURUH daftar (bukan halaman yang sedang dibuka), dan
// nomor halaman ikut menyesuaikan.
'use client';

export default function CariPager({ q, onQ, hal, totalHal, total, adaFilter, label = 'judul' }: {
  q: string;
  onQ: (v: string) => void;
  hal: number;
  totalHal: number;
  total: number;
  adaFilter: boolean;
  label?: string;
}) {
  return (
    <div className="no-print" style={{ padding: '4px 6px 0' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          className="kp-input"
          value={q}
          // Mengubah kata kunci mengembalikan ke halaman 1 (diurus pemanggil): tanpa itu,
          // hasil pencarian bisa mendarat di halaman yang sudah tak ada lagi.
          onChange={(e) => onQ(e.target.value)}
          placeholder={`🔍 Cari ${label}…`}
          style={{ flex: 1, marginBottom: 0, fontSize: 14 }}
          aria-label={`Cari ${label}`}
        />
        {q !== '' && (
          <button type="button" className="kp-btn putih" onClick={() => onQ('')} style={{ padding: '8px 12px', fontSize: 13 }}>
            ✕
          </button>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--abu)', marginTop: 4 }}>
        {adaFilter
          ? total === 0 ? `Tak ada yang cocok dengan “${q}”.` : `${total} hasil untuk “${q}”`
          : `${total} item`}
        {totalHal > 1 && ` · halaman ${hal} dari ${totalHal}`}
      </div>
    </div>
  );
}

/** Tombol halaman sebelumnya/berikutnya. Disembunyikan bila hanya ada satu halaman. */
export function PagerBaris({ hal, totalHal, onHal }: { hal: number; totalHal: number; onHal: (h: number) => void }) {
  if (totalHal <= 1) return null;
  return (
    <div className="no-print" style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', padding: '6px 0' }}>
      <button type="button" className="kp-btn putih" disabled={hal <= 1} onClick={() => onHal(hal - 1)}
        style={{ padding: '8px 14px', fontSize: 13, opacity: hal <= 1 ? 0.5 : 1 }}>‹ Sebelumnya</button>
      <span style={{ fontSize: 12, color: 'var(--abu)' }}>{hal} / {totalHal}</span>
      <button type="button" className="kp-btn putih" disabled={hal >= totalHal} onClick={() => onHal(hal + 1)}
        style={{ padding: '8px 14px', fontSize: 13, opacity: hal >= totalHal ? 0.5 : 1 }}>Berikutnya ›</button>
    </div>
  );
}
