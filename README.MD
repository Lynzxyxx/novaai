# Nova AI Chat

Website chat AI mirip ChatGPT, dibangun dengan Next.js 14 (App Router) + Tailwind CSS.

Fitur:
- Halaman **Login** & **Daftar** yang menarik, mendukung login manual (email/password) dan **Google Sign-In**.
- Halaman **Chat** mirip ChatGPT: sidebar riwayat percakapan, bubble chat, indikator "sedang mengetik".
- **Panel Admin** (`/admin`, khusus role admin):
  - Ganti nama AI.
  - Ganti jawaban saat AI ditanya **"siapa namamu?"** dan **"siapa pembuatmu?"**.
  - Atur system prompt tambahan.
  - Atur **batas pesan harian** per user (bisa per-user atau default untuk user baru).
  - Ubah peran user (user/admin).
- API key AI **tidak ditulis di kode** — disimpan lewat Environment Variables, aman untuk deploy ke Vercel.

## 1. Jalankan di lokal

```bash
npm install
cp .env.example .env.local
# lalu isi .env.local sesuai kebutuhan (lihat bagian "Environment Variables" di bawah)
npm run dev
```

Buka http://localhost:3000

## 2. Environment Variables

Isi semua ini di **Vercel → Project Settings → Environment Variables** (atau `.env.local` saat di lokal):

