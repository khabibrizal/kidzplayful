// src/app/(legal)/tentang/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { PROFIL } from '@/lib/profil';
import * as g from '../gaya';

export const metadata: Metadata = {
  title: 'Tentang Kami',
  description: 'Tentang KidzPlayful — kelas bermain (playgroup) & game edukasi anak usia 0–6 tahun, memadukan pembelajaran online dan offline.',
  alternates: { canonical: '/tentang' },
};

export default function Tentang() {
  return (
    <article>
      <h1 style={g.h1}>Tentang {PROFIL.nama}</h1>
      <p style={g.meta}>Main sambil belajar 🌿</p>

      <p style={g.p}>
        {PROFIL.nama} adalah layanan <b>kelas bermain (playgroup)</b> dan <b>game edukasi</b> untuk anak usia <b>0–6 tahun</b>. Kami percaya bahwa cara terbaik anak belajar adalah melalui bermain — maka kami memadukan aktivitas kelas bermain dengan game digital yang dirancang sesuai tahap usia dan dengan screen time yang terkontrol.
      </p>

      <h2 style={g.h2}>Misi kami</h2>
      <p style={g.p}>
        Membantu setiap anak bertumbuh optimal — melatih sensorik, motorik, kognitif, bahasa, sosial-emosional, hingga berpikir komputasional (koding) — dengan cara yang menyenangkan, aman, dan terpantau oleh orang tua.
      </p>

      <h2 style={g.h2}>Apa yang kami tawarkan</h2>
      <ul style={g.ul}>
        <li>Game edukasi bertahap sesuai usia, tanpa iklan.</li>
        <li>Kelas bermain online &amp; offline (hybrid) di {PROFIL.kota}.</li>
        <li>Rapor perkembangan per aspek PAUD + e-sertifikat.</li>
        <li>Screen time terkontrol dan didampingi orang tua.</li>
      </ul>

      <h2 style={g.h2}>Untuk siapa</h2>
      <p style={g.p}>
        Untuk orang tua yang ingin menemani buah hatinya belajar sambil bermain — dari bayi yang baru mengenal warna dan suara, hingga anak TK yang mulai belajar logika dan koding.
      </p>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link href="/daftar" className="kp-btn mint">Coba Gratis 14 Hari ▶</Link>
      </div>
    </article>
  );
}
