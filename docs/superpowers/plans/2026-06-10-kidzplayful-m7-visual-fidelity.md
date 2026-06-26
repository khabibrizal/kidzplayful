# KidzPlayful — M7: Visual Fidelity Pass (samakan app dengan mockup) — Implementation Plan

> Pola subagent-driven. Acuan visual SUMBER KEBENARAN: `mockups/demo.html` + `mockups/demo.js` (gaya Lembut Pastel + maskot Pewi). Subagent WAJIB membuka file itu untuk meniru nilai warna/shadow/spasi persis.

**Goal:** Menyamakan tampilan app nyata dengan mockup demo: palet pastel, **tombol "jelly"** (box-shadow tebal + tekan turun), **kartu** membulat, **chip/koin pill**, **maskot Pewi**, animasi **bintang + konfeti**. Diterapkan ke seluruh layar (publik, Mode Anak, Mode Ortu, Admin ringan).

**Architecture:** Buat **sistem desain global** (kelas reusable di `globals.css`) + komponen `Pewi` & `Confetti`, lalu restyle tiap layar memakai kelas itu (bukan inline ad-hoc). Tanpa perubahan logika/DB. Verifikasi: build hijau + cocok visual dengan demo.

**Prasyarat:** Tahap 1 selesai (semua fitur). Font Baloo/Quicksand sudah dimuat (M-polish).

---

## Task 1: Sistem desain global (globals.css)

**Files:** Modify `src/app/globals.css`

- [ ] **Step 1: Tambah kelas reusable** (buka `mockups/demo.html` untuk nilai persis; gunakan yang setara berikut). Tambahkan ke `globals.css` (pertahankan token `:root` & reset yang ada):

```css
/* ====== Sistem desain (selaras mockups/demo.html) ====== */
.kp-shell { max-width: 440px; margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column; padding: 16px; }

/* tombol jelly */
.kp-btn { border:none; cursor:pointer; font-family:inherit; font-weight:800; border-radius:999px; padding:15px 28px; font-size:18px; color:#fff; background:var(--lavender-d); box-shadow:0 6px 0 #7d63b8; transition:transform .08s; display:inline-block; text-decoration:none; text-align:center; }
.kp-btn:active { transform:translateY(3px); box-shadow:0 3px 0 #7d63b8; }
.kp-btn.mint { background:var(--mint-d); box-shadow:0 6px 0 #4fae87; }
.kp-btn.mint:active { box-shadow:0 3px 0 #4fae87; }
.kp-btn.putih { background:#fff; color:var(--lavender-d); box-shadow:0 6px 0 #c9b6f0; }
.kp-btn.putih:active { box-shadow:0 3px 0 #c9b6f0; }

/* kartu, chip, koin */
.kp-card { background:var(--kartu); border-radius:22px; box-shadow:0 8px 24px rgba(120,90,180,.12); padding:18px; }
.kp-input { width:100%; background:#f3f3f8; border:none; border-radius:12px; padding:13px; font-size:14px; margin-bottom:11px; font-family:inherit; }
.kp-chip { background:var(--peach); color:#9a5b33; font-weight:700; padding:6px 14px; border-radius:999px; font-size:14px; box-shadow:0 4px 0 var(--peach-d); display:inline-block; }
.kp-coin { background:#fff; border-radius:999px; padding:5px 13px; font-weight:700; font-size:14px; color:#c98a00; box-shadow:0 3px 0 #efe3c9; display:inline-flex; gap:5px; align-items:center; }
.kp-lock { width:40px; height:40px; border-radius:50%; background:#fff; border:none; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 3px 0 #e6def5; cursor:pointer; font-family:inherit; }

/* tile besar (menu anak) */
.kp-tile { border:none; cursor:pointer; font-family:inherit; border-radius:26px; padding:20px; display:flex; align-items:center; gap:15px; color:#fff; font-weight:800; font-size:20px; text-align:left; box-shadow:0 7px 0 rgba(0,0,0,.12); transition:transform .08s; width:100%; }
.kp-tile:active { transform:translateY(3px); }
.kp-tile .emo { font-size:42px; }
.kp-tile small { display:block; font-size:12px; font-weight:600; opacity:.92; }
.kp-tile.mint { background:var(--mint-d); box-shadow:0 7px 0 #4fae87; }
.kp-tile.lavender { background:var(--lavender-d); box-shadow:0 7px 0 #7d63b8; }
.kp-tile.biru { background:var(--biru-d); box-shadow:0 7px 0 #4f93d8; }

/* splash & reward gradients */
.kp-splash { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:6px; background:linear-gradient(170deg,#e9dcff,#d4ecff); border-radius:0; }
.kp-reward { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:8px; color:#fff; background:linear-gradient(170deg,#d9c9ff,#bfe6ff); border-radius:24px; padding:24px; }
.kp-brand { font-size:30px; font-weight:800; color:var(--lavender-d); letter-spacing:.5px; }
.kp-tagline { font-size:14px; color:#8a82a0; }

/* animasi */
@keyframes kp-pop { 0%{transform:scale(1)} 50%{transform:scale(1.18)} 100%{transform:scale(1)} }
@keyframes kp-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 75%{transform:translateX(7px)} }
.kp-confetti { position:fixed; inset:0; pointer-events:none; overflow:hidden; z-index:90; }
.kp-confetti span { position:absolute; top:-30px; font-size:20px; animation:kp-fall linear forwards; }
@keyframes kp-fall { to { transform:translateY(105vh) rotate(360deg); opacity:.4; } }
```

