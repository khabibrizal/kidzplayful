// POST /api/auth/login  { email, password } -> { access_token, refresh_token, user }
import { anonClient, ok, fail } from '@/lib/api/helpers';

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try { body = await req.json(); } catch { return fail('Body JSON tidak valid'); }
  if (!body.email || !body.password) return fail('email & password wajib');
  const s = anonClient();
  const { data, error } = await s.auth.signInWithPassword({ email: body.email, password: body.password });
  if (error || !data.session) return fail('Email atau kata sandi salah', 401);
  return ok({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: { id: data.user?.id, email: data.user?.email },
  });
}
