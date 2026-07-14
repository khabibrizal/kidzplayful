// src/proxy.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { keyMenuDariPath, MENU_SUPER_DEFAULT, MENU_SUPER_TETAP } from '@/lib/menu-admin';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();

  // Menu admin yang KHUSUS super user: admin biasa yang membuka URL-nya → dialihkan ke /admin
  const path = request.nextUrl.pathname;
  if (user && path.startsWith('/admin')) {
    const key = keyMenuDariPath(path);
    if (key !== 'dashboard') {
      const { data: prof } = await supabase.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
      if (prof?.is_admin && !prof.is_superuser) {
        let terlarang = MENU_SUPER_TETAP.includes(key);
        if (!terlarang) {
          const { data: cfg } = await supabase.from('pengaturan_menu').select('super_only').eq('id', 1).maybeSingle();
          terlarang = (((cfg?.super_only as string[]) ?? MENU_SUPER_DEFAULT)).includes(key);
        }
        if (terlarang) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return response;
}

export const config = {
  // Kecualikan /api (pakai Bearer token, bukan cookie), aset statis & file gambar,
  // supaya request tersebut tidak membayar round-trip auth.getUser() di middleware.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
};