- [ ] **Step 2: Commit** `git add -A && git commit -m "style: sistem desain global (jelly/kartu/tile/splash/reward)"`

---

## Task 2: Komponen Pewi & Confetti

**Files:** Create `src/components/ui/Pewi.tsx`, `src/components/ui/Confetti.tsx`

- [ ] **Step 1: Pewi** (SVG persis dari `mockups/demo.html` bagian `.pewi`)

```tsx
// src/components/ui/Pewi.tsx
export default function Pewi({ size = 130 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <ellipse cx="40" cy="26" rx="11" ry="22" fill="#d9c9ff" /><ellipse cx="80" cy="26" rx="11" ry="22" fill="#d9c9ff" />
      <ellipse cx="40" cy="30" rx="5" ry="13" fill="#ffd3e2" /><ellipse cx="80" cy="30" rx="5" ry="13" fill="#ffd3e2" />
      <path d="M30 70 Q22 50 40 48 Q46 34 62 42 Q82 34 86 54 Q102 56 94 74 Q100 92 78 92 L42 92 Q22 92 30 70Z" fill="#fff" stroke="#e3d6fb" strokeWidth="2" />
      <circle cx="50" cy="68" r="5.5" fill="#5b5170" /><circle cx="72" cy="68" r="5.5" fill="#5b5170" />
      <circle cx="52" cy="66" r="1.8" fill="#fff" /><circle cx="74" cy="66" r="1.8" fill="#fff" />
      <circle cx="42" cy="78" r="5" fill="#ffc2d6" /><circle cx="80" cy="78" r="5" fill="#ffc2d6" />
      <path d="M56 76 Q61 81 66 76" stroke="#5b5170" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
```

- [ ] **Step 2: Confetti** (logika dari `mockups/demo.js` fungsi `confetti()`)

```tsx
// src/components/ui/Confetti.tsx
'use client';
import { useEffect, useState } from 'react';

export default function Confetti() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 4200);
    return () => clearTimeout(t);
  }, []);
  if (!on) return null;
  const emo = ['⭐', '🌸', '🎈', '💜', '🌟', '🍃'];
  return (
    <div className="kp-confetti" aria-hidden="true">
      {Array.from({ length: 26 }).map((_, i) => (
        <span key={i} style={{
          left: `${4 + (i * 3.6) % 92}%`,
          animationDuration: `${2.2 + (i % 5) * 0.4}s`,
          animationDelay: `${(i % 8) * 0.12}s`,
        }}>{emo[i % emo.length]}</span>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verifikasi** `npx tsc --noEmit`.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat(ui): komponen Pewi (maskot) + Confetti"`

---

## Task 3: Halaman publik (landing, daftar, login, pilih-anak)

**Files:** Modify `src/app/page.tsx`, `src/app/daftar/page.tsx`, `src/app/login/page.tsx`, `src/app/pilih-anak/page.tsx`

Acuan: bagian splash & form di `mockups/demo.html`.

- [ ] **Step 1: Landing (`page.tsx`)** — pakai Pewi + splash gradient + jelly buttons:

```tsx
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
      <p style={{ fontSize: 12, color: "var(--abu)", marginTop: 18 }}>Gratis 14 hari · tanpa kartu · aman untuk anak</p>
    </main>
  );
}
```

- [ ] **Step 2: daftar & login** — bungkus form dengan `.kp-card`, input `.kp-input`, tombol `.kp-btn`, tambah Pewi kecil di atas judul. (Pertahankan seluruh logika `'use client'`, state, dan handler submit yang ada — hanya ganti className/markup pembungkus.)

