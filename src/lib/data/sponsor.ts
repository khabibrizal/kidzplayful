// src/lib/data/sponsor.ts — baca data sponsor & deal sponsorship (admin/investor)
import { createClient } from '@/lib/supabase/server';

export interface Sponsor {
  id: string; nama_perusahaan: string; pic: string | null; email: string | null;
  telepon: string | null; alamat: string | null; npwp: string | null; website: string | null;
  industri: string | null; created_at: string;
}

export interface Deal {
  id: string; sponsor_id: string; nama_event: string | null;
  jenis: 'uang' | 'barang'; nilai: number; deskripsi_barang: string | null; benefit: string | null;
  tanggal_mulai: string | null; tanggal_selesai: string | null; catatan: string | null; status: string;
  no_invoice: string | null; invoice_tanggal: string | null; jatuh_tempo: string | null;
  bayar_metode: string | null; bayar_tanggal: string | null; bayar_jumlah: number | null;
  bayar_referensi: string | null; bukti_url: string | null;
  quotation_url: string | null; agreement_url: string | null;
  created_at: string;
  sponsor?: Sponsor | null;
}

// Pipeline status (tanpa paket). "dibayar" untuk barang = "barang diterima".
export const STATUS_SPONSOR = ['lead', 'negosiasi', 'kesepakatan', 'invoice', 'dibayar', 'selesai', 'batal'];
export const LABEL_STATUS: Record<string, { teks: string; warna: string; bg: string }> = {
  lead: { teks: 'Lead', warna: '#6f6685', bg: '#eee' },
  negosiasi: { teks: 'Negosiasi', warna: '#8a6d1f', bg: '#fdf3d7' },
  kesepakatan: { teks: 'Kesepakatan', warna: '#2563eb', bg: '#e5edff' },
  invoice: { teks: 'Invoice Terkirim', warna: '#7c3aed', bg: '#efe7fb' },
  dibayar: { teks: 'Dibayar / Diterima', warna: '#1c7a43', bg: '#e6f7ee' },
  selesai: { teks: 'Selesai', warna: '#1c7a43', bg: '#d9f2e4' },
  batal: { teks: 'Batal', warna: '#c0392b', bg: '#fdecea' },
};
export const JENIS_SPONSOR = [
  { v: 'uang', l: 'Uang (tunai)' },
  { v: 'barang', l: 'Barang (in-kind)' },
];
export const labelStatus = (s: string) => LABEL_STATUS[s]?.teks ?? s;

const SEL = 'id,sponsor_id,nama_event,jenis,nilai,deskripsi_barang,benefit,tanggal_mulai,tanggal_selesai,catatan,status,no_invoice,invoice_tanggal,jatuh_tempo,bayar_metode,bayar_tanggal,bayar_jumlah,bayar_referensi,bukti_url,quotation_url,agreement_url,created_at';

export async function getSponsorSemua(): Promise<Sponsor[]> {
  try {
    const s = await createClient();
    const { data } = await s.from('sponsor').select('*').order('nama_perusahaan');
    return (data ?? []) as Sponsor[];
  } catch { return []; }
}

export async function getDealSemua(): Promise<Deal[]> {
  try {
    const s = await createClient();
    const { data } = await s.from('sponsorship')
      .select(`${SEL}, sponsor:sponsor_id(id,nama_perusahaan,pic,email,telepon,alamat,npwp,website,industri,created_at)`)
      .order('created_at', { ascending: false });
    return ((data ?? []) as unknown as (Deal & { sponsor: Sponsor | Sponsor[] | null })[])
      .map((d) => ({ ...d, sponsor: Array.isArray(d.sponsor) ? d.sponsor[0] ?? null : d.sponsor }));
  } catch { return []; }
}

export async function getDeal(id: string): Promise<Deal | null> {
  try {
    const s = await createClient();
    const { data } = await s.from('sponsorship')
      .select(`${SEL}, sponsor:sponsor_id(id,nama_perusahaan,pic,email,telepon,alamat,npwp,website,industri,created_at)`)
      .eq('id', id).maybeSingle();
    if (!data) return null;
    const d = data as unknown as Deal & { sponsor: Sponsor | Sponsor[] | null };
    return { ...d, sponsor: Array.isArray(d.sponsor) ? d.sponsor[0] ?? null : d.sponsor };
  } catch { return null; }
}

export interface RingkasanSponsor {
  tunaiMasuk: number;     // sponsor uang yang sudah dibayar/selesai
  inKind: number;         // total nilai estimasi sponsor barang (dibayar/selesai)
  outstanding: number;    // invoice terkirim (uang) belum dibayar
  jumlahDeal: number;
  perStatus: Record<string, number>;
}

export async function getRingkasanSponsor(): Promise<RingkasanSponsor> {
  const kosong: RingkasanSponsor = { tunaiMasuk: 0, inKind: 0, outstanding: 0, jumlahDeal: 0, perStatus: {} };
  try {
    const s = await createClient();
    const { data } = await s.from('sponsorship').select('jenis,nilai,status');
    const rows = (data ?? []) as { jenis: string; nilai: number; status: string }[];
    const out = { ...kosong, perStatus: {} as Record<string, number> };
    out.jumlahDeal = rows.length;
    for (const r of rows) {
      out.perStatus[r.status] = (out.perStatus[r.status] ?? 0) + 1;
      const dibayar = r.status === 'dibayar' || r.status === 'selesai';
      if (r.jenis === 'uang') {
        if (dibayar) out.tunaiMasuk += r.nilai || 0;
        if (r.status === 'invoice') out.outstanding += r.nilai || 0;
      } else if (r.jenis === 'barang' && dibayar) {
        out.inKind += r.nilai || 0;
      }
    }
    return out;
  } catch { return kosong; }
}
