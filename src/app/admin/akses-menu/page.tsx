// src/app/admin/akses-menu/page.tsx — Super User atur menu mana yang KHUSUS super user
import { getSuperuserTerjamin } from '@/lib/data/admin';
import { getMenuSuperOnly } from '@/lib/data/pengaturan-menu';
import { simpanMenuSuperOnly } from '@/lib/data/admin-bisnis';
import { MENU_ADMIN, MENU_SUPER_TETAP } from '@/lib/menu-admin';
import s from '../admin.module.css';

export default async function AksesMenuPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await getSuperuserTerjamin();
  const { ok } = await searchParams;
  const superOnly = await getMenuSuperOnly();
  const set = new Set(superOnly);

  // menu yang bisa dikonfigurasi (kecuali dashboard & akses-menu yang selalu super)
  const daftar = MENU_ADMIN.filter((m) => m.key !== 'dashboard' && !MENU_SUPER_TETAP.includes(m.key));

  async function simpan(formData: FormData) {
    'use server';
    const keys = daftar.map((m) => m.key).filter((k) => formData.get(`m_${k}`) === '1');
    await simpanMenuSuperOnly(keys);
    const { redirect } = await import('next/navigation');
    redirect('/admin/akses-menu?ok=1');
  }

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🔐 Akses Menu</h1></div>
      <p className={s.muted} style={{ fontSize: 13 }}>Centang menu yang <b>hanya boleh diakses Super User</b>. Menu yang dicentang akan disembunyikan dari Admin biasa dan diblokir bila URL-nya dibuka langsung. Super User selalu bisa akses semua.</p>
      {ok && <div className={s.card} style={{ background: '#dff5e6', color: '#1c7a43', fontWeight: 700 }}>Tersimpan ✓</div>}

      <form action={simpan} className={s.card}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
          {daftar.map((m) => (
            <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', fontSize: 14, borderBottom: '1px solid #f0f0f5' }}>
              <input type="checkbox" name={`m_${m.key}`} value="1" defaultChecked={set.has(m.key)} style={{ width: 18, height: 18 }} />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
        <p className={s.muted} style={{ fontSize: 12, marginTop: 8 }}>🔐 Akses Menu ini sendiri selalu khusus Super User.</p>
        <div style={{ marginTop: 12 }}><button className={s.btn} type="submit">💾 Simpan</button></div>
      </form>
    </div>
  );
}
