// src/proxy.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { keyMenuDariPath, menuUntukRole, DEFAULT_AKSES, type AksesMenu } from '@/lib/menu-admin';

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

  // Akses menu admin per role: user tanpa izin untuk suatu menu → dialihkan
  const path = request.nextUrl.pathname;
  if (user && path.startsWith('/admin')) {
    const { data: prof } = await supabase.from('profiles').select('is_admin,is_superuser,is_investor,is_guru').eq('id', user.id).single();
    if (!prof?.is_superuser) {
      const { data: cfg } = await supabase.from('pengaturan_menu').select('akses').eq('id', 1).maybeSingle();
      const a = (cfg?.akses ?? {}) as Partial<AksesMenu>;
      const akses: AksesMenu = { admin: a.admin ?? DEFAULT_AKSES.admin, investor: a.investor ?? DEFAULT_AKSES.investor, guru: a.guru ?? DEFAULT_AKSES.guru };
      const allowed = menuUntukRole(akses, { is_admin: prof?.is_admin, is_investor: prof?.is_investor, is_guru: prof?.is_guru });
      const key = keyMenuDariPath(path);
      // tak punya akses panel sama sekali → biar layout arahkan (/pilih-anak); menu spesifik tak diizinkan → /admin
      if (allowed.size > 0 && key !== 'dashboard' && !allowed.has(key)) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
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
