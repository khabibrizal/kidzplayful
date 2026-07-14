// src/app/admin/users/page.tsx — kelola user & role (admin/super user)
import { getPengelolaUserTerjamin, getDaftarUser } from '@/lib/data/admin-users';
import { setRole, tambahUserRole } from '@/lib/data/admin-users-actions';
import BuatUserForm from './BuatUserForm';
import s from '../admin.module.css';

const ROLES = [
  { key: 'superuser', label: 'Super User', kolom: 'is_superuser' as const, warna: '#7c3aed', hanyaSuper: true },
  { key: 'admin', label: 'Admin', kolom: 'is_admin' as const, warna: '#2563eb', hanyaSuper: true },
  { key: 'guru', label: 'Guru', kolom: 'is_guru' as const, warna: '#e67e22', hanyaSuper: false },
  { key: 'investor', label: 'Investor', kolom: 'is_investor' as const, warna: '#1c9c6b', hanyaSuper: false },
];

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ isSuperuser }, sp] = await Promise.all([getPengelolaUserTerjamin(), searchParams]);
  const q = sp.q ?? '';
  const users = await getDaftarUser(q);

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>👤 Pengguna & Role</h1></div>
      <p className={s.muted} style={{ fontSize: 13 }}>
        Tetapkan role untuk akun yang <b>sudah terdaftar</b>. {isSuperuser ? 'Anda Super User — dapat mengatur semua role.' : 'Anda Admin — dapat mengatur Guru & Investor.'}
      </p>

      {/* Buat user baru langsung + role */}
      <div className={s.section}>Buat user baru</div>
      <BuatUserForm roles={ROLES.filter((r) => isSuperuser || !r.hanyaSuper).map((r) => ({ key: r.key, label: r.label }))} />

      {/* Tambah role by email */}
      <div className={s.section}>Tetapkan role (akun sudah ada)</div>
      <form action={tambahUserRole} className={s.card}>
        <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
          <input className={s.inp} name="email" type="email" placeholder="Email user terdaftar" style={{ flex: 2, minWidth: 180 }} required />
          <select className={s.inp} name="role" style={{ flex: 1, minWidth: 130 }} required>
            {ROLES.filter((r) => isSuperuser || !r.hanyaSuper).map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <button className={s.btn} type="submit">+ Tetapkan</button>
        </div>
        <p className={s.muted} style={{ fontSize: 12, marginTop: 6 }}>User baru harus mendaftar sendiri lebih dulu (halaman Daftar). Setelah terdaftar, tetapkan role-nya di sini.</p>
      </form>

      {/* Cari */}
      <form method="get" className={s.card} style={{ display: 'flex', gap: 6 }}>
        <input className={s.inp} name="q" defaultValue={q} placeholder="Cari email…" style={{ flex: 1, marginBottom: 0 }} />
        <button className={s.btnSm} style={{ background: 'var(--lavender-d)', color: '#fff' }}>Cari</button>
      </form>

      {/* Daftar user berrole */}
      <div className={s.section}>User dengan role ({users.length})</div>
      {users.length === 0 && <p className={s.muted}>Belum ada user berrole{q ? ' untuk pencarian ini' : ''}.</p>}
      {users.map((u) => (
        <div key={u.id} className={s.card}>
          <div style={{ marginBottom: 8 }}>
            <b>{u.nama_tampilan?.trim() || u.email}</b>
            {u.nama_tampilan && <><br /><small className={s.muted}>{u.email}</small></>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ROLES.map((r) => {
              const aktif = (u as unknown as Record<string, boolean>)[r.kolom];
              const boleh = isSuperuser || !r.hanyaSuper; // admin tak bisa atur role tinggi
              const next = aktif ? '0' : '1';
              const isi = (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
                  padding: '5px 12px', borderRadius: 999,
                  background: aktif ? r.warna : '#f0f0f5', color: aktif ? '#fff' : '#999',
                  border: 'none', cursor: boleh ? 'pointer' : 'default', fontFamily: 'inherit',
                  opacity: boleh ? 1 : 0.7,
                }}>
                  {aktif ? '✓ ' : ''}{r.label}
                </span>
              );
              return boleh ? (
                <form key={r.key} action={setRole}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="role" value={r.key} />
                  <input type="hidden" name="value" value={next} />
                  <button type="submit" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} title={aktif ? `Cabut ${r.label}` : `Jadikan ${r.label}`}>{isi}</button>
                </form>
              ) : (
                <span key={r.key} title="Hanya Super User yang dapat mengatur ini">{isi}</span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
