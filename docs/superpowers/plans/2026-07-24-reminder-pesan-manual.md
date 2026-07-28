# Pesan WA Manual per Event di Reminder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin menulis pesan WA manual per event di `/admin/reminder`; pesan WA ke tiap peserta = sapaan + teks pengingat (sebut judul) + detail (event/tgl/jam/lokasi/nama anak/kelas) + pesan manual.

**Architecture:** Kolom `event.pesan_reminder` (migrasi 0085), diambil di `getReminderPendaftaran` bersama `kelas`. Util murni `domain/reminder.ts susunPesanReminder` (teruji) menyusun pesan. `ReminderAdmin` menampilkan textarea+Simpan per event (`simpanPesanReminder`) dan memakai util utk tombol Kirim WA.

**Tech Stack:** Next.js 16 (server actions), Supabase, Vitest.

Spec: `docs/superpowers/specs/2026-07-24-reminder-pesan-manual-design.md`.

Konvensi: commit `git -c commit.gpgsign=false ... -m "…"` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Gerbang: `npx tsc --noEmit` + `npm run build`.

## File Structure
- Create `supabase/migrations/0085_event_pesan_reminder.sql`.
- Create `src/lib/domain/reminder.ts` + `src/lib/domain/__tests__/reminder.test.ts`.
- Modify `src/lib/data/admin-reminder.ts` (select + tipe).
- Modify `src/lib/data/admin-reminder-actions.ts` (`simpanPesanReminder`).
- Modify `src/app/admin/reminder/ReminderAdmin.tsx` (textarea + Simpan + pakai util).

---

### Task 1: Migrasi + util `susunPesanReminder` (teruji)

**Files:**
- Create: `supabase/migrations/0085_event_pesan_reminder.sql`
- Create: `src/lib/domain/reminder.ts`
- Test: `src/lib/domain/__tests__/reminder.test.ts`

- [ ] **Step 1: Migration**

```sql
-- 0085_event_pesan_reminder.sql — pesan WA manual per event (dipakai halaman reminder).
alter table public.event add column if not exists pesan_reminder text;
```

- [ ] **Step 2: Write failing test**

```ts
// src/lib/domain/__tests__/reminder.test.ts
import { describe, it, expect } from 'vitest';
import { susunPesanReminder } from '../reminder';

const dasar = { nama: 'Sari', judul: 'Slime Party', tanggal: '2026-08-01', tanggalFmt: '1 Agustus 2026', jamMulai: '09:00', jamSelesai: '11:00', lokasi: 'Studio A', anakNama: ['Nayla'], kelas: 'baby' as string | null, pesanManual: 'Bawa baju ganti ya.' };

describe('susunPesanReminder', () => {
  it('memuat sapaan, teks pengingat (judul), detail, nama anak, pesan manual', () => {
    const p = susunPesanReminder(dasar);
    expect(p).toContain('Halo Kak Sari');
    expect(p).toContain('Terimakasih sudah mendaftar di Slime Party');
    expect(p).toContain('berikut detail informasinya');
    expect(p).toContain('Slime Party');
    expect(p).toContain('1 Agustus 2026');
    expect(p).toContain('09:00-11:00');
    expect(p).toContain('Studio A');
    expect(p).toContain('Nayla');
    expect(p).toContain('Baby Class');
    expect(p).toContain('Bawa baju ganti ya.');
    expect(p).toContain('— KidzPlayful');
  });
  it('baris Kelas tidak muncul untuk gabungan/null', () => {
    expect(susunPesanReminder({ ...dasar, kelas: 'gabungan' })).not.toContain('Kelas:');
    expect(susunPesanReminder({ ...dasar, kelas: null })).not.toContain('Kelas:');
  });
  it('Toddler Class untuk kelas toddler', () => {
    expect(susunPesanReminder({ ...dasar, kelas: 'toddler' })).toContain('Toddler Class');
  });
  it('pesan manual kosong → tanpa baris manual (tetap valid)', () => {
    const p = susunPesanReminder({ ...dasar, pesanManual: null });
    expect(p).not.toContain('Bawa baju ganti');
    expect(p).toContain('Slime Party');
  });
  it('jam & lokasi opsional', () => {
    const p = susunPesanReminder({ ...dasar, jamMulai: null, jamSelesai: null, lokasi: null });
    expect(p).not.toContain('pukul');
    expect(p).not.toContain('📍');
  });
  it('nama kosong → "Halo Kak 👋"', () => {
    expect(susunPesanReminder({ ...dasar, nama: null })).toContain('Halo Kak 👋');
  });
});
```

- [ ] **Step 3: Run test → gagal**

Run: `npx vitest run src/lib/domain/__tests__/reminder.test.ts`
Expected: FAIL — module `../reminder` belum ada.

- [ ] **Step 4: Write `src/lib/domain/reminder.ts`**

