// src/components/Sampul.tsx — ikon/sampul tema: render <img> bila URL, atau emoji/teks bila bukan.
// Presentational murni (aman di Server & Client Component).
export function isSampulUrl(v?: string | null): boolean {
  return /^(https?:\/\/|\/)/.test((v ?? '').trim());
}

export default function Sampul({ value, size = 26 }: { value?: string | null; size?: number }) {
  const v = (value ?? '').trim();
  if (isSampulUrl(v)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={v} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: 'cover', borderRadius: 8, verticalAlign: 'middle', display: 'inline-block' }} />;
  }
  return <span style={{ fontSize: size }}>{v || '🎈'}</span>;
}
