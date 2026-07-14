// src/app/admin/users/BuatUserForm.tsx — form buat user baru (tampilkan error inline)
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buatUser } from '@/lib/data/admin-users-actions';
import s from '../admin.module.css';

type RoleOpsi = { key: string; label: string };

export default function BuatUserForm({ roles }: { roles: RoleOpsi[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(''); setOk(false);
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      try {
        const r = await buatUser(fd);
        if (r.ok) { setOk(true); setMsg('User berhasil dibuat ✓'); form.reset(); router.refresh(); }
        else { setOk(false); setMsg(r.error ?? 'Gagal membuat user.'); }
      } catch (err) {
        setOk(false);
        setMsg(err instanceof Error ? err.message : 'Gagal membuat user.');
      }
    });
  }

  return (
    <form onSubmit={submit} className={s.card}>
      <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
        <input className={s.inp} name="nama" placeholder="Nama tampilan" style={{ flex: 1, minWidth: 140 }} />
        <input className={s.inp} name="email" type="email" placeholder="Email" style={{ flex: 1, minWidth: 160 }} required />
      </div>
      <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        <input className={s.inp} name="password" type="text" placeholder="Kata sandi (min 6)" style={{ flex: 1, minWidth: 140 }} required />
        <select className={s.inp} name="role" style={{ flex: 1, minWidth: 130 }} defaultValue="">
          <option value="">— Tanpa role (user biasa) —</option>
          {roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <button className={s.btn} type="submit" disabled={pending}>{pending ? 'Membuat…' : '+ Buat User'}</button>
      </div>
      {msg && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: ok ? '#1c7a43' : '#c0392b' }}>{msg}</div>}
      <p className={s.muted} style={{ fontSize: 12, marginTop: 6 }}>Akun langsung aktif (tanpa konfirmasi email). Butuh <code>SUPABASE_SERVICE_ROLE_KEY</code> terpasang di server.</p>
    </form>
  );
}
