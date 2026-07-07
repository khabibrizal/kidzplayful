// src/app/(legal)/tentang/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { PROFIL } from '@/lib/profil';
import * as g from '../gaya';

export const metadata: Metadata = {
  title: 'Tentang Kami',
  description: 'Tentang KidzPlayful — platform tumbuh kembang anak usia 0–6 tahun berbasis bermain: kurikulum mingguan, game edukasi, video, kelas bermain, dan komunitas orang tua.',
  alternates: { canonical: '/tentang' },
};

const h3 = { color: 'var(--lavender-d)', fontSize: 17, margin: '16px 0 4px', fontWeight: 800 } as const;

const FITUR = [
  { j: '📅 KidzPlayful Adventure', t: 'Event kelas bermain yang mempertemukan anak dan orang tua dalam pengalaman bermain langsung yang seru dan edukatif.' },
  { j: '🎈 Ide Bermain di Rumah', t: 'Petualangan bermain mingguan dengan tema berbeda setiap minggu yang bisa diterapkan di rumah. Setiap tema terdiri dari cerita, aktivitas, eksperimen, dan craft.' },
  { j: '🎮 Game Edukasi', t: 'Permainan edukatif yang dirancang untuk membantu perkembangan:', list: ['Motorik', 'Bahasa', 'Logika', 'Memori', 'Konsentrasi', 'Kreativitas'] },
  { j: '🎬 Video Pembelajaran', t: 'Video interaktif berbasis cerita yang mengajak anak belajar sambil berpetualang.' },
  { j: '🛍️ KidzPlayful Store', t: 'Berbagai perlengkapan bermain dan sensory kit yang mendukung aktivitas dalam aplikasi, sehingga orang tua dapat langsung mempraktikkannya di rumah.' },
  { j: '📈 Progress Tumbuh Kembang', t: 'Orang tua dapat melihat perjalanan belajar anak melalui:', list: ['Badge', 'Sertifikat', 'Aktivitas yang telah diselesaikan', 'Catatan perkembangan'] },
];

const NILAI = [
  { j: '🌱 Belajar Melalui Bermain', t: 'Bermain adalah fondasi utama proses belajar anak.' },
  { j: '❤️ Bertumbuh Bersama', t: 'Kami percaya tumbuh kembang anak adalah perjalanan yang dijalani bersama orang tua dan lingkungan.' },
  { j: '🎨 Kreativitas Tanpa Batas', t: 'Kami mendorong anak untuk bereksplorasi, mencoba, dan menemukan hal baru.' },
  { j: '🤝 Kolaborasi', t: 'Kami ingin menjadi partner bagi keluarga, guru, dan komunitas dalam mendukung tumbuh kembang anak.' },
  { j: '📈 Perkembangan yang Bermakna', t: 'Kami tidak mengejar kesempurnaan, tetapi perkembangan yang konsisten sesuai tahap usia anak.' },
];

