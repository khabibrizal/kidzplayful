// src/components/StikerSheet.tsx — lembar stiker nama 9×6 cm (10/lembar F4, 2 kolom × 5 baris)
// Tiap stiker: nama panggilan anak + KATEGORI KELAS (Baby/Toddler Class).
// Kategori dibawa PER STIKER, bukan per lembar, karena satu event bisa memuat peserta
// Baby Class dan Toddler Class sekaligus.
//
// PAGINASI (perbaikan bug "stiker terpotong di batas halaman"):
// versi sebelumnya memakai satu CSS Grid panjang dan mengandalkan `break-inside: avoid`
// pada tiap stiker. Chrome TIDAK menghormati itu untuk grid item saat memaginasi, sehingga
// baris ke-5 terpenggal separuh di bawah halaman. Sekarang stiker dipotong SENDIRI menjadi
// kelompok 10 (2×5) dan tiap kelompok jadi satu blok halaman dengan `break-after: page`,
// jadi tidak ada baris yang bisa menyeberang halaman.

export interface ItemStiker { nama: string; kelas: string }

export const PER_LEMBAR = 10;   // 2 kolom × 5 baris pada F4

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
  // potong jadi lembaran 10 stiker
  const lembar: ItemStiker[][] = [];
  for (let i = 0; i < items.length; i += PER_LEMBAR) lembar.push(items.slice(i, i + PER_LEMBAR));

  return (
    <>
      {lembar.map((isi, li) => (
        <div
          key={li}
          style={{
            display: 'flex', flexWrap: 'wrap', width: '180mm', margin: '0 auto',
            // baris tidak boleh menyeberang halaman
            breakInside: 'avoid',
            breakAfter: li < lembar.length - 1 ? 'page' : 'auto',
          }}
        >
          {isi.map((it, i) => <Stiker key={i} nama={it.nama} kelas={it.kelas} bg={bg} />)}
        </div>
      ))}
    </>
  );
}
