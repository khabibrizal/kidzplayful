// src/components/game/PinGate.tsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function PinGate({
  pinTersimpan,
  onSukses,
  onBatal,
}: { pinTersimpan: string | null; onSukses: () => void; onBatal: () => void }) {
  const [buf, setBuf] = useState('');
  const [pesan, setPesan] = useState(pinTersimpan ? 'Masukkan PIN' : 'Buat PIN baru (4 angka)');
  const mode = pinTersimpan ? 'verif' : 'set';

  async function tekan(n: string) {
    if (buf.length >= 4) return;
    const baru = buf + n;
    setBuf(baru);
    if (baru.length === 4) {
      if (mode === 'set') {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('profiles').update({ pin_ortu: baru }).eq('id', user!.id);
        onSukses();
      } else if (baru === pinTersimpan) {
        onSukses();
      } else {
        setPesan('PIN salah, coba lagi');
        setBuf('');
      }
    }
  }

  const keypadKey: React.CSSProperties = {
    border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 20,
    padding: 12, borderRadius: 14, background: '#f3eefb', color: 'var(--tinta)', boxShadow: '0 3px 0 #e2d8f3',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(60,48,100,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div className="kp-card" style={{ width: 260, textAlign: 'center' }}>
        <div style={{ fontSize: 34 }}>🔒</div>
        <h3 style={{ color: 'var(--tinta)' }}>Khusus Orang Tua</h3>
        <p style={{ color: 'var(--abu)', fontSize: 12, margin: '4px 0 12px' }}>{pesan}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < buf.length ? 'var(--lavender-d)' : '#e6def5' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button key={n} style={keypadKey} onClick={() => tekan(n)}>{n}</button>
          ))}
          <button aria-label="Tutup" style={keypadKey} onClick={onBatal}>✕</button>
          <button style={keypadKey} onClick={() => tekan('0')}>0</button>
          <button aria-label="Hapus" style={keypadKey} onClick={() => setBuf(buf.slice(0, -1))}>⌫</button>
        </div>
      </div>
    </div>
  );
}
