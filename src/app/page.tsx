// src/app/page.tsx — Landing page publik (satu-satunya halaman yang di-crawl Google).
// Server component: seluruh konten ada di HTML awal → baik untuk SEO.
import type { Metadata } from 'next';
import Logo from '@/components/Logo';

// Data usaha (SEO lokal / structured data). Field kosong otomatis diabaikan.
const PROFIL = {
  nama: 'KidzPlayful',
  telp: '+6282233684933',
  email: '',           // ← isi email asli bila ada
  alamat: '',          // ← isi alamat jalan kelas offline bila sudah ada
  kota: 'Surabaya',
  provinsi: 'Jawa Timur',
  kodePos: '60111',
  negara: 'ID',
  jamBuka: '',         // ← mis. 'Mo-Sa 09:00-17:00'
};

const BASE = 'https://www.kidzplayful.com';

export const metadata: Metadata = {
  title: 'Kelas Bermain & Game Edukasi Anak Usia 0–6 Tahun',
  description:
    'KidzPlayful: kelas bermain (playgroup) online & offline plus game edukasi anak dengan screen time terkontrol. Melatih sensorik, motorik, dan koding anak. Coba gratis 14 hari.',
  alternates: { canonical: '/' },
};

const FITUR = [
  { emo: '🎮', judul: 'Game edukasi anak', teks: 'Puluhan game melatih sensorik, motorik halus, kognitif, bahasa, hingga berpikir komputasional (koding) — dirancang per usia.' },
  { emo: '⏱️', judul: 'Screen time terkontrol', teks: 'Durasi & konten terukur, tanpa iklan. Setiap sesi punya tujuan belajar, aman untuk anak.' },
  { emo: '🎈', judul: 'Kelas bermain online & offline', teks: 'Ikuti event kelas bermain (playgroup) di lokasi kami, dan lanjutkan aktivitasnya lewat aplikasi di rumah.' },
  { emo: '📊', judul: 'Rapor perkembangan & e-sertifikat', teks: 'Pantau tumbuh kembang anak per aspek PAUD, lengkap dengan catatan guru dan e-sertifikat kelas.' },
];

const USIA = [
  { rentang: '0–2 tahun', fokus: 'Stimulasi sensorik & motorik dasar — warna, suara, sentuhan, sebab-akibat sederhana.' },
  { rentang: '2–4 tahun', fokus: 'Kognitif & bahasa — mencocokkan, mengurutkan, mewarnai, mengenal huruf & angka.' },
  { rentang: '4–6 tahun', fokus: 'Berpikir komputasional (koding anak) — pola, arah & jalur, dekode, hitung-kode.' },
];

const FAQ = [
  { t: 'Apa itu KidzPlayful?', j: 'KidzPlayful adalah layanan kelas bermain (playgroup) dan game edukasi digital untuk anak usia 0–6 tahun. Kami memadukan kelas bermain online & offline dengan aktivitas yang melatih sensorik, motorik, kognitif, dan berpikir komputasional (koding).' },
  { t: 'Untuk usia berapa?', j: 'Untuk anak usia 0–6 tahun. Konten dan tingkat kesulitan game menyesuaikan usia anak: 0–2 tahun (sensorik-motorik), 2–4 tahun (kognitif-bahasa), dan 4–6 tahun (koding/computational thinking).' },
  { t: 'Apakah aman untuk screen time anak?', j: 'Ya. Setiap sesi dirancang dengan tujuan belajar, tanpa iklan, dan durasinya terkontrol. Orang tua dapat memantau aktivitas serta perkembangan anak lewat rapor.' },
  { t: 'Apakah ada kelas bermain offline?', j: `Ada. Kami mengadakan event kelas bermain (playgroup) offline${PROFIL.kota ? ` di ${PROFIL.kota}` : ''}. Setiap peserta mendapatkan catatan perkembangan dan e-sertifikat, lalu bisa melanjutkan aktivitas di rumah lewat aplikasi.` },
  { t: 'Berapa biayanya?', j: 'Anda bisa mencoba gratis selama 14 hari tanpa kartu kredit. Setelah itu tersedia langganan bulanan dengan harga terjangkau.' },
];

// Buang properti kosong/undefined agar JSON-LD bersih.
function bersih<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null)) as T;
}

function jsonLd() {
  const alamat = bersih({
    '@type': 'PostalAddress',
    streetAddress: PROFIL.alamat,
    addressLocality: PROFIL.kota,
    addressRegion: PROFIL.provinsi,
    postalCode: PROFIL.kodePos,
    addressCountry: PROFIL.negara,
  });
  return {
    '@context': 'https://schema.org',
    '@graph': [
      bersih({
        '@type': 'Organization',
        '@id': `${BASE}/#organization`,
        name: PROFIL.nama,
        url: BASE,
        logo: `${BASE}/logo.png`,
        email: PROFIL.email,
        telephone: PROFIL.telp,
        description: 'Kelas bermain (playgroup) & game edukasi anak usia 0–6 tahun.',
      }),
      {
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        url: BASE,
        name: PROFIL.nama,
        inLanguage: 'id-ID',
        publisher: { '@id': `${BASE}/#organization` },
      },
      bersih({
        '@type': ['LocalBusiness', 'ChildCare'],
        '@id': `${BASE}/#localbusiness`,
        name: PROFIL.nama,
        url: BASE,
        telephone: PROFIL.telp,
        email: PROFIL.email,
        image: `${BASE}/logo.png`,
        priceRange: 'Rp',
        openingHours: PROFIL.jamBuka,
        areaServed: PROFIL.kota,
        address: alamat,
      }),
      {
        '@type': 'FAQPage',
        '@id': `${BASE}/#faq`,
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.t,
          acceptedAnswer: { '@type': 'Answer', text: f.j },
        })),
      },
    ],
  };
}

