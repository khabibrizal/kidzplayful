// POST /api/events/[id]/daftar  { anak_ids:[], bukti_url? } -> daftar event (total dihitung server)
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { id: eventId } = await params;
  let b: { anak_ids?: string[]; bukti_url?: string | null };
  try { b = await req.json(); } catch { return fail('Body JSON tidak valid'); }
  const anakIds = b.anak_ids ?? [];
  if (!anakIds.length) return fail('Pilih minimal 1 anak (anak_ids)');

  const { data: ev } = await a.supabase.from('event').select('harga_per_anak,status').eq('id', eventId).maybeSingle();
  if (!ev || ev.status !== 'tampil') return fail('Event tidak tersedia', 404);
  const { data: anak } = await a.supabase.from('anak').select('id,nama').in('id', anakIds).eq('ortu_id', a.user.id);
  const valid = anak ?? [];
  if (!valid.length) return fail('Anak tidak valid');

  const total = (ev.harga_per_anak ?? 0) * valid.length;
  const { data, error } = await a.supabase.from('pendaftaran_event').insert({
    event_id: eventId, ortu_id: a.user.id,
    anak_ids: valid.map((x) => x.id), anak_nama: valid.map((x) => x.nama),
    jumlah_anak: valid.length, total, bukti_url: b.bukti_url ?? null,
  }).select('id,status,total').single();
  if (error) return fail(error.message);
  return ok(data, 201);
}