export default function Tentang() {
  return (
    <article>
      <h1 style={g.h1}>Tentang {PROFIL.nama}</h1>
      <p style={{ fontSize: 'clamp(18px,3vw,22px)', fontWeight: 800, color: 'var(--mint-d)', margin: '2px 0 18px' }}>
        Bermain, Bertumbuh, Bersama.
      </p>

      <p style={g.p}>Di {PROFIL.nama}, kami percaya bahwa bermain adalah cara terbaik bagi anak untuk belajar.</p>
      <p style={g.p}>
        Melalui bermain, anak belajar mengenal dunia, mengembangkan kreativitas, melatih kemampuan berpikir, membangun rasa percaya diri, hingga mempererat hubungan dengan orang tua.
      </p>
      <p style={g.p}>
        Berangkat dari keyakinan tersebut, {PROFIL.nama} hadir sebagai platform digital tumbuh kembang anak usia 0–6 tahun yang menggabungkan aktivitas bermain, kurikulum mingguan, game edukasi, video pembelajaran, kelas bermain, dan komunitas orang tua dalam satu ekosistem.
      </p>
      <p style={g.p}>
        Kami ingin membantu setiap keluarga menghadirkan pengalaman bermain yang bermakna, kapan pun dan di mana pun.
      </p>

      <h2 style={g.h2}>Visi</h2>
      <p style={g.p}>
        Menjadi platform tumbuh kembang anak berbasis bermain yang menjadi partner terpercaya bagi setiap keluarga Indonesia.
      </p>

      <h2 style={g.h2}>Misi</h2>
      <ul style={g.ul}>
        <li>Membantu orang tua mendampingi proses belajar anak melalui aktivitas bermain yang menyenangkan.</li>
        <li>Menghadirkan kurikulum bermain yang terstruktur sesuai tahap perkembangan anak.</li>
        <li>Menghubungkan pengalaman bermain di rumah dan di kelas menjadi perjalanan belajar yang berkesinambungan.</li>
        <li>Membangun komunitas orang tua yang saling berbagi inspirasi dalam mendampingi tumbuh kembang anak.</li>
        <li>Mengembangkan ekosistem digital yang mendukung pembelajaran anak melalui teknologi.</li>
      </ul>

      <h2 style={g.h2}>Apa yang Ada di KidzPlayful?</h2>
      {FITUR.map((f) => (
        <div key={f.j}>
          <h3 style={h3}>{f.j}</h3>
          <p style={g.p}>{f.t}</p>
          {f.list && <ul style={g.ul}>{f.list.map((x) => <li key={x}>{x}</li>)}</ul>}
        </div>
      ))}

      <h3 style={h3}>👨‍👩‍👧 Komunitas KidzPlayful ⭐</h3>
      <p style={g.p}>Karena kami percaya bahwa membesarkan anak bukanlah perjalanan yang harus dijalani sendirian.</p>
      <p style={g.p}>Komunitas KidzPlayful menjadi ruang bagi orang tua untuk:</p>
      <ul style={g.ul}>
        <li>💬 Berdiskusi tentang tumbuh kembang anak.</li>
        <li>💡 Berbagi ide aktivitas bermain di rumah.</li>
        <li>🎉 Mendapat informasi event terbaru.</li>
        <li>🤝 Saling memberikan dukungan dan inspirasi.</li>
        <li>👩‍🏫 Berinteraksi dengan fasilitator.</li>
      </ul>
      <p style={g.p}>Kami ingin membangun komunitas yang positif, hangat, dan saling mendukung dalam perjalanan setiap keluarga.</p>

      <h2 style={g.h2}>Filosofi Kami</h2>
      <p style={g.p}>Kami percaya bahwa setiap anak memiliki cara belajar yang unik.</p>
      <p style={g.p}>
        Karena itu, kami tidak menempatkan anak sebagai penerima materi, tetapi sebagai <b>penjelajah</b> yang belajar melalui rasa ingin tahu, pengalaman, dan bermain.
      </p>
      <p style={g.p}>Di {PROFIL.nama}, setiap aktivitas dirancang untuk membangun:</p>
      <ul style={g.ul}>
        <li>Kreativitas</li>
        <li>Kemandirian</li>
        <li>Kemampuan berpikir</li>
        <li>Kepercayaan diri</li>
        <li>Keterampilan sosial</li>
        <li>Hubungan yang hangat antara anak dan orang tua</li>
      </ul>

      <h2 style={g.h2}>Nilai-Nilai KidzPlayful</h2>
      {NILAI.map((n) => (
        <div key={n.j}>
          <h3 style={h3}>{n.j}</h3>
          <p style={g.p}>{n.t}</p>
        </div>
      ))}

      <h2 style={g.h2}>Penutup</h2>
      <p style={g.p}>KidzPlayful bukan sekadar aplikasi.</p>
      <p style={g.p}>
        KidzPlayful adalah ruang tempat anak bermain, belajar, dan bertumbuh; tempat orang tua menemukan inspirasi untuk mendampingi anak setiap hari; dan tempat keluarga menciptakan momen-momen berharga yang akan dikenang sepanjang masa.
      </p>
      <p style={{ ...g.p, fontWeight: 700, color: 'var(--lavender-d)' }}>
        Karena bagi kami, bermain bukan hanya tentang mengisi waktu — bermain adalah fondasi masa depan anak.
      </p>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link href="/daftar" className="kp-btn mint">Coba Gratis 14 Hari ▶</Link>
      </div>
    </article>
  );
}
