// src/lib/data/admin-event-actions.ts — CRUD event + ubah status pendaftaran (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { EventKelas, BarisParam } from '@/lib/game/tipe';
import { catatLedger, hapusLedgerRef } from './ledger';

export interface EventInput {
  judul: string;
  lokasi: string;
  tanggal: string;     // 'YYYY-MM-DD' atau ''
  jamMulai: string;
  jamSelesai: string;
  deskripsi: string;
  gambarUrl: string | null;
  hargaPerAnak: number;
  diskonLanggananPersen: number; // % diskon untuk pelanggan aktif (0 = tanpa diskon)
}
const COLS = 'id,judul,lokasi,tanggal,jam_mulai,jam_selesai,deskripsi,gambar_url,harga_per_anak,diskon_langganan_persen,status,sertifikat_bg_url,dokumentasi_url,stiker_bg_url';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return s;
}

/** Tetapkan parameter penilaian tumbuh kembang (area+indikator) untuk sebuah event. */
export async function simpanParameterPerkembangan(eventId: string, params: BarisParam[]): Promise<void> {
  const s = await adminDb();
  const bersih = (params ?? [])
    .map((p) => ({ area: (p.area ?? '').trim(), indikator: (p.indikator ?? '').trim() }))
    .filter((p) => p.area || p.indikator);
  const { error } = await s.from('event').update({ indikator_perkembangan: bersih }).eq('id', eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/event/${eventId}/pendaftar`);
  revalidatePath(`/guru/${eventId}`);
}

/** Duplikat parameter penilaian dari event lain ke event ini. */
export async function duplikatParameterPerkembangan(eventId: string, dariEventId: string): Promise<void> {
  const s = await adminDb();
  const { data: sumber } = await s.from('event').select('indikator_perkembangan').eq('id', dariEventId).maybeSingle();
  const params = (sumber?.indikator_perkembangan ?? []) as BarisParam[];
  const { error } = await s.from('event').update({ indikator_perkembangan: params }).eq('id', eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/event/${eventId}/pendaftar`);
  revalidatePath(`/guru/${eventId}`);
}

function row(i: EventInput) {
  return {
    judul: i.judul.trim() || 'Tanpa judul',
    lokasi: i.lokasi.trim() || null,
    tanggal: i.tanggal || null,
    jam_mulai: i.jamMulai.trim() || null,
    jam_selesai: i.jamSelesai.trim() || null,
    deskripsi: i.deskripsi.trim() || null,
    gambar_url: i.gambarUrl?.trim() || null,
    harga_per_anak: Math.max(0, Math.floor(Number(i.hargaPerAnak) || 0)),
    diskon_langganan_persen: (() => { const n = Math.min(100, Math.max(0, Math.floor(Number(i.diskonLanggananPersen) || 0))); return n > 0 ? n : null; })(),
  };
}

export async function buatEvent(i: EventInput): Promise<EventKelas> {
  const s = await adminDb();
  if (!i.judul.trim()) throw new Error('Judul wajib diisi.');
  const { data, error } = await s.from('event').insert(row(i)).select(COLS).single();
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak'); revalidatePath('/event');
  return data as unknown as EventKelas;
}
export async function updateEvent(id: string, i: EventInput): Promise<EventKelas> {
  const s = await adminDb();
  const { data, error } = await s.from('event').update(row(i)).eq('id', id).select(COLS).single();
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak'); revalidatePath('/event');
  return data as unknown as EventKelas;
}
export async function toggleStatusEvent(id: string, statusBaru: 'tampil' | 'arsip'): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('event').update({ status: statusBaru }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak'); revalidatePath('/event');
}
export async function hapusEvent(id: string): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('event').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak'); revalidatePath('/event');
}

