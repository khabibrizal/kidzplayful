// src/app/admin/layout.tsx
import { getAdminTerjamin } from '@/lib/data/admin';
import LogoutBtn from './LogoutBtn';
import s from './admin.module.css';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminTerjamin();
  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <h1>🛠️ Admin KidzPlayful</h1>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={s.muted}>{admin.email}</span>
          <LogoutBtn />
        </span>
      </div>
      {children}
    </div>
  );
}
