// src/lib/data/konsultasi-tarif.ts — bahan PRATINJAU biaya sesi konsultasi.
//
// Dipakai form booking supaya orang tua melihat biayanya (dan potongan vouchernya)
// SEBELUM menekan Daftar. Angka yang mengikat tetap dihitung RPC `daftar_konsultasi`;
// ini pratinjau, dan sengaja memakai sumber yang sama dengan RPC itu.
import { createClient } from '@/lib/supabase/server';
import { getPengaturanBayar } from './pengaturan-bayar';
import { getKuotaAnakSaya } from './kuota-anak';

export interface TarifPsikolog { harga: number; diskonPersen: number }
export interface KuotaAnak {
  /** anak ini punya langganan yang periodenya masih berjalan (aturan yang sama dengan RPC) */
  member: boolean;
  /** sisa kuota konsultasi gratis dari paketnya (0 = habis / tak punya) */
  sisaKuota: number;
  paketNama: string | null;
}

export interface PratinjauKonsultasi {
  tarif: Record<string, TarifPsikolog>;   // per psikolog_id
  anak: Record<string, KuotaAnak>;        // per anak_id
}

const COLS_092 = 'psikolog_id,harga_konsultasi,diskon_langganan_persen';

/**
 * Tarif tiap psikolog + sisa kuota gratis tiap anak milik ortu yang login.
 *
 * TOLERAN: bila kolom 0092 belum ada, tarif per psikolog dianggap kosong dan semuanya
 * jatuh ke bawaan global — halaman booking tetap hidup.
 */
export async function getPratinjauKonsultasi(): Promise<PratinjauKonsultasi> {
  const s = await createClient();
  // Tak perlu memeriksa login di sini: `getKuotaAnakSaya()` mengembalikan peta kosong
  // bila belum login, dan tarif psikolog memang boleh dilihat siapa pun.
  const bayar = await getPengaturanBayar();
  const hargaDefault = Math.max(0, Math.floor(bayar.harga_konsultasi_nominal || 0));
  const diskonDefault = Math.min(100, Math.max(0, Math.floor(bayar.diskon_konsultasi_langganan_persen || 0)));

  const tarif: Record<string, TarifPsikolog> = {};
  const coba = await s.from('jadwal_psikolog').select(COLS_092).eq('aktif', true);
  let jadwal = coba.data;
  if (coba.error) {
    // Kolom 0092 belum ada → semua psikolog memakai tarif & diskon bawaan global.
    const { data: dasar } = await s.from('jadwal_psikolog').select('psikolog_id').eq('aktif', true);
    jadwal = (dasar ?? []).map((r) => ({ psikolog_id: r.psikolog_id, harga_konsultasi: null, diskon_langganan_persen: null }));
  }
  for (const r of jadwal ?? []) {
    const harga = Math.max(0, Math.floor((r.harga_konsultasi as number | null) ?? 0));
    const diskon = (r.diskon_langganan_persen as number | null);
    tarif[r.psikolog_id as string] = {
      // Nol berarti "ikut bawaan global" — sama seperti `nullif(...,0)` di RPC.
      harga: harga > 0 ? harga : hargaDefault,
      diskonPersen: diskon === null || diskon === undefined ? diskonDefault : Math.min(100, Math.max(0, Math.floor(diskon))),
    };
  }

  // Kuota per anak dibaca dari SATU pembaca bersama (`kuota-anak.ts`) — dulu logikanya
  // sempat digandakan di sini, dan dua salinan aturan kuota adalah jalan tercepat menuju
  // angka yang berbeda antara kartu anak dan form booking.
  const kuota = await getKuotaAnakSaya();
  const anak: Record<string, KuotaAnak> = {};
  for (const [id, k] of Object.entries(kuota)) {
    anak[id] = { member: k.member, sisaKuota: k.konsultasi.sisa, paketNama: k.paketNama };
  }

  return { tarif, anak };
}
