// src/lib/data/konsultasi-tarif.ts — bahan PRATINJAU biaya sesi konsultasi.
//
// Dipakai form booking supaya orang tua melihat biayanya (dan potongan vouchernya)
// SEBELUM menekan Daftar. Angka yang mengikat tetap dihitung RPC `daftar_konsultasi`;
// ini pratinjau, dan sengaja memakai sumber yang sama dengan RPC itu.
import { createClient } from '@/lib/supabase/server';
import { getPengaturanBayar } from './pengaturan-bayar';
import { getPaketMap } from './paket';
import { awalPeriode } from '@/lib/domain/kuota-worksheet';
import { tanggalWIB } from '@/lib/domain/gamifikasi';

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
  const { data: { user } } = await s.auth.getUser();
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

  const anak: Record<string, KuotaAnak> = {};
  if (!user) return { tarif, anak };

  const [{ data: anakSaya }, { data: baris }, paketMap] = await Promise.all([
    s.from('anak').select('id').eq('ortu_id', user.id),
    s.from('langganan_anak').select('anak_id,paket_id,aktif_sampai').eq('ortu_id', user.id),
    getPaketMap(),
  ]);
  const perAnak = new Map((baris ?? []).map((b) => [b.anak_id as string, b]));
  const hariIni = tanggalWIB();

  for (const a of anakSaya ?? []) {
    const id = a.id as string;
    const b = perAnak.get(id);
    const paket = b?.paket_id ? paketMap.get(b.paket_id as string) ?? null : null;
    // Aturan keanggotaan DISAMAKAN dengan RPC: `aktif_sampai >= hari ini` + paket ada.
    // Sengaja TIDAK memakai masa tenggang/trial — RPC pun tidak.
    const member = !!paket && !!b?.aktif_sampai && (b.aktif_sampai as string) >= hariIni;
    let sisaKuota = 0;
    if (member && paket && paket.konsultasi_gratis_jumlah > 0) {
      const sejak = awalPeriode(paket.konsultasi_gratis_satuan, new Date());
      // Ditulis sebagai daftar POSITIF, bukan `not.in`: tanda kutip & kurung di filter
      // PostgREST mudah salah bentuk, dan diamnya query salah bentuk akan terbaca
      // sebagai "kuota masih penuh" — kesalahan yang menguntungkan orang tua tapi
      // membocorkan sesi gratis.
      let q = s.from('pendaftaran_konsultasi').select('id', { count: 'exact', head: true })
        .eq('anak_id', id).eq('dari_kuota', true)
        .in('status', ['menunggu', 'menunggu_bayar', 'diterima', 'selesai']);
      if (sejak) q = q.gte('created_at', sejak);
      const { count } = await q;
      sisaKuota = Math.max(0, paket.konsultasi_gratis_jumlah - (count ?? 0));
    }
    anak[id] = { member, sisaKuota, paketNama: paket?.nama ?? null };
  }
  return { tarif, anak };
}
