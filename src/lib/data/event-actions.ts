// src/lib/data/event-actions.ts — pendaftaran event oleh ortu
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStatusLangganan } from './langganan-status';
import { hargaEventUntuk } from '@/lib/domain/harga';
import { formatTanggal } from '@/lib/format';

function jadwalTeks(tgl: string | null, jm: string | null, js: string | null): string | null {
  const t = tgl ? formatTanggal(tgl) : '';
  const jam = jm || js ? `${jm ?? ''}${js ? `-${js}` : ''} WIB` : '';
  const gab = [t, jam].filter(Boolean).join(' · ');
  return gab || null;
}

// Mengembalikan {ok,error} (bukan throw) agar pesan validasi tampil jelas di production.
export async function daftarEvent(eventId: string, anakIds: string[], buktiUrl: string | null, kelas: string | null = null, jumlahPendamping: number = 0): Promise<{ ok: boolean; error?: string }> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { ok: false, error: 'Tidak terautentikasi' };
  if (!anakIds.length) return { ok: false, error: 'Pilih minimal 1 anak dulu — pendamping tidak bisa didaftarkan tanpa anak.' };

  const { data: ev } = await s.from('event')
    .select('harga_per_anak,harga_pendamping,diskon_langganan_persen,status,tanggal,jam_mulai,jam_selesai,baby_tanggal,baby_jam_mulai,baby_jam_selesai,toddler_tanggal,toddler_jam_mulai,toddler_jam_selesai')
    .eq('id', eventId).maybeSingle();
  if (!ev || ev.status !== 'tampil') return { ok: false, error: 'Event tidak tersedia.' };

  // Tentukan kelas terpilih + snapshot jadwal
  const adaBaby = !!(ev.baby_jam_mulai || ev.baby_tanggal);
  const adaToddler = !!(ev.toddler_jam_mulai || ev.toddler_tanggal);
  let kelasFinal: string;
  let kelasJadwal: string | null;
  if (adaBaby || adaToddler) {
    if (kelas === 'baby' && adaBaby) kelasJadwal = jadwalTeks(ev.baby_tanggal ?? ev.tanggal, ev.baby_jam_mulai, ev.baby_jam_selesai);
    else if (kelas === 'toddler' && adaToddler) kelasJadwal = jadwalTeks(ev.toddler_tanggal ?? ev.tanggal, ev.toddler_jam_mulai, ev.toddler_jam_selesai);
    else return { ok: false, error: 'Pilih kelas yang tersedia (Baby/Toddler) dulu.' };
    kelasFinal = kelas;
  } else {
    kelasFinal = 'gabungan';
    kelasJadwal = jadwalTeks(ev.tanggal, ev.jam_mulai, ev.jam_selesai);
  }

  // hanya anak milik ortu yang valid
  const { data: anak } = await s.from('anak').select('id,nama').in('id', anakIds).eq('ortu_id', user.id);
  const valid = anak ?? [];
  if (!valid.length) return { ok: false, error: 'Anak tidak valid.' };

  // cegah daftar ganda: buang anak yang sudah terdaftar (menunggu/diterima) di event ini
  const { data: pend } = await s.from('pendaftaran_event').select('anak_ids,status').eq('ortu_id', user.id).eq('event_id', eventId);
  const sudah = new Set<string>();
  for (const r of pend ?? []) if (r.status !== 'ditolak') for (const x of (r.anak_ids as string[]) ?? []) sudah.add(x);
  const baru = valid.filter((a) => !sudah.has(a.id));
  if (!baru.length) return { ok: false, error: 'Semua anak yang dipilih sudah terdaftar di event ini.' };

  const status = await getStatusLangganan(s, user.id);
  const nPendamping = Math.max(0, Math.floor(jumlahPendamping || 0));
  const total = hargaEventUntuk({ harga_per_anak: ev.harga_per_anak ?? 0, diskon_langganan_persen: ev.diskon_langganan_persen ?? null }, status) * baru.length
    + nPendamping * (ev.harga_pendamping ?? 0);
  const { error } = await s.from('pendaftaran_event').insert({
    event_id: eventId,
    ortu_id: user.id,
    anak_ids: baru.map((a) => a.id),
    anak_nama: baru.map((a) => a.nama),
    jumlah_anak: baru.length,
    jumlah_pendamping: nPendamping,
    total,
    bukti_url: buktiUrl,
    kelas: kelasFinal,
    kelas_jadwal: kelasJadwal,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/event');
  revalidatePath('/pilih-anak');
  return { ok: true };
}
