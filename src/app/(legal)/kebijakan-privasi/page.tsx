// src/app/(legal)/kebijakan-privasi/page.tsx
import type { Metadata } from 'next';
import { PROFIL, WA_LINK, LEGAL_DIPERBARUI } from '@/lib/profil';
import * as g from '../gaya';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description: 'Kebijakan Privasi KidzPlayful — bagaimana kami mengumpulkan, menggunakan, dan melindungi data orang tua dan anak.',
  alternates: { canonical: '/kebijakan-privasi' },
};

export default function KebijakanPrivasi() {
  return (
    <article>
      <h1 style={g.h1}>Kebijakan Privasi</h1>
      <p style={g.meta}>Terakhir diperbarui: {LEGAL_DIPERBARUI}</p>

      <p style={g.p}>
        {PROFIL.nama} (&ldquo;kami&rdquo;) menghormati privasi Anda dan anak Anda. Kebijakan ini menjelaskan data apa yang kami kumpulkan, bagaimana penggunaannya, dan hak Anda. Layanan ini ditujukan untuk anak usia dini, dan seluruh akun dibuat serta dikelola oleh <b>orang tua atau wali</b>.
      </p>

      <h2 style={g.h2}>1. Data yang kami kumpulkan</h2>
      <ul style={g.ul}>
        <li><b>Akun orang tua:</b> alamat email, kata sandi (disimpan terenkripsi), nama tampilan, nomor WhatsApp, dan alamat pengiriman (bila menggunakan Toko).</li>
        <li><b>Data anak (diisi orang tua):</b> nama/nama panggilan, tanggal lahir, jenis kelamin, serta aktivitas belajar seperti hasil bermain, skor, dan durasi bermain untuk menyusun rapor perkembangan.</li>
        <li><b>Pembayaran:</b> bukti transfer yang Anda unggah. Pembayaran dilakukan melalui transfer manual — kami <b>tidak</b> menyimpan data kartu kredit/debit.</li>
        <li><b>Data teknis:</b> statistik penggunaan anonim (mis. melalui Vercel Web Analytics) untuk memperbaiki layanan.</li>
      </ul>

      <h2 style={g.h2}>2. Cara kami menggunakan data</h2>
      <ul style={g.ul}>
        <li>Menyediakan dan mengoperasikan layanan kelas bermain & game edukasi.</li>
        <li>Menyusun rapor perkembangan dan e-sertifikat anak.</li>
        <li>Memproses langganan, pesanan Toko, dan pendaftaran event.</li>
        <li>Mengirim komunikasi terkait layanan (mis. konfirmasi & pengingat).</li>
      </ul>

      <h2 style={g.h2}>3. Persetujuan orang tua</h2>
      <p style={g.p}>
        Akun dan profil anak dibuat oleh orang tua/wali. Anak tidak membuat akun sendiri dan tidak dapat melakukan pembelian. Dengan membuat profil anak, Anda menyatakan sebagai orang tua/wali yang sah dan menyetujui pengumpulan data sebagaimana kebijakan ini.
      </p>

      <h2 style={g.h2}>4. Penyimpanan & keamanan</h2>
      <p style={g.p}>
        Data disimpan pada infrastruktur pihak ketiga tepercaya (Supabase untuk basis data & autentikasi, Vercel untuk hosting) dengan kontrol akses berbasis baris (Row Level Security). Kami berupaya wajar melindungi data, namun tidak ada sistem yang sepenuhnya bebas risiko.
      </p>

      <h2 style={g.h2}>5. Berbagi data</h2>
      <p style={g.p}>
        Kami <b>tidak menjual</b> data pribadi Anda. Data hanya dibagikan kepada penyedia layanan yang membantu operasional (mis. hosting & basis data) sejauh diperlukan untuk menjalankan layanan, atau bila diwajibkan hukum.
      </p>

      <h2 style={g.h2}>6. Hak Anda</h2>
      <p style={g.p}>
        Anda berhak mengakses, memperbaiki, atau meminta penghapusan data akun dan data anak Anda. Untuk permintaan tersebut, hubungi kami melalui WhatsApp di bawah.
      </p>

      <h2 style={g.h2}>7. Cookie</h2>
      <p style={g.p}>
        Kami menggunakan cookie yang diperlukan untuk menjaga sesi login Anda tetap aktif. Kami tidak menggunakan cookie untuk iklan bertarget.
      </p>

      <h2 style={g.h2}>8. Perubahan kebijakan</h2>
      <p style={g.p}>
        Kebijakan ini dapat diperbarui sewaktu-waktu. Perubahan penting akan kami tampilkan di halaman ini beserta tanggal pembaruannya.
      </p>

      <h2 style={g.h2}>9. Hubungi kami</h2>
      <p style={g.p}>
        Pertanyaan tentang privasi? Hubungi kami via WhatsApp <a href={WA_LINK} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--biru-d)' }}>{PROFIL.waTampil}</a>.
      </p>
    </article>
  );
}
