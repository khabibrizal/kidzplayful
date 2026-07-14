// src/lib/data/pengaturan-menu.ts — akses menu admin per role (diatur super user)
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_AKSES, type AksesMenu } from '@/lib/menu-admin';

export async function getMenuAkses(): Promise<AksesMenu> {
  try {
    const s = await createClient();
    const { data } = await s.from('pengaturan_menu').select('akses').eq('id', 1).single();
    const a = (data?.akses ?? {}) as Partial<AksesMenu>;
    return {
      admin: a.admin ?? DEFAULT_AKSES.admin,
      investor: a.investor ?? DEFAULT_AKSES.investor,
      guru: a.guru ?? DEFAULT_AKSES.guru,
    };
  } catch {
    return DEFAULT_AKSES;
  }
}
