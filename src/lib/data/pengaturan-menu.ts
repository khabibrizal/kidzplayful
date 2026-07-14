// src/lib/data/pengaturan-menu.ts — daftar key menu admin yang khusus super user
import { createClient } from '@/lib/supabase/server';
import { MENU_SUPER_DEFAULT } from '@/lib/menu-admin';

export async function getMenuSuperOnly(): Promise<string[]> {
  try {
    const s = await createClient();
    const { data } = await s.from('pengaturan_menu').select('super_only').eq('id', 1).single();
    if (!data?.super_only) return MENU_SUPER_DEFAULT;
    return data.super_only as string[];
  } catch {
    return MENU_SUPER_DEFAULT;
  }
}
