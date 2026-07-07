// src/components/OnboardingChecklist.tsx — panduan langkah awal ortu baru (server, data-driven)
// Kartu tampil selama pengguna belum "aktif" (punya anak + pernah main). Hilang sendiri.
import Link from 'next/link';

type Props = {
  adaAnak: boolean;
  adaAktivitas: boolean;
  statusAktif: boolean;
  gameHref: string | null; // link coba game (null bila belum ada anak)
};

export default function OnboardingChecklist({ adaAnak, adaAktivitas, statusAktif, gameHref }: Props) {
  // aktivasi inti tercapai → sembunyikan kartu
  if (adaAnak && adaAktivitas) return null;

  const langkah = [
    { selesai: adaAnak, label: 'Tambah profil anak', href: adaAnak ? null : '#tambah-anak', kunci: false },
    { selesai: adaAktivitas, label: 'Coba game pertama', href: adaAktivitas ? null : gameHref, kunci: !adaAnak },
    { selesai: statusAktif, label: 'Aktifkan langganan', href: statusAktif ? null : '/pengaturan', kunci: false },
  ];
  const beres = langkah.filter((l) => l.selesai).length;

  return (
    <div className="kp-card" style={{ marginBottom: 16, background: 'linear-gradient(150deg,#eef7f1,#eaf3ff)' }}>
      <div style={{ fontWeight: 800, color: 'var(--lavender-d)', fontSize: 15, marginBottom: 10 }}>
        🌱 Langkah Awal <span style={{ color: 'var(--abu)', fontWeight: 700 }}>({beres}/3)</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {langkah.map((l, i) => {
          const isi = (
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 999, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800,
                background: l.selesai ? 'var(--mint-d)' : '#fff', color: l.selesai ? '#fff' : 'var(--abu)',
                boxShadow: l.selesai ? 'none' : 'inset 0 0 0 2px #dcd3f0',
              }}>{l.selesai ? '✓' : i + 1}</span>
              <span style={{ flex: 1, color: l.selesai ? 'var(--abu)' : 'var(--tinta)', textDecoration: l.selesai ? 'line-through' : 'none', fontWeight: l.selesai ? 500 : 700, fontSize: 14 }}>
                {l.label}
              </span>
              {!l.selesai && !l.kunci && l.href && <span style={{ color: 'var(--biru-d)', fontWeight: 800 }}>→</span>}
              {l.kunci && <span style={{ color: 'var(--abu)', fontSize: 16 }}>🔒</span>}
            </span>
          );
          if (!l.selesai && !l.kunci && l.href) {
            return <Link key={i} href={l.href} style={{ textDecoration: 'none' }}>{isi}</Link>;
          }
          return <div key={i}>{isi}</div>;
        })}
      </div>
      {!adaAnak && <p style={{ color: 'var(--abu)', fontSize: 12, marginTop: 10 }}>Mulai dengan menambahkan profil anak di bawah 👇</p>}
    </div>
  );
}
