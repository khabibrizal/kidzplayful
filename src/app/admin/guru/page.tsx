// src/app/admin/guru/page.tsx
import Link from 'next/link';
import { getDaftarGuru } from '@/lib/data/admin-guru';
import GuruAdmin from './GuruAdmin';
import s from '../admin.module.css';

export default async function AdminGuruPage() {
  const guru = await getDaftarGuru();
  return (
    <div>
      <Link href="/admin" className={s.muted}>← dashboard</Link>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🍎 Kelola Guru</h1></div>
      <p className={s.muted} style={{ marginBottom: 10 }}>Guru harus <b>daftar dulu</b> di halaman Daftar, lalu aktifkan di sini dengan emailnya.</p>
      <GuruAdmin awal={guru} />
    </div>
  );
}
