# API Mobile — KidzPlayful (untuk Flutter)

REST API di Next.js Route Handlers. **Base URL:** `https://kidzplayful-fe2a.vercel.app/api` (lokal: `http://<ip-komputer>:3000/api`).

Format respons seragam:
- Sukses: `{ "ok": true, "data": <hasil> }`
- Error: `{ "ok": false, "error": "pesan" }` (HTTP 400/401/404/500)

Semua endpoint data butuh header:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Alur Auth
1. **Register** `POST /api/auth/register` → `{ email, password, nama, no_wa }` → `{ user, access_token, refresh_token, perlu_konfirmasi_email }`
2. **Login** `POST /api/auth/login` → `{ email, password }` → `{ access_token, refresh_token, expires_at, user }`
3. **Refresh** `POST /api/auth/refresh` → `{ refresh_token }` → `{ access_token, refresh_token, expires_at }` (access_token kedaluwarsa ~1 jam — panggil ini)

> Simpan `access_token` & `refresh_token` di secure storage. Kirim `access_token` di header tiap request. Bila dapat 401, panggil refresh lalu ulangi.
> Alternatif: pakai paket **`supabase_flutter`** untuk auth (kelola token & refresh otomatis), lalu ambil `access_token`-nya untuk header — endpoint di bawah tetap sama.

## Endpoint

### Akun
| Method | Path | Body | Hasil |
|---|---|---|---|
| GET | `/api/me` | — | profil + `status_langganan` |

### Anak
| GET | `/api/anak` | — | daftar anak |
| POST | `/api/anak` | `{ nama, tanggal_lahir }` (tanggal `YYYY-MM-DD`) | anak baru |
| GET | `/api/anak/{id}/catatan` | — | Catatan Perkembangan Bermain anak (rubrik `aspek` + `catatan` + `event_judul`) |

### Kelas Bermain
| GET | `/api/kelas-bermain` | — | daftar kelas aktif (`bahan`/`aktivitas` = JSON) |
| GET | `/api/kelas-bermain/{id}` | — | detail |

### Event
| GET | `/api/events` | — | daftar event tampil |
| GET | `/api/events/{id}` | — | detail event |
| POST | `/api/events/{id}/daftar` | `{ anak_ids: [..], bukti_url? }` | pendaftaran (total dihitung server = harga × jumlah anak) |

### Store
| GET | `/api/produk` | — | daftar produk tampil |
| GET | `/api/produk/{id}` | — | detail produk |
| GET | `/api/keranjang` | — | `{ items, subtotal }` |
| POST | `/api/keranjang` | `{ produk_id, qty }` | item keranjang (dibatasi stok) |
| GET | `/api/pesanan` | — | daftar pesanan |
| POST | `/api/pesanan` | `{ penerima, no_hp, alamat, catatan? }` | checkout dari keranjang → `{ id }` |
| GET | `/api/pesanan/{id}` | — | detail pesanan + item |

## Upload gambar / bukti bayar
Endpoint yang butuh `bukti_url`/gambar: **unggah dulu ke Supabase Storage** (bucket `aset`, folder `bukti/`) memakai `supabase_flutter` (`supabase.storage.from('aset').upload('bukti/xxx.jpg', file)`), ambil **public URL**, lalu kirim URL-nya ke endpoint (`bukti_url`). User hanya diizinkan menulis ke folder `bukti/` (RLS Storage).

## Contoh (Dart)
```dart
final res = await http.post(
  Uri.parse('$base/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'email': e, 'password': p}),
);
final token = jsonDecode(res.body)['data']['access_token'];

final events = await http.get(
  Uri.parse('$base/events'),
  headers: {'Authorization': 'Bearer $token'},
);
```

## Catatan
- **Keamanan:** tiap request dijalankan sebagai user pemilik token; **RLS** Supabase membatasi data (hanya milik sendiri). Total uang selalu dihitung ulang di server.
- **Produksi auth:** aktifkan **SMTP + Confirm email** di Supabase agar register aman (saat ini confirm email mungkin OFF untuk dev).
- **Belum tersedia (bisa ditambah pola sama):** favorit, riwayat kelas, komunitas, ubah/hapus keranjang, upload bukti pesanan via endpoint, endpoint admin/guru. Minta bila diperlukan.
- Kode endpoint: `src/app/api/**/route.ts`; helper auth: `src/lib/api/helpers.ts`.
