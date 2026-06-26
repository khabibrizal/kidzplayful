// src/app/admin/kelas-bermain/page.tsx
import Link from 'next/link';
import { getKelasSemua } from '@/lib/data/kelas-bermain';
import KelasAdmin from './KelasAdmin';
import s from '../admin.module.css';

export default async function AdminKelasBermain() {
  const list = await getKelasSemua();
  return (
    <div>
      <Link href="/admin" className={s.muted}>← dashboard</Link>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🎈 Kelas Bermain</h1></div>
      <KelasAdmin awal={list} />
    </div>
  );
}