export async function setStatusPendaftaran(id: string, statusBaru: 'menunggu' | 'diterima' | 'ditolak'): Promise<void> {
  const s = await adminDb();
  if (statusBaru === 'diterima') {
    const { data: p } = await s.from('pendaftaran_event').select('total').eq('id', id).single();
    const { error } = await s.from('pendaftaran_event').update({ status: 'diterima', diverifikasi_pada: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(error.message);
    await catatLedger(s, { arah: 'masuk', kategori: 'event', jumlah: p?.total ?? 0, ref_tipe: 'pendaftaran', ref_id: id, keterangan: 'Pendaftaran event', metode: 'transfer' });
  } else {
    const { error } = await s.from('pendaftaran_event').update({ status: statusBaru }).eq('id', id);
    if (error) throw new Error(error.message);
    if (statusBaru === 'ditolak') await hapusLedgerRef(s, 'pendaftaran', id); // batalkan pemasukan bila sudah tercatat
  }
}

/** Absensi: tandai satu anak HADIR / tidak pada sebuah pendaftaran. Kembalikan daftar anak hadir terbaru. */
export async function setKehadiran(pendaftaranId: string, anakId: string, hadir: boolean): Promise<string[]> {
  const s = await adminDb();
  const { data: p, error: e1 } = await s.from('pendaftaran_event').select('hadir_anak_ids,status').eq('id', pendaftaranId).single();
  if (e1) throw new Error(e1.message);
  if (p.status !== 'diterima') throw new Error('Terima pendaftaran dulu sebelum absensi.');
  const set = new Set<string>((p.hadir_anak_ids as string[]) ?? []);
  if (hadir) set.add(anakId); else set.delete(anakId);
  const baru = [...set];
  const { error: e2 } = await s.from('pendaftaran_event').update({ hadir_anak_ids: baru }).eq('id', pendaftaranId);
  if (e2) throw new Error(e2.message);
  return baru;
}

/**
 * Reschedule: pindahkan sebuah pendaftaran ke event AKTIF lain (mis. anak sakit H-1
 * → ikut kelas bermain berikutnya). Pembayaran/bukti/status ikut terbawa; absensi direset.
 */
export async function reschedulePendaftaran(pendaftaranId: string, eventBaruId: string, alasan: string): Promise<void> {
  const s = await adminDb();
  const alsn = alasan.trim();
  if (!alsn) throw new Error('Alasan reschedule wajib diisi.');

  const { data: p } = await s.from('pendaftaran_event').select('event_id').eq('id', pendaftaranId).single();
  if (!p) throw new Error('Pendaftaran tidak ditemukan.');
  if (p.event_id === eventBaruId) throw new Error('Pilih event yang berbeda.');

  const { data: ev } = await s.from('event').select('id,status').eq('id', eventBaruId).maybeSingle();
  if (!ev || ev.status !== 'tampil') throw new Error('Event tujuan tidak aktif.');

  const { error } = await s.from('pendaftaran_event')
    .update({ event_id: eventBaruId, event_asal_id: p.event_id, alasan_reschedule: alsn, hadir_anak_ids: [] })
    .eq('id', pendaftaranId);
  if (error) throw new Error(error.message);
  revalidatePath('/event'); revalidatePath('/pilih-anak');
}

/** Simpan template sertifikat (JPEG) &/atau link dokumentasi pada sebuah event. */
export async function simpanBerkasSertifikat(
  eventId: string,
  patch: { sertifikatBgUrl?: string | null; dokumentasiUrl?: string | null; stikerBgUrl?: string | null },
): Promise<void> {
  const s = await adminDb();
  const upd: Record<string, string | null> = {};
  if ('sertifikatBgUrl' in patch) upd.sertifikat_bg_url = patch.sertifikatBgUrl?.trim() || null;
  if ('dokumentasiUrl' in patch) upd.dokumentasi_url = patch.dokumentasiUrl?.trim() || null;
  if ('stikerBgUrl' in patch) upd.stiker_bg_url = patch.stikerBgUrl?.trim() || null;
  if (Object.keys(upd).length === 0) return;
  const { error } = await s.from('event').update(upd).eq('id', eventId);
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak'); revalidatePath('/event');
}
