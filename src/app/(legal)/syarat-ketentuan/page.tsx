// src/app/(legal)/syarat-ketentuan/page.tsx
import type { Metadata } from 'next';
import { PROFIL, WA_LINK, LEGAL_DIPERBARUI } from '@/lib/profil';
import * as g from '../gaya';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description: 'Syarat & Ketentuan penggunaan layanan KidzPlayful — langganan, pembayaran, Toko, event, dan konten komunitas.',
  alternates: { canonical: '/syarat-ketentuan' },
};

export default function SyaratKetentuan() {
  return (
    <article>
      <h1 style={g.h1}>Syarat &amp; Ketentuan</h1>
      <p style={g.meta}>Terakhir diperbarui: {LEGAL_DIPERBARUI}</p>

      <p style={g.p}>
        Dengan mendaftar dan menggunakan {PROFIL.nama} (&ldquo;layanan&rdquo;), Anda menyetujui syarat dan ketentuan berikut. Bila tidak setuju, mohon tidak menggunakan layanan.
      </p>

      <h2 style={g.h2}>1. Layanan & akun</h2>
      <ul style={g.ul}>
        <li>{PROFIL.nama} menyediakan kelas bermain dan game edukasi untuk anak usia 0–6 tahun.</li>
        <li>Akun ditujukan untuk orang tua/wali berusia dewasa (18+) yang mendaftarkan anaknya.</li>
        <li>Anda bertanggung jawab menjaga kerahasiaan kata sandi dan seluruh aktivitas pada akun Anda.</li>
      </ul>

      <h2 style={g.h2}>2. Masa coba & langganan</h2>
      <ul style={g.ul}>
        <li>Tersedia masa coba gratis (mis. 14 hari) tanpa kartu kredit.</li>
        <li>Setelah masa coba, akses penuh memerlukan langganan berbayar.</li>
        <li>Harga langganan dapat berubah sewaktu-waktu; perubahan berlaku untuk periode penagihan berikutnya.</li>
      </ul>

      <h2 style={g.h2}>3. Pembayaran</h2>
      <p style={g.p}>
        Pembayaran langganan, pesanan Toko, dan event dilakukan melalui <b>transfer manual</b> ke rekening yang tercantum, lalu dikonfirmasi. Aktivasi/pemrosesan dilakukan setelah pembayaran diverifikasi. Simpan bukti transfer Anda.
      </p>

      <h2 style={g.h2}>4. Toko</h2>
      <p style={g.p}>
        Produk dipesan melalui keranjang, dengan ongkos kirim yang dihitung admin sebelum pembayaran. Ketersediaan stok dapat berubah. Pesanan diproses dan dikirim setelah pembayaran diverifikasi.
      </p>

      <h2 style={g.h2}>5. Event kelas bermain</h2>
      <p style={g.p}>
        Pendaftaran event tunduk pada kuota dan pembayaran yang berlaku. Kebijakan penjadwalan ulang/pembatalan mengikuti ketentuan pada masing-masing event.
      </p>

      <h2 style={g.h2}>6. Konten komunitas</h2>
      <ul style={g.ul}>
        <li>Bersikaplah sopan. Dilarang mengunggah konten yang melanggar hukum, mengandung SARA, kekerasan, spam, atau data pribadi orang lain.</li>
        <li>Kami berhak memoderasi, menyembunyikan, atau menghapus konten yang melanggar tanpa pemberitahuan.</li>
      </ul>

      <h2 style={g.h2}>7. Kekayaan intelektual</h2>
      <p style={g.p}>
        Seluruh materi, game, dan konten dalam layanan adalah milik {PROFIL.nama} dan dilindungi hukum. Anda tidak boleh menyalin, menyebarkan, atau memperjualbelikan tanpa izin.
      </p>

      <h2 style={g.h2}>8. Batasan tanggung jawab</h2>
      <p style={g.p}>
        Layanan disediakan &ldquo;sebagaimana adanya&rdquo;. Sejauh diizinkan hukum, {PROFIL.nama} tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan layanan. Pendampingan orang tua tetap diperlukan selama anak menggunakan layanan.
      </p>

      <h2 style={g.h2}>9. Pengakhiran</h2>
      <p style={g.p}>
        Anda dapat berhenti menggunakan layanan kapan saja. Kami dapat menangguhkan atau menghentikan akun yang melanggar syarat ini.
      </p>

      <h2 style={g.h2}>10. Hukum yang berlaku</h2>
      <p style={g.p}>
        Syarat ini tunduk pada hukum yang berlaku di Republik Indonesia.
      </p>

      <h2 style={g.h2}>11. Hubungi kami</h2>
      <p style={g.p}>
        Pertanyaan seputar syarat ini? Hubungi kami via WhatsApp <a href={WA_LINK} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--biru-d)' }}>{PROFIL.waTampil}</a>.
      </p>
    </article>
  );
}