```ts
// src/lib/domain/reminder.ts — susun pesan WA reminder event (murni, teruji).
export interface InputReminder {
  nama: string | null;
  judul: string;
  tanggal: string | null;
  tanggalFmt?: string;        // tanggal terformat (opsional; fallback ke `tanggal`)
  jamMulai: string | null;
  jamSelesai: string | null;
  lokasi: string | null;
  anakNama: string[];
  kelas: string | null;       // 'baby' | 'toddler' | 'gabungan' | null
  pesanManual: string | null;
}

export function susunPesanReminder(i: InputReminder): string {
  const baris: string[] = [];
  baris.push(`Halo Kak ${i.nama?.trim() ? i.nama.trim() + ' ' : ''}👋`);
  baris.push('');
  baris.push(`Terimakasih sudah mendaftar di ${i.judul}, jangan lupa untuk hadir ya, berikut detail informasinya,`);
  baris.push('');
  baris.push(`📅 *${i.judul}*`);
  const tgl = i.tanggalFmt || i.tanggal;
  if (tgl) {
    const jam = i.jamMulai ? `, pukul ${i.jamMulai}${i.jamSelesai ? `-${i.jamSelesai}` : ''} WIB` : '';
    baris.push(`🗓️ ${tgl}${jam}`);
  }
  if (i.lokasi?.trim()) baris.push(`📍 ${i.lokasi.trim()}`);
  const anak = (i.anakNama ?? []).filter((a) => a && a.trim());
  if (anak.length) baris.push(`🧒 Peserta: ${anak.join(', ')}`);
  const kelasLabel = i.kelas === 'baby' ? 'Baby Class' : i.kelas === 'toddler' ? 'Toddler Class' : null;
  if (kelasLabel) baris.push(`🏷️ Kelas: ${kelasLabel}`);
  if (i.pesanManual?.trim()) { baris.push(''); baris.push(i.pesanManual.trim()); }
  baris.push('');
  baris.push('— KidzPlayful');
  return baris.join('\n');
}
```

- [ ] **Step 5: Run test → lulus**

Run: `npx vitest run src/lib/domain/__tests__/reminder.test.ts`
Expected: PASS (6 test).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0085_event_pesan_reminder.sql src/lib/domain/reminder.ts src/lib/domain/__tests__/reminder.test.ts
git -c commit.gpgsign=false commit -m "feat(reminder): kolom pesan_reminder (0085) + util susunPesanReminder (teruji)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Reader + server action

**Files:**
- Modify: `src/lib/data/admin-reminder.ts`
- Modify: `src/lib/data/admin-reminder-actions.ts`

- [ ] **Step 1: `admin-reminder.ts` — tipe + select**

Ubah interface `ReminderRow`:
```ts
export interface ReminderRow {
  id: string;
  reminder_terkirim: boolean;
  anak_nama: string[];
  kelas: string | null;
  event: { id: string; judul: string; lokasi: string | null; tanggal: string | null; jam_mulai: string | null; jam_selesai: string | null; pesan_reminder: string | null } | null;
  nama: string | null;
  no_wa: string | null;
}
```

Ubah `.select(...)` menambah `kelas` (baris pendaftaran) + `pesan_reminder` (event):
```ts
    .select('id, reminder_terkirim, anak_nama, kelas, event:event_id(id,judul,lokasi,tanggal,jam_mulai,jam_selesai,pesan_reminder), ortu:ortu_id(nama_tampilan,no_wa)')
```

Ubah objek `map(...)` menambah `kelas`:
```ts
    return { id: r.id as string, reminder_terkirim: !!r.reminder_terkirim, anak_nama: (r.anak_nama ?? []) as string[], kelas: (r.kelas as string) ?? null, event: ev, nama: ortu?.nama_tampilan ?? null, no_wa: ortu?.no_wa ?? null };
```

- [ ] **Step 2: `admin-reminder-actions.ts` — `simpanPesanReminder`**

Tambahkan di akhir file:
```ts
export async function simpanPesanReminder(eventId: string, pesan: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return { ok: false, error: 'Tidak terautentikasi' };
    const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!prof?.is_admin) return { ok: false, error: 'Bukan admin' };
    const { error } = await s.from('event').update({ pesan_reminder: pesan.trim() || null }).eq('id', eventId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/reminder');
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' }; }
}
```

Tambahkan import `revalidatePath` di atas file bila belum ada:
```ts
import { revalidatePath } from 'next/cache';
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/admin-reminder.ts src/lib/data/admin-reminder-actions.ts
git -c commit.gpgsign=false commit -m "feat(reminder): angkut kelas + pesan_reminder & action simpanPesanReminder

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: UI ReminderAdmin (textarea + Simpan + pakai util)

**Files:**
- Modify: `src/app/admin/reminder/ReminderAdmin.tsx`

- [ ] **Step 1: Import util + action**

Ubah import agar menyertakan `simpanPesanReminder` & `susunPesanReminder`:
```tsx
import { tandaiReminder, simpanPesanReminder } from '@/lib/data/admin-reminder-actions';
import { susunPesanReminder } from '@/lib/domain/reminder';
```

- [ ] **Step 2: Ganti fungsi lokal `pesanReminder`**

Hapus fungsi `pesanReminder(...)` lama dan ganti pemakaiannya di dalam komponen dengan pemanggilan `susunPesanReminder`. Untuk itu, di dalam komponen tambahkan helper yang membentuk input dari sebuah baris `r` + `ev` + pesan manual saat ini:
```tsx
  function pesanWa(r: ReminderRow, ev: NonNullable<ReminderRow['event']>, pesanManual: string): string {
    return susunPesanReminder({
      nama: r.nama, judul: ev.judul, tanggal: ev.tanggal, tanggalFmt: ev.tanggal ? formatTanggal(ev.tanggal) : undefined,
      jamMulai: ev.jam_mulai, jamSelesai: ev.jam_selesai, lokasi: ev.lokasi, anakNama: r.anak_nama, kelas: r.kelas, pesanManual,
    });
  }
