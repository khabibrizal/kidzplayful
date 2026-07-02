// src/components/Logo.tsx — logo KidzPlayful (gambar di public/logo.png)
// Logo baru berlatar transparan → tampil polos tanpa "plate".
// (untuk logo berlatar gelap, set prop plate={true} agar dibungkus kotak hitam membulat).
export default function Logo({ height = 60, plate = false }: { height?: number; plate?: boolean }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="KidzPlayful" style={{ height, width: 'auto', maxWidth: '100%', display: 'block' }} />
  );
  if (!plate) return img;
  return (
    <span style={{ display: 'inline-flex', background: '#000', borderRadius: 18, padding: '10px 16px', boxShadow: '0 6px 18px rgba(91,81,112,.18)' }}>
      {img}
    </span>
  );
}
