// src/lib/data/sponsor-actions.ts — kelola sponsor, deal, invoice, pembayaran (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { tanggalWIB } from '@/lib/domain/gamifikasi';
import { catatLedger, hapusLedgerRef } from './ledger';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) throw new Error('Bukan admin');
  return { s, adminId: user.id };
}

const int = (v: FormDataEntryValue | null) => Math.max(0, Math.floor(Number(String(v ?? '').replace(/[^0-9]/g, '')) || 0));
const str = (v: FormDataEntryValue | null) => String(v ?? '').trim() || null;
const tambahHari = (isoTgl: string, n: number) => new Date(new Date(isoTgl + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);

function refresh() {
  revalidatePath('/admin/sponsor');
  revalidatePath('/admin/keuangan');
}

// ===== Sponsor (perusahaan) =====
export async function simpanSponsor(formData: FormData) {
  const { s } = await adminDb();
  const id = str(formData.get('id'));
  const nama = str(formData.get('nama_perusahaan'));
  if (!nama) throw new Error('Nama perusahaan wajib diisi.');
  const row = {
    nama_perusahaan: nama, pic: str(formData.get('pic')), email: str(formData.get('email')),
    telepon: str(formData.get('telepon')), alamat: str(formData.get('alamat')), npwp: str(formData.get('npwp')),
    website: str(formData.get('website')), industri: str(formData.get('industri')),
  };
  const { error } = id
    ? await s.from('sponsor').update(row).eq('id', id)
    : await s.from('sponsor').insert(row);
  if (error) throw new Error(error.message);
  refresh();
}

export async function hapusSponsor(formData: FormData) {
  const { s } = await adminDb();
  const { error } = await s.from('sponsor').delete().eq('id', String(formData.get('id')));
  if (error) throw new Error(error.message);
  refresh();
}

// ===== Deal sponsorship =====
export async function simpanDeal(formData: FormData) {
  const { s, adminId } = await adminDb();
  const id = str(formData.get('id'));
  const sponsorId = str(formData.get('sponsor_id'));
  if (!sponsorId) throw new Error('Pilih sponsor dulu.');
  const jenis = String(formData.get('jenis') ?? 'uang') === 'barang' ? 'barang' : 'uang';
  const row = {
    sponsor_id: sponsorId,
    nama_event: str(formData.get('nama_event')),
    jenis,
    nilai: int(formData.get('nilai')),
    deskripsi_barang: jenis === 'barang' ? str(formData.get('deskripsi_barang')) : null,
    benefit: str(formData.get('benefit')),
    tanggal_mulai: str(formData.get('tanggal_mulai')),
    tanggal_selesai: str(formData.get('tanggal_selesai')),
    catatan: str(formData.get('catatan')),
    updated_at: new Date().toISOString(),
  };
  const { error } = id
    ? await s.from('sponsorship').update(row).eq('id', id)
    : await s.from('sponsorship').insert({ ...row, dibuat_oleh: adminId });
  if (error) throw new Error(error.message);
  refresh();
}

export async function hapusDeal(formData: FormData) {
  const { s } = await adminDb();
  const id = String(formData.get('id'));
  await hapusLedgerRef(s, 'sponsorship', id);
  const { error } = await s.from('sponsorship').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function setStatusDeal(formData: FormData) {
  const { s } = await adminDb();
  const id = String(formData.get('id'));
  const status = String(formData.get('status') ?? '');
  if (!status) throw new Error('Status tidak valid.');
  const { error } = await s.from('sponsorship').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  if (status === 'batal') await hapusLedgerRef(s, 'sponsorship', id);
  refresh();
}

// ===== Invoice: nomor sekuensial INV-SP-YYYYMM-0001 =====
export async function generateInvoice(formData: FormData) {
  const { s } = await adminDb();
  const id = String(formData.get('id'));
  const hari = tanggalWIB();
  const ym = hari.slice(0, 7).replace('-', ''); // YYYYMM
  const prefix = `INV-SP-${ym}-`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { count } = await s.from('sponsorship')
      .select('id', { count: 'exact', head: true })
      .like('no_invoice', `${prefix}%`);
    const seq = String((count ?? 0) + 1 + attempt).padStart(4, '0');
    const noInvoice = `${prefix}${seq}`;
    const { error } = await s.from('sponsorship').update({
      no_invoice: noInvoice, invoice_tanggal: hari, jatuh_tempo: tambahHari(hari, 14),
      status: 'invoice', updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (!error) { refresh(); return; }
    if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message); // error lain → berhenti
    // bentrok nomor → ulangi dengan seq berikutnya
  }
  throw new Error('Gagal membuat nomor invoice, coba lagi.');
}

// ===== Pembayaran / penerimaan =====
export async function catatPembayaran(formData: FormData) {
  const { s, adminId } = await adminDb();
  const id = String(formData.get('id'));
  const { data: deal } = await s.from('sponsorship')
    .select('jenis,nilai,nama_event,sponsor:sponsor_id(nama_perusahaan)').eq('id', id).single();
  if (!deal) throw new Error('Deal tidak ditemukan.');
  const jumlah = int(formData.get('jumlah')) || (deal.nilai as number) || 0;
  const { error } = await s.from('sponsorship').update({
    bayar_metode: str(formData.get('metode')),
    bayar_tanggal: str(formData.get('tanggal')) || tanggalWIB(),
    bayar_jumlah: jumlah,
    bayar_referensi: str(formData.get('referensi')),
    status: 'dibayar', updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw new Error(error.message);

  // Hanya sponsor UANG yang masuk ledger kas (cash-basis). Barang = in-kind, tidak dicatat ke kas.
  if (deal.jenis === 'uang') {
    const sp = Array.isArray(deal.sponsor) ? deal.sponsor[0] : deal.sponsor;
    const nama = (sp as { nama_perusahaan?: string } | null)?.nama_perusahaan ?? 'Sponsor';
    await catatLedger(s, {
      arah: 'masuk', kategori: 'sponsorship', jumlah,
      ref_tipe: 'sponsorship', ref_id: id,
      keterangan: `Sponsor ${nama}${deal.nama_event ? ' — ' + deal.nama_event : ''}`,
      metode: str(formData.get('metode')) ?? undefined, dibuat_oleh: adminId,
    });
  }
  refresh();
}

// ===== Dokumen (dipanggil dari komponen upload client) =====
const FIELD_DOK = new Set(['quotation_url', 'agreement_url', 'bukti_url']);
export async function simpanDokumen(dealId: string, field: string, url: string) {
  const { s } = await adminDb();
  if (!FIELD_DOK.has(field)) throw new Error('Field dokumen tidak valid.');
  const { error } = await s.from('sponsorship').update({ [field]: url || null, updated_at: new Date().toISOString() }).eq('id', dealId);
  if (error) throw new Error(error.message);
  refresh();
}
