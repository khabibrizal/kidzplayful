// GET /api/anak/[id]/catatan -> Catatan Perkembangan Bermain anak (dari event)
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { id } = await params;
  const { data } = await a.supabase.from('catatan_perkembangan')
    .select('id,event_id,anak_id,aspek,catatan,dinilai_oleh,created_at, event:event_id(judul)')
    .eq('anak_id', id).order('created_at', { ascending: false });
  const rows = (data ?? []).map((r) => ({
    ...r,
    event_judul: (Array.isArray(r.event) ? r.event[0]?.judul : (r.event as { judul?: string })?.judul) ?? null,
    event: undefined,
  }));
  return ok(rows);
}
