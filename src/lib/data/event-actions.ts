// src/lib/data/event-actions.ts — pendaftaran event oleh ortu
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStatusLangganan } from './langganan-status';
import { getKuotaTerpakai } from './event';
import { bacaKuotaEvent, kuotaUntukKelas } from './kuota-event';
import { hargaEventUntuk } from '@/lib/domain/harga';
import { nilaiVoucherById } from './voucher';
import { jadwalTeks } from '@/lib/domain/jadwal';

// Mengembalikan {ok,error} (bukan throw) agar pesan validasi tampil jelas di production.
export async function daftarEvent(eventId: string, anakIds: string[], buktiUrl: string | null, kelas: string | null = null, jumlahPendamping: number = 0, voucherId: string | null = null): Promise<{ ok: boolean; error?: string }> {
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

  // Kuota per kelas (jumlah ANAK; pendaftaran 'ditolak' tidak dihitung). null/0 = tanpa batas.
  const kuotaKelas = kuotaUntukKelas(await bacaKuotaEvent(s, eventId), kelasFinal);
  if (kuotaKelas != null && kuotaKelas > 0) {
    const terpakai = await getKuotaTerpakai(eventId);
    const sisa = Math.max(0, kuotaKelas - (terpakai[kelasFinal] ?? 0));
    if (sisa <= 0) return { ok: false, error: 'Mohon maaf, kuota sudah penuh. Terima kasih 🙏' };
    // Jumlah sisa SENGAJA tidak disebut - halaman pendaftaran orang tua tidak menampilkan
    // sisa kuota (permintaan pemilik), jadi pesan ini pun tidak boleh membocorkannya.
    if (baru.length > sisa) return { ok: false, error: 'Mohon maaf, kuota yang tersisa tidak cukup untuk jumlah anak yang dipilih. Kurangi jumlah anaknya ya 🙏' };
  }

  const status = await getStatusLangganan(s, user.id);
  const nPendamping = Math.max(0, Math.floor(jumlahPendamping || 0));
  const subtotal = hargaEventUntuk({ harga_per_anak: ev.harga_per_anak ?? 0, diskon_langganan_persen: ev.diskon_langganan_persen ?? null }, status) * baru.length
    + nPendamping * (ev.harga_pendamping ?? 0);
  let potonganVoucher = 0; let vId: string | null = null;
  if (voucherId) {
    const rv = await nilaiVoucherById(s, voucherId, 'event', subtotal, user.id);
    if (!rv.ok) return { ok: false, error: rv.error };
    potonganVoucher = rv.potongan ?? 0; vId = voucherId;
  }
  const total = Math.max(0, subtotal - potonganVoucher);

  // Bukti bayar WAJIB bila memang ada yang harus dibayar. Sebelumnya pemeriksaan ini
  // hanya ada di KLIEN (`DaftarForm`), jadi memanggil server action ini langsung —
  // atau dari klien yang state-nya berbeda — menghasilkan pendaftaran berbayar
  // "tanpa bukti" yang tak bisa diverifikasi admin.
  // Patokannya `total`, bukan `harga_per_anak`: bila diskon member atau voucher membuat
  // tagihannya nol, memang tidak ada yang perlu dibuktikan.
  if (total > 0 && !buktiUrl?.trim()) return { ok: false, error: 'Unggah bukti pembayaran dulu ya.' };

  const barisPendaftaran = {
    event_id: eventId,
    ortu_id: user.id,
    anak_ids: baru.map((a) => a.id),
    anak_nama: baru.map((a) => a.nama),
    jumlah_anak: baru.length,
    jumlah_pendamping: nPendamping,
    total,
    voucher_id: vId,
    potongan_voucher: potonganVoucher,
    bukti_url: buktiUrl,
    kelas: kelasFinal,
    kelas_jadwal: kelasJadwal,
  };
  if (vId) {
    // butuh id pendaftaran untuk catat voucher_redeem
    const { data: baruRow, error } = await s.from('pendaftaran_event').insert(barisPendaftaran).select('id').single();
    if (error) return { ok: false, error: error.message };
    if (baruRow) await s.from('voucher_redeem').insert({ voucher_id: vId, ortu_id: user.id, ref_tipe: 'pendaftaran', ref_id: baruRow.id, potongan: potonganVoucher });
  } else {
    // jalur tanpa voucher: insert polos (perilaku lama yang terbukti jalan)
    const { error } = await s.from('pendaftaran_event').insert(barisPendaftaran);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/event');
  revalidatePath('/pilih-anak');
  return { ok: true };
}
