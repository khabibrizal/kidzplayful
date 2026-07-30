// src/components/game/Aset.tsx
import { isUrlAset } from '@/lib/game/aset';

// `segera`: matikan lazy-load — dipakai game yang gambarnya HARUS tampil seketika
// saat dibalik (mis. Kartu Ingatan); lazy bikin unduhan baru mulai ketika kartu dibuka.
export default function Aset({ value, size = 56, segera = false }: { value: string; size?: number; segera?: boolean }) {
  if (isUrlAset(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="" loading={segera ? 'eager' : 'lazy'} decoding={segera ? 'sync' : 'async'} style={{ width: size, height: size, objectFit: 'contain' }} />
    );
  }
  return <span style={{ fontSize: size }}>{value}</span>;
}
