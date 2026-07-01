// POST /api/auth/register  { email, password, nama, no_wa } -> { user, session? }
import { anonClient, ok, fail } from '@/lib/api/helpers';

export async function POST(req: Request) {
  let body: { email?: string; password?: string; nama?: string; no_wa?: string };
  try { body = await req.json(); } catch { return fail('Body JSON tidak valid'); }
  if (!body.email || !body.password) return fail('email & password wajib');
  const s = anonClient();
  const { data, error } = await s.auth.signUp({ email: body.email, password: body.password });
  if (error) return fail(error.message);
  // simpan nama & no WA ke profil (profil dibuat trigger). Butuh sesi (Confirm email OFF).
  if (data.session) {
    const authed = anonClient();
    await authed.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
    if (data.user) await authed.from('profiles').update({ nama_tampilan: body.nama?.trim() || null, no_wa: body.no_wa?.trim() || null }).eq('id', data.user.id);
  }
  return ok({
    user: { id: data.user?.id, email: data.user?.email },
    access_token: data.session?.access_token ?? null,
    refresh_token: data.session?.refresh_token ?? null,
    perlu_konfirmasi_email: !data.session,
  }, 201);
}
