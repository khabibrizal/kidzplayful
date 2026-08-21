// src/app/admin/psikolog/page.tsx
import { getDaftarPsikolog } from '@/lib/data/admin-psikolog';
import { getProfilPsikologMap } from '@/lib/data/psikolog-profil';
import PsikologAdmin from './PsikologAdmin';
import VerifikasiKonsultasi from './VerifikasiKonsultasi';
import { getKonsultasiMenungguBayar } from '@/lib/data/konsultasi-bayar';
import s from '../admin.module.css';

export default async function AdminPsikologPage() {
  const [psikolog, profil, menungguBayar] = await Promise.all([
    getDaftarPsikolog(), getProfilPsikologMap(), getKonsultasiMenungguBayar(),
  ]);
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🧠 Kelola Psikolog</h1></div>
      <p className={s.muted} style={{ marginBottom: 10 }}>
        Psikolog harus <b>daftar dulu</b> di halaman Daftar, lalu aktifkan di sini dengan emailnya. Setelah aktif, ia bisa mengatur jadwal &amp; menjawab konsultasi di area Psikolog.
        <br />Isi <b>profil</b> tiap psikolog (nama, foto, pendidikan, STR, pengalaman) — data itu yang tampil di kartu halaman Konsultasi customer.
      </p>
      <VerifikasiKonsultasi daftar={menungguBayar} />

      <PsikologAdmin awal={psikolog} profil={profil} />
    </div>
  );
}