const seksi: React.CSSProperties = { maxWidth: 1000, margin: '0 auto', padding: '0 20px' };

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }} />

      <main style={{ minHeight: '100dvh', paddingBottom: 40 }}>
        {/* Header */}
        <header style={{ ...seksi, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
          <Logo height={40} />
          <nav style={{ display: 'flex', gap: 10 }}>
            <a href="/login" className="kp-btn putih" style={{ padding: '10px 20px', fontSize: 15 }}>Masuk</a>
            <a href="/daftar" className="kp-btn" style={{ padding: '10px 20px', fontSize: 15 }}>Daftar</a>
          </nav>
        </header>

        {/* Hero */}
        <section style={{ ...seksi, textAlign: 'center', padding: '40px 20px 30px' }}>
          <span className="kp-chip">Anak usia 0–6 tahun</span>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', color: 'var(--lavender-d)', margin: '18px auto 14px', maxWidth: 760, lineHeight: 1.2 }}>
            Kelas Bermain & Game Edukasi Anak — Main Sambil Belajar
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2.4vw, 19px)', color: 'var(--tinta)', maxWidth: 680, margin: '0 auto 26px', lineHeight: 1.6 }}>
            KidzPlayful memadukan <b>kelas bermain (playgroup)</b> online &amp; offline dengan <b>game edukasi</b> ber-<b>screen time terkontrol</b> — melatih sensorik, motorik, kognitif, hingga berpikir komputasional (koding).
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="/daftar" className="kp-btn mint">Mulai Gratis 14 Hari ▶</a>
            <a href="/login" className="kp-btn putih">Masuk</a>
          </div>
          <p style={{ fontSize: 13, color: 'var(--abu)', marginTop: 16 }}>Gratis 14 hari · tanpa kartu · aman untuk anak</p>
        </section>

        {/* Fitur */}
        <section style={{ ...seksi, padding: '30px 20px' }}>
          <h2 style={{ textAlign: 'center', color: 'var(--lavender-d)', fontSize: 'clamp(22px, 4vw, 32px)', marginBottom: 24 }}>Kenapa KidzPlayful?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {FITUR.map((f) => (
              <div key={f.judul} className="kp-card">
                <div style={{ fontSize: 40 }}>{f.emo}</div>
                <h3 style={{ color: 'var(--lavender-d)', fontSize: 18, margin: '8px 0 6px' }}>{f.judul}</h3>
                <p style={{ fontSize: 14, color: 'var(--tinta)', lineHeight: 1.55 }}>{f.teks}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Untuk usia */}
        <section style={{ ...seksi, padding: '30px 20px' }}>
          <h2 style={{ textAlign: 'center', color: 'var(--lavender-d)', fontSize: 'clamp(22px, 4vw, 32px)', marginBottom: 24 }}>Sesuai Tahap Usia Anak</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {USIA.map((u) => (
              <div key={u.rentang} className="kp-card" style={{ borderTop: '4px solid var(--mint-d)' }}>
                <h3 style={{ color: 'var(--mint-d)', fontSize: 20, marginBottom: 6 }}>{u.rentang}</h3>
                <p style={{ fontSize: 14, color: 'var(--tinta)', lineHeight: 1.55 }}>{u.fokus}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ ...seksi, padding: '30px 20px', maxWidth: 760 }}>
          <h2 style={{ textAlign: 'center', color: 'var(--lavender-d)', fontSize: 'clamp(22px, 4vw, 32px)', marginBottom: 24 }}>Pertanyaan Umum</h2>
          {FAQ.map((f) => (
            <details key={f.t} className="kp-card" style={{ marginBottom: 12 }}>
              <summary style={{ fontWeight: 700, color: 'var(--lavender-d)', fontSize: 16, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                {f.t}<span>＋</span>
              </summary>
              <p style={{ fontSize: 14, color: 'var(--tinta)', lineHeight: 1.6, marginTop: 10 }}>{f.j}</p>
            </details>
          ))}
        </section>

        {/* CTA akhir */}
        <section style={{ ...seksi, textAlign: 'center', padding: '30px 20px 10px' }}>
          <div className="kp-card" style={{ background: 'linear-gradient(150deg,#e9dcff,#d4ecff)', padding: 32 }}>
            <h2 style={{ color: 'var(--lavender-d)', fontSize: 'clamp(22px, 4vw, 30px)', marginBottom: 10 }}>Siap menemani anak belajar sambil bermain?</h2>
            <p style={{ fontSize: 15, color: 'var(--tinta)', marginBottom: 20 }}>Coba semua fitur gratis 14 hari. Tanpa kartu kredit.</p>
            <a href="/daftar" className="kp-btn mint">Daftar Gratis Sekarang ▶</a>
          </div>
        </section>

        {/* Footer / NAP */}
        <footer style={{ ...seksi, textAlign: 'center', padding: '28px 20px', color: 'var(--abu)', fontSize: 13, lineHeight: 1.7 }}>
          <Logo height={32} />
          <p style={{ marginTop: 10 }}>
            {[PROFIL.alamat, PROFIL.kota, PROFIL.provinsi, PROFIL.kodePos].filter(Boolean).join(', ')}<br />
            Telp/WA: {PROFIL.telp}{PROFIL.email ? ` · ${PROFIL.email}` : ''}
          </p>
          <p style={{ marginTop: 8 }}>© {new Date().getFullYear()} {PROFIL.nama}. Kelas bermain &amp; game edukasi anak.</p>
        </footer>
      </main>
    </>
  );
}
