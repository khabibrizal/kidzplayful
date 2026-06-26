// src/components/ui/Pewi.tsx
export default function Pewi({ size = 130 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <ellipse cx="40" cy="26" rx="11" ry="22" fill="#d9c9ff" /><ellipse cx="80" cy="26" rx="11" ry="22" fill="#d9c9ff" />
      <ellipse cx="40" cy="30" rx="5" ry="13" fill="#ffd3e2" /><ellipse cx="80" cy="30" rx="5" ry="13" fill="#ffd3e2" />
      <path d="M30 70 Q22 50 40 48 Q46 34 62 42 Q82 34 86 54 Q102 56 94 74 Q100 92 78 92 L42 92 Q22 92 30 70Z" fill="#fff" stroke="#e3d6fb" strokeWidth="2" />
      <circle cx="50" cy="68" r="5.5" fill="#5b5170" /><circle cx="72" cy="68" r="5.5" fill="#5b5170" />
      <circle cx="52" cy="66" r="1.8" fill="#fff" /><circle cx="74" cy="66" r="1.8" fill="#fff" />
      <circle cx="42" cy="78" r="5" fill="#ffc2d6" /><circle cx="80" cy="78" r="5" fill="#ffc2d6" />
      <path d="M56 76 Q61 81 66 76" stroke="#5b5170" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