```

- [ ] **Step 3: State pesan per event + textarea + Simpan**

Di dalam komponen tambahkan state:
```tsx
  const [pesan, setPesan] = useState<Record<string, string>>(() => Object.fromEntries(rows.filter((r) => r.event).map((r) => [r.event!.id, r.event!.pesan_reminder ?? ''])));
  const [simpanBusy, setSimpanBusy] = useState<string | null>(null);
  async function simpanPesan(eventId: string) {
    setSimpanBusy(eventId);
    const r = await simpanPesanReminder(eventId, pesan[eventId] ?? '');
    setSimpanBusy(null);
    flash(r.ok ? 'Pesan tersimpan ✓' : (r.error ?? 'Gagal'));
  }
```

- [ ] **Step 4: Render textarea per grup event + pakai pesanWa di Kirim WA**

Di dalam `grupTampil.map(...)`, setelah baris judul event (`</div>` penutup baris `s.row` pertama), sebelum `{peserta.map(...)}`, tambahkan blok:
```tsx
            <div style={{ marginTop: 8 }}>
              <div className={s.muted} style={{ fontSize: 12, marginBottom: 4 }}>✍️ Pesan reminder (opsional) — detail event & nama anak otomatis ditambahkan</div>
              <textarea className={s.inp} rows={2} placeholder="mis. Bawa baju ganti & botol minum ya 🙏" value={pesan[ev.id] ?? ''} onChange={(e) => setPesan((p) => ({ ...p, [ev.id]: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} />
              <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => simpanPesan(ev.id)} disabled={simpanBusy === ev.id}>{simpanBusy === ev.id ? '...' : '💾 Simpan pesan'}</button>
            </div>
```

Ubah pembentukan `href` di dalam `peserta.map`:
```tsx
              const href = linkWa(r.no_wa, pesanWa(r, ev, pesan[ev.id] ?? ''));
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/reminder/ReminderAdmin.tsx
git -c commit.gpgsign=false commit -m "feat(reminder): textarea pesan manual per event + WA pakai susunPesanReminder

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Gerbang mutu + dokumentasi + push

**Files:**
- Modify: `docs/DEVELOPER-KIDZPLAYFUL.md` (+ regen HTML/PDF)

- [ ] **Step 1: Gerbang mutu penuh**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc 0; semua test PASS (termasuk reminder.test.ts); build 0.

- [ ] **Step 2: Update DEVELOPER doc**

Di seksi Reminder (atau kamus `event`) tambahkan: `event.pesan_reminder` (migrasi 0085) — pesan WA manual per event di `/admin/reminder`; util `domain/reminder.ts susunPesanReminder` (sapaan + teks pengingat sebut judul + detail event/anak/kelas + pesan manual); action `simpanPesanReminder`. Set rentang migrasi `0001..0085`. Regen HTML+PDF.

- [ ] **Step 3: Commit & push**

```bash
git add docs/DEVELOPER-KIDZPLAYFUL.md docs/DEVELOPER-KIDZPLAYFUL.html docs/DEVELOPER-KIDZPLAYFUL.pdf
git -c commit.gpgsign=false commit -m "docs: pesan WA manual per event di reminder (0085)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin master
```

---

## Verifikasi end-to-end (manual, setelah deploy + migrasi 0085)
1. Jalankan `0085_event_pesan_reminder.sql` di Supabase SQL Editor.
2. `/admin/reminder` → grup event → isi "✍️ Pesan reminder" → 💾 Simpan (toast tersimpan) → refresh → teks tetap ada (`event.pesan_reminder`).
3. Klik "💬 Kirim WA" salah satu peserta → WhatsApp terbuka berisi: `Halo Kak {nama}`, teks pengingat sebut judul, detail (📅 judul, 🗓️ tanggal+jam, 📍 lokasi, 🧒 nama anak, 🏷️ kelas bila baby/toddler), lalu pesan manual, lalu `— KidzPlayful`.
4. Event tanpa pesan manual → WA tetap valid tanpa baris manual. Event gabungan → tanpa baris Kelas.

## Catatan
- 1 pesan manual per event (dipakai semua peserta); nama ortu & nama anak per penerima.
- Teks pengingat tetap (sebut judul otomatis); kirim tetap manual per peserta.
