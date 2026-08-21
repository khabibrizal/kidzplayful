// src/lib/data/paket-actions.ts — CRUD master paket langganan (khusus admin).
//
// Semua hak akses & harga adalah DATA di baris paket, jadi berkas ini satu-satunya jalan
// mengubahnya dari aplikasi — tak ada nilai paket yang di-hardcode di kode.
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { AturanKeluarga, SatuanKuota } from '@/lib/game/tipe';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) throw new Error('Bukan admin');
  return s;
}

export interface InputPaket {
  kode: string;
  nama: string;
  deskripsi: string;
  benefit: string[];
  hargaBulanan: number;
  diskonKeluarga: AturanKeluarga[];
  aksesIdeBermain: boolean;
  aksesGame: boolean;
  aksesVideo: boolean;
  aksesKomunitas: boolean;
  worksheet: boolean;
  konsultasiJumlah: number;
  konsultasiSatuan: SatuanKuota;
  raporBulanan: boolean;
  urutan: number;
  aktif: boolean;
}

/** Bersihkan aturan diskon keluarga: minimal 2 anak, dan buang baris tanpa nilai. */
function bersihkanAturan(rows: AturanKeluarga[]): AturanKeluarga[] {
  return rows
    .map((r) => ({
      min_anak: Math.max(2, Math.floor(Number(r.min_anak) || 0)),
      persen: r.persen != null ? Math.min(100, Math.max(0, Math.floor(Number(r.persen) || 0))) : undefined,
      nominal: r.nominal != null ? Math.max(0, Math.floor(Number(r.nominal) || 0)) : undefined,
    }))
    .filter((r) => (r.persen ?? 0) > 0 || (r.nominal ?? 0) > 0)
    .sort((a, b) => a.min_anak - b.min_anak);
}

function baris(i: InputPaket) {
  return {
    kode: i.kode.trim().toLowerCase(),
    nama: i.nama.trim(),
    deskripsi: i.deskripsi.trim() || null,
    benefit: i.benefit.map((b) => b.trim()).filter(Boolean),
    harga_bulanan: Math.max(0, Math.floor(i.hargaBulanan || 0)),
    diskon_keluarga: bersihkanAturan(i.diskonKeluarga ?? []),
    akses_ide_bermain: i.aksesIdeBermain,
    akses_game: i.aksesGame,
    akses_video: i.aksesVideo,
    akses_komunitas: i.aksesKomunitas,
    worksheet: i.worksheet,
    konsultasi_gratis_jumlah: Math.max(0, Math.floor(i.konsultasiJumlah || 0)),
    konsultasi_gratis_satuan: i.konsultasiSatuan,
    rapor_bulanan: i.raporBulanan,
    urutan: Math.floor(i.urutan || 0),
    aktif: i.aktif,
    updated_at: new Date().toISOString(),
  };
}

export async function buatPaket(i: InputPaket): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    if (!i.kode.trim()) return { ok: false, error: 'Kode paket wajib (mis. basic).' };
    if (!i.nama.trim()) return { ok: false, error: 'Nama paket wajib.' };
    const { error } = await s.from('paket_langganan').insert(baris(i));
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/paket'); revalidatePath('/admin/langganan');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan paket.' };
  }
}

export async function updatePaket(id: string, i: InputPaket): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    // `kode` sengaja TIDAK ikut diubah: nilainya tersimpan di peta `diskon_paket` milik tiap
    // event & produk. Mengubahnya akan membuat seluruh diskon paket ini sunyi jadi 0.
    const { kode: _kode, ...tanpaKode } = baris(i);
    void _kode;
    const { error } = await s.from('paket_langganan').update(tanpaKode).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/paket'); revalidatePath('/admin/langganan');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan paket.' };
  }
}

export async function toggleAktifPaket(id: string, aktif: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const { error } = await s.from('paket_langganan')
      .update({ aktif, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/paket'); revalidatePath('/admin/langganan');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' };
  }
}
