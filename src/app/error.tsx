'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 60 }}>😅</div>
      <h1 style={{ color: 'var(--lavender-d)' }}>Yah, ada sedikit gangguan</h1>
      <p style={{ color: 'var(--abu)' }}>Coba lagi sebentar ya.</p>
      <button className="kp-btn" onClick={reset}>Coba lagi</button>
    </main>
  );
}
