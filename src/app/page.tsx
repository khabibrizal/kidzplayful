import Pewi from "@/components/ui/Pewi";

export default function Home() {
  return (
    <main className="kp-splash" style={{ minHeight: "100dvh" }}>
      <Pewi size={130} />
      <div className="kp-brand">KidzPlayful</div>
      <div className="kp-tagline" style={{ marginBottom: 10 }}>Main sambil belajar 🌿</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <a href="/daftar" className="kp-btn">Mulai Gratis ▶</a>
        <a href="/login" className="kp-btn putih">Masuk</a>
      </div>
      <p style={{ fontSize: 12, color: "var(--abu)", marginTop: 18 }}>
        Gratis 14 hari · tanpa kartu · aman untuk anak
      </p>
    </main>
  );
}
