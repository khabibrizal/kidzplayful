// POST /api/auth/refresh  { refresh_token } -> { access_token, refresh_token }
import { anonClient, ok, fail } from '@/lib/api/helpers';

export async function POST(req: Request) {
  let body: { refresh_token?: string };
  try { body = await req.json(); } catch { return fail('Body JSON tidak valid'); }
  if (!body.refresh_token) return fail('refresh_token wajib');
  const s = anonClient();
  const { data, error } = await s.auth.refreshSession({ refresh_token: body.refresh_token });
  if (error || !data.session) return fail('refresh_token tidak valid', 401);
  return ok({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  });
}