- [ ] **Step 3: pilih-anak** — judul + kartu anak pakai `.kp-card`, tombol pakai `.kp-btn`/`.kp-tile`; tautan "Pilih game"/"Panel Admin" tetap. Pertahankan `action={tambahAnak}` & link mode (`/ortu` vs `/main`).

- [ ] **Step 4: Verifikasi** `npx tsc --noEmit && npm run build`.

- [ ] **Step 5: Commit** `git add -A && git commit -m "style(publik): landing+daftar+login+pilih-anak ke gaya mockup"`

---

## Task 4: Mode Anak (menu, game, hadiah, video, PIN, istirahat)

**Files:** Modify `src/app/main/[anakId]/main.module.css` (atau ganti ke kelas global), `MenuAnak.tsx`, `src/components/game/{ManaYa,BeresBeres,CariPasangan,Reward,VideoPojok,PinGate}.tsx`

Acuan: layar Splash/Menu/Play/Reward di `mockups/demo.html`.

- [ ] **Step 1: MenuAnak** — pakai `.kp-chip`, `.kp-coin`, `.kp-lock`, `.kp-tile mint/lavender/biru` (selaras demo). Tambahkan Pewi kecil di menu utama (mis. di atas tiles atau samping chip). Layar **istirahat** pakai gradient lembut + Pewi tidur (boleh emoji 😴). Pertahankan SEMUA logika (timer, PIN, navigasi).

- [ ] **Step 2: Engine game** — tombol opsi `.opt`-style dari demo (kartu putih, `box-shadow:0 6px 0 #e6def5`, font besar), prompt kartu putih, animasi `kp-pop` saat benar & `kp-shake` saat salah. Ganti style inline ad-hoc dengan nilai selaras demo (boleh tetap inline asalkan nilainya sama dengan demo). Jangan ubah logika skor/`onSelesai`.

- [ ] **Step 3: Reward** — pakai `.kp-reward` (gradient), bintang besar animasi `kp-pop`, tombol `.kp-btn putih`, dan **render `<Confetti/>`** saat tampil. Tambah Pewi kecil bila pas.

- [ ] **Step 4: VideoPojok & PinGate** — kartu & tombol pakai kelas global; PinGate keypad pakai gaya tombol lembut seperti demo. Pertahankan logika (maks 2 video, verifikasi PIN).

- [ ] **Step 5: Verifikasi** `npx tsc --noEmit && npx eslint src 2>&1 | tail -15 && npm run build`.

- [ ] **Step 6: Commit** `git add -A && git commit -m "style(mode-anak): menu/game/hadiah/video/PIN ke gaya mockup (Pewi+jelly+konfeti)"`

---

## Task 5: Mode Ortu & Admin (konsistensi pastel)

**Files:** Modify `src/app/ortu/[anakId]/page.tsx` (+css), `src/app/admin/*` (ringan)

- [ ] **Step 1: Mode Ortu** — kartu `.kp-card`, tombol unduh `.kp-btn`, header pastel; tambah Pewi kecil di header. Pertahankan konten panduan/worksheet/video.

- [ ] **Step 2: Admin (ringan)** — pastikan tombol utama pakai `.kp-btn`/style konsisten & kartu pastel; tidak perlu maskot (panel owner). Cukup rapikan agar tidak terlihat "mentah". Pertahankan semua fungsi CRUD.

- [ ] **Step 3: Verifikasi** `npx tsc --noEmit && npm run build`.

- [ ] **Step 4: Commit** `git add -A && git commit -m "style(ortu+admin): konsistensi pastel"`

---

## Task 6: Verifikasi akhir + deploy

- [ ] **Step 1:** `npm test` → 28 hijau · `npm run build` → sukses.
- [ ] **Step 2: Bandingkan visual** — `npm run dev`, buka tiap layar, sandingkan dengan `mockups/demo.html`. Perbaiki selisih mencolok (warna/shadow/spasi).
- [ ] **Step 3: Push** `git push origin master` → tunggu auto-deploy → cek live.

---

## Definition of Done
- Sistem desain global (`kp-*`) dipakai konsisten di seluruh layar.
- Maskot **Pewi** muncul (landing, menu anak, reward, ortu); tombol **jelly**, kartu pastel, **konfeti** di layar hadiah — selaras `mockups/demo.html`.
- Semua logika/fitur tetap berfungsi; unit test 28 hijau; build sukses; ter-deploy.

## Catatan
- Acuan tunggal nilai visual: `mockups/demo.html` & `demo.js`. Bila ragu nilai shadow/warna, ambil dari sana.
- Tidak mengubah skema DB, server action, atau alur — murni presentasi.
