// src/components/game/Aset.tsx
import { isUrlAset } from '@/lib/game/aset';

export default function Aset({ value, size = 56 }: { value: string; size?: number }) {
  if (isUrlAset(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />
    );
  }
  return <span style={{ fontSize: size }}>{value}</span>;
}
