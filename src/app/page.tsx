export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
        gap: 6,
      }}
    >
      <div style={{ fontSize: 64 }}>🌈</div>
      <h1 style={{ color: "var(--lavender-d)", fontSize: 34, fontWeight: 800 }}>KidzPlayful</h1>
      <p style={{ color: "var(--abu)", maxWidth: 340, marginBottom: 18 }}>
        Main sambil belajar — kelas bermain digital yang tumbuh bersama anak 🌿
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <a
          href="/daftar"
          className="kp-btn"
          style={{ textDecoration: "none", display: "inline-block" }}
        >
          Mulai Gratis ▶
        </a>
        <a
          href="/login"
          className="kp-btn"
          style={{
            textDecoration: "none",
            display: "inline-block",
            background: "#fff",
            color: "var(--lavender-d)",
            boxShadow: "0 5px 0 #c9b6f0",
          }}
        >
          Masuk
        </a>
      </div>
      <p style={{ fontSize: 12, color: "var(--abu)", marginTop: 18 }}>
        Gratis 14 hari · tanpa kartu · aman untuk anak
      </p>
    </main>
  );
}