| Variable | Wajib? | Keterangan |
|---|---|---|
| `NEXTAUTH_URL` | Ya | URL website kamu, contoh `https://nama-projek.vercel.app` (di lokal: `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Ya | String acak panjang, buat dengan `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Opsional | Untuk tombol "Login dengan Google" |
| `GOOGLE_CLIENT_SECRET` | Opsional | Pasangan dari client ID di atas |
| `ADMIN_EMAIL` | Ya | Email yang otomatis dijadikan admin saat pertama kali daftar/login |
| `CHAT_API_BASE_URL` | Ya | Base URL API AI kamu, contoh: `https://bandelbanget.xyz/v1` |
| `CHAT_API_KEY` | Ya | API key dari provider AI kamu (JANGAN ditulis di kode, hanya di sini) |
| `CHAT_MODEL` | Ya | Nama model, contoh `qwen-plus` (sesuaikan dengan model yang didukung provider kamu) |
| `DEFAULT_DAILY_LIMIT` | Opsional | Batas pesan harian default untuk user baru, default `50` |
| `FIREBASE_PROJECT_ID` | Ya | Dari Firebase service account |
| `FIREBASE_CLIENT_EMAIL` | Ya | Dari Firebase service account |
| `FIREBASE_PRIVATE_KEY` | Ya | Dari Firebase service account (jaga formatnya, lihat catatan di bawah) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` dst. | Ya | Config web app Firebase, dipakai browser untuk fitur realtime |

### Cara membuat Google OAuth Client ID (untuk login Google)
1. Buka https://console.cloud.google.com/apis/credentials
2. Buat **OAuth client ID** → jenis **Web application**
3. Authorized redirect URI, isi:
   - `http://localhost:3000/api/auth/callback/google` (untuk lokal)
   - `https://domain-kamu.vercel.app/api/auth/callback/google` (untuk production)
4. Copy **Client ID** dan **Client Secret** ke Environment Variables di atas.

Jika `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` tidak diisi, tombol "Login dengan Google" otomatis tidak muncul, dan login manual tetap berfungsi normal.

### Cara setup Firebase (database + realtime)

1. Buka https://console.firebase.google.com -> buat project baru (gratis, paket Spark cukup).
2. Aktifkan **Firestore Database** (mode production).
3. Aktifkan **Authentication** (klik "Get started" saja, tidak perlu aktifkan provider apa pun — aplikasi ini login ke Firebase Auth lewat custom token, bukan lewat provider biasa).
4. Ambil kredensial **server** (untuk baca/tulis data dari API route):
   - Project settings ⚙️ -> **Service accounts** -> **Generate new private key** -> file JSON ke-download.
   - Isi `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, dan `FIREBASE_PRIVATE_KEY` dari isi file JSON tersebut.
   - Untuk `FIREBASE_PRIVATE_KEY`: copy nilai `private_key` apa adanya (termasuk `\n` di dalamnya), taruh di antara tanda kutip.
5. Ambil kredensial **web app** (untuk fitur realtime di browser):
   - Project settings ⚙️ -> **General** -> scroll ke "Your apps" -> tambah **Web app** (ikon `</>`).
   - Copy semua nilai `firebaseConfig` ke variabel `NEXT_PUBLIC_FIREBASE_*`.
6. Terapkan **security rules**: buka Firestore Database -> tab **Rules**, copy-paste isi file `firestore.rules` dari project ini, lalu **Publish**.

## 3. Deploy ke Vercel

1. Push folder ini ke repository GitHub kamu.
2. Buka https://vercel.com/new, import repo tersebut.
3. Saat proses import, isi semua **Environment Variables** di atas.
4. Klik **Deploy**.
5. Setelah selesai, update `NEXTAUTH_URL` dengan domain Vercel kamu, lalu redeploy.

## 4. Cara kerja pembatasan (limit) & jawaban custom

- Setiap kali user login/daftar, akun otomatis dibuat dengan batas pesan harian = `DEFAULT_DAILY_LIMIT` (bisa diubah admin kapan saja lewat `/admin`).
- Kalau admin set batas ke `-1`, artinya user tersebut **tidak dibatasi**.
- Saat user bertanya sesuatu yang cocok dengan pola "siapa pembuatmu" atau "siapa namamu" (Indonesia & Inggris), sistem akan **langsung menjawab dari pengaturan admin** tanpa memanggil API AI, supaya jawabannya selalu konsisten. Pertanyaan lain tetap diteruskan ke API AI, dengan instruksi identitas tersebut disisipkan otomatis sebagai system prompt.

## 5. Database & fitur realtime (Firebase Firestore)

Semua data (akun user, limit, pengaturan AI) disimpan di **Firestore**:
- Koleksi `users` — 1 dokumen per user, ID dokumen = email (huruf kecil).
- Koleksi `settings`, dokumen `app` — nama AI, jawaban identitas, system prompt, limit default.

Penulisan data (daftar akun, kirim chat, ubah pengaturan/limit dari admin) selalu lewat API route di server memakai **Firebase Admin SDK**, jadi tetap aman meski Firestore rules membatasi penulisan langsung dari browser.

**Fitur realtime**: halaman `/admin` login ke Firebase Auth pakai *custom token* (dibuat oleh `/api/firebase-token`, berisi klaim `role` dari sesi NextAuth kamu), lalu berlangganan koleksi `users` dengan `onSnapshot`. Efeknya, tabel pengguna di panel admin **otomatis ter-update seketika** — misalnya saat ada user lain sedang chat dan angka "pakai hari ini" bertambah — tanpa perlu refresh halaman. Indikator titik hijau "Realtime aktif" di panel admin menandakan koneksi ini berhasil.

## 6. Struktur folder

```
app/
  login/          -> halaman login
  register/       -> halaman daftar
  chat/           -> halaman chat utama
  admin/          -> panel admin (realtime lewat Firestore onSnapshot)
  api/
    auth/[...nextauth]/  -> NextAuth (Google + credentials)
    register/            -> daftar akun manual
    chat/                -> panggil API AI + cek limit
    admin/settings/      -> baca/ubah identitas & jawaban AI
    admin/users/         -> baca/ubah limit & role user
    firebase-token/      -> buat custom token Firebase untuk realtime
lib/
  auth.ts           -> konfigurasi NextAuth
  firebaseAdmin.ts  -> Firebase Admin SDK (server, baca/tulis Firestore)
  firebaseClient.ts -> Firebase Client SDK (browser, khusus realtime)
  types.ts          -> tipe data
firestore.rules -> security rules Firestore (terapkan di Firebase Console)
```
