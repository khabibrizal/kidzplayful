// src/components/StikerSheet.tsx — lembar stiker nama 9×6 cm (10/lembar F4, grid 2×5)
// Tiap stiker: nama panggilan anak + KATEGORI KELAS (Baby/Toddler Class).
// Kategori dibawa PER STIKER, bukan per lembar, karena satu event bisa memuat peserta
// Baby Class dan Toddler Class sekaligus.

export interface ItemStiker { nama: string; kelas: string }

function Stiker({ nama, kelas, bg }: { nama: string; kelas: string; bg: string | null }) {
  const sh = bg ? { textShadow: '0 1px 3px rgba(255,255,255,.9)' } : {};
  return (
    <div style={{ position: 'relative', width: '90mm', height: '60mm', boxSizing: 'border-box', border: '1px dashed #c9c9c9', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '5mm', background: bg ? '#fff' : 'linear-gradient(135deg,#f6f1ff,#eafaf1)', breakInside: 'avoid' }}>
      {bg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '10pt', color: 'var(--mint-d, #2e9e63)', fontWeight: 700, ...sh }}>Hai, aku</div>
        <div style={{ fontSize: '22pt', fontWeight: 800, color: 'var(--lavender-d, #6b4fb0)', lineHeight: 1.1, margin: '1mm 0', ...sh }}>{nama}</div>
        {/* Baris kategori DISEMBUNYIKAN bila kelasnya gabungan/tidak diketahui — lebih baik
            kosong daripada memunculkan kembali nama event yang memang diminta dihapus. */}
        {!!kelas && <div style={{ fontSize: '11pt', fontWeight: 700, color: 'var(--tinta, #3a3350)', ...sh }}>{kelas}</div>}
      </div>
    </div>
  );
}

export default function StikerSheet({ items, bg }: { items: ItemStiker[]; bg: string | null }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90mm 90mm', width: '180mm', margin: '0 auto' }}>
      {items.map((it, i) => <Stiker key={i} nama={it.nama} kelas={it.kelas} bg={bg} />)}
    </div>
  );
}
