// src/app/langganan/page.tsx — orang tua memilih paket per anak & membayar sendiri.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPaketAktif } from '@/lib/data/paket';
import { barisLanggananAnak } from '@/lib/data/langganan-anak';
import { getTagihanSaya } from '@/lib/data/tagihan';
import { getPengaturanBayar } from '@/lib/data/pengaturan-bayar';
import BottomNav from '@/components/BottomNav';
import TombolKembali from '@/components/TombolKembali';
import RekamAktivitas from '@/components/RekamAktivitas';
import PilihPaketForm, { type AnakPaket } from './PilihPaketForm';

export const metadata = { title: 'Pilih Paket Langganan — KidzPlayful' };

export default async function LanggananPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: anak }, paket, baris, tagihan, bayar] = await Promise.all([
    supabase.from('anak').select('id,nama').eq('ortu_id', user.id).order('created_at'),
    getPaketAktif(),
    barisLanggananAnak(user.id),
    getTagihanSaya(),
    getPengaturanBayar(),
  ]);

  const namaPaket = new Map(paket.map((p) => [p.id, p.nama]));
  const daftarAnak: AnakPaket[] = (anak ?? []).map((a) => {
    const b = baris.get(a.id as string);
    return {
      id: a.id as string,
      nama: a.nama as string,
      paketId: b?.paket_id ?? null,
      paketNama: b?.paket_id ? namaPaket.get(b.paket_id) ?? null : null,
      aktifSampai: b?.aktif_sampai ?? null,
      paketBerikutnyaId: b?.paket_berikutnya_id ?? null,
    };
  });

  return (
    <main className="kp-page-narrow" style={{ padding: 16, paddingBottom: 90, marginTop: 20 }}>
      <RekamAktivitas fitur="langganan" />
      <TombolKembali fallback="/pengaturan" style={{ color: 'var(--abu)', fontSize: 13 }} />
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 4px' }}>🎟️ Paket Langganan</h1>
      <p style={{ color: 'var(--abu)', fontSize: 12, marginBottom: 14 }}>
        Harga dihitung <b>per anak</b>. Pilih paket untuk tiap anak yang ingin diikutkan —
        anak yang tidak dipilih tidak ditagih. 🌿
      </p>

      {paket.length === 0 ? (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>
          Paket langganan belum tersedia. Coba lagi nanti ya 🙏
        </p>
      ) : daftarAnak.length === 0 ? (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>
          Belum ada profil anak. Tambahkan profil anak dulu di <b>Beranda</b>, lalu pilih paketnya di sini.
        </p>
      ) : (
        <PilihPaketForm
          anak={daftarAnak}
          paket={paket}
          tagihan={tagihan}
          bank={bayar.bank_teks}
          qris={bayar.qris_url}
          waAdmin={bayar.wa_nomor}
        />
      )}
      <BottomNav />
    </main>
  );
}
