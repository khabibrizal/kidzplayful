// src/app/admin/layout.tsx
import { getAdminTerjamin } from '@/lib/data/admin';
import { getMenuSuperOnly } from '@/lib/data/pengaturan-menu';
import LogoutBtn from './LogoutBtn';
import AdminNav from './AdminNav';
import s from './admin.module.css';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminTerjamin();
  const superOnly = await getMenuSuperOnly();
  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <h1>🛠️ Admin KidzPlayful</h1>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={s.muted}>{admin.email}{admin.isSuperuser ? ' · Super User' : ''}</span>
          <LogoutBtn />
        </span>
      </div>
      <AdminNav superOnly={superOnly} isSuperuser={admin.isSuperuser} />
      {children}
    </div>
  );
}
