// src/app/opengraph-image.tsx — gambar Open Graph (dibagikan di WA/FB/Twitter)
import { ImageResponse } from 'next/og';

export const alt = 'KidzPlayful — Kelas Bermain & Game Edukasi Anak';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(150deg, #e9dcff, #d4ecff)',
          color: '#5b5170',
          fontFamily: 'sans-serif',
          padding: 80,
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 800, color: '#9B7FD4', letterSpacing: -1 }}>
          KidzPlayful
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 24, textAlign: 'center', lineHeight: 1.3 }}>
          Kelas Bermain & Game Edukasi Anak
        </div>
        <div style={{ fontSize: 30, color: '#7a7290', marginTop: 18, textAlign: 'center' }}>
          Usia 0–6 tahun · main sambil belajar · screen time terkontrol
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 44,
            background: '#6FC9A3',
            color: '#fff',
            fontSize: 30,
            fontWeight: 800,
            padding: '16px 40px',
            borderRadius: 999,
          }}
        >
          Coba Gratis 14 Hari
        </div>
      </div>
    ),
    { ...size },
  );
}
