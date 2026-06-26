// src/components/ui/Confetti.tsx
'use client';
import { useEffect, useState } from 'react';

export default function Confetti() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 4200);
    return () => clearTimeout(t);
  }, []);
  if (!on) return null;
  const emo = ['⭐', '🌸', '🎈', '💜', '🌟', '🍃'];
  return (
    <div className="kp-confetti" aria-hidden="true">
      {Array.from({ length: 26 }).map((_, i) => (
        <span key={i} style={{
          left: `${4 + (i * 3.6) % 92}%`,
          animationDuration: `${2.2 + (i % 5) * 0.4}s`,
          animationDelay: `${(i % 8) * 0.12}s`,
        }}>{emo[i % emo.length]}</span>
      ))}
    </div>
  );
}
