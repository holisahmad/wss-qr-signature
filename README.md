# WSS QR Signature

Sistem penerbitan dan verifikasi dokumen resmi berbasis QR Code untuk **Waroeng Spesial Sambal SS**.

Admin menerbitkan dokumen (SK, Surat Tugas, Sertifikat, dll.), sistem menghasilkan QR code unik dan blok tanda tangan PNG siap cetak. Siapapun dapat memindai QR untuk memverifikasi keabsahan dokumen tanpa perlu akun.

---

## Daftar Isi

- [Untuk Pengguna (User Guide)](#untuk-pengguna)
- [Untuk Developer](#untuk-developer)
  - [Prasyarat](#prasyarat)
  - [Setup Lokal](#setup-lokal)
  - [Variabel Lingkungan](#variabel-lingkungan)
  - [Skrip yang Tersedia](#skrip-yang-tersedia)
  - [Struktur Folder](#struktur-folder)
  - [Arsitektur](#arsitektur)
  - [Database](#database)
  - [Deployment ke Produksi](#deployment-ke-produksi)
  - [Menambah Fitur Baru](#menambah-fitur-baru)
- [Keamanan](#keamanan)
- [Lisensi](#lisensi)

---

## Untuk Pengguna

### Cara Mengakses Admin

1. Buka browser, masuk ke URL aplikasi (contoh: `https://qr.waroengss.com`)
2. Anda akan diarahkan otomatis ke halaman login
3. Masukkan email dan password admin

### Menerbitkan Dokumen Baru

1. Klik **"New Issuance"** di sidebar atau tombol di dashboard
2. Isi semua kolom yang wajib (bertanda \*):
   - Judul dokumen, nomor dokumen, jenis dokumen
   - Tanggal dokumen dan tanggal penerbitan
   - Pilih organisasi, unit, dan penanda tangan
3. Klik **"Save as Draft"** — dokumen tersimpan sebagai draf
4. Di halaman detail dokumen, klik **"Issue Document"** untuk menerbitkan
5. Sistem otomatis membuat QR Code dan blok tanda tangan PNG
6. Unduh PNG, salin URL verifikasi, atau cetak langsung

### Status Dokumen

| Status | Arti |
|--------|------|
| **Draft** | Tersimpan, belum diterbitkan |
| **Issued** | Aktif, QR dapat dipindai |
| **Revoked** | Dicabut, QR tetap bisa dipindai namun menampilkan status dicabut |
| **Expired** | Kedaluwarsa (jika tanggal kedaluwarsa diatur) |

### Mencabut (Revoke) Dokumen

1. Buka halaman detail dokumen yang statusnya **Issued**
2. Klik tombol **"Revoke"** (merah)
3. Isi alasan pencabutan (wajib, minimal 10 karakter)
4. Konfirmasi — dokumen berubah status menjadi Revoked
5. Data tetap tersimpan, tidak terhapus

### Verifikasi Dokumen (Tanpa Akun)

Siapapun yang memindai QR Code akan dibawa ke halaman verifikasi publik yang menampilkan:
- Status dokumen (Issued / Revoked / Expired)
- Judul, nomor, dan jenis dokumen
- Nama penanda tangan dan jabatan
- Unit organisasi
- Disclaimer: *"Halaman ini memverifikasi catatan penerbitan saja, bukan integritas file dokumen itu sendiri."*

### Manajemen Signer

1. Buka menu **"Signers"** di sidebar
2. Tambah signer baru dengan nama lengkap, jabatan, dan unit organisasi
3. Edit data signer yang sudah ada
4. Nonaktifkan signer — signer yang sudah terhubung ke dokumen akan dinonaktifkan (soft delete), tidak dihapus permanen

### Audit Log

1. Buka menu **"Audit Log"** di sidebar
2. Lihat semua aktivitas: login, logout, pembuatan, penerbitan, pencabutan dokumen, perubahan signer
3. Log disimpan selama 60 hari
4. Gunakan tombol **"Run Cleanup"** untuk menghapus log yang sudah lebih dari 60 hari secara manual

---

## Untuk Developer

### Prasyarat

- **Node.js** v20 atau lebih baru — cek: `node -v`
- **npm** v10 atau lebih baru — cek: `npm -v`
- Git

### Setup Lokal

```bash
# 1. Clone repositori
git clone https://github.com/holisahmad/wss-qr-signature.git
cd wss-qr-signature

# 2. Install dependensi
npm install

# 3. Salin file environment dan isi nilainya
cp .env.example .env
# Edit .env — lihat bagian "Variabel Lingkungan" di bawah

# 4. Buat folder uploads
mkdir -p uploads/logos uploads/assets

# 5. Jalankan migrasi database
npx prisma migrate dev

# 6. Isi data awal (seed)
npx prisma db seed

# 7. Jalankan server development
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — akan redirect otomatis ke `/admin`.

**Login seed:**
- Email: `admin@example.com`
- Password: `Admin1234!`

> ⚠️ **Ganti password dan `NEXTAUTH_SECRET` sebelum deploy ke produksi.**

### Variabel Lingkungan

Semua variabel ada di `.env.example`. Salin ke `.env` dan isi:

| Variabel | Wajib | Keterangan | Contoh |
|----------|-------|------------|--------|
| `NEXTAUTH_SECRET` | ✅ | Secret untuk JWT. Generate: `openssl rand -base64 32` | `abc123...` |
| `DATABASE_URL` | ✅ | Path SQLite (dev) atau connection string PostgreSQL (prod) | `file:./dev.db` |
| `NEXTAUTH_URL` | ✅ | URL canonical aplikasi, digunakan NextAuth untuk callback | `http://localhost:3000` |
| `BASE_URL` | ✅ | URL publik untuk QR Code (URL verifikasi yang di-embed di QR) | `https://qr.waroengss.com` |
| `UPLOAD_DIR` | ✅ | Path absolut folder penyimpanan logo dan aset PNG yang dihasilkan | `/var/wss/uploads` |

> **Dev vs Prod:** `DATABASE_URL=file:./dev.db` untuk lokal. Di produksi ganti ke PostgreSQL:
> `postgresql://user:password@host:5432/dbname?schema=public`

### Skrip yang Tersedia

```bash
npm run dev          # Development server (http://localhost:3000)
npm run build        # Build produksi
npm run start        # Jalankan build produksi
npm run typecheck    # TypeScript type checking (tanpa emit)
npm run lint         # ESLint
npm run test         # Vitest — semua test (single run)
npm run test:coverage # Test + laporan coverage
```

### Struktur Folder

```
wss-qr-signature/
├── docs/                        # Dokumentasi teknis lengkap
│   ├── ARCHITECTURE.md          # Arsitektur aplikasi
│   ├── API_SPEC.md              # Spesifikasi semua endpoint API
│   ├── DATABASE_SCHEMA.md       # Skema database dan relasi
│   ├── DESIGN_SYSTEM.md         # Design system dan token warna
│   ├── SECURITY.md              # Kebijakan keamanan
│   └── ...
├── prisma/
│   ├── schema.prisma            # Skema database Prisma
│   ├── migrations/              # Riwayat migrasi database
│   └── seed.ts                  # Data awal untuk development
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── admin/               # Halaman admin (butuh login)
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── issuances/       # CRUD dokumen
│   │   │   ├── signers/         # Manajemen signer
│   │   │   ├── audit/           # Audit log viewer
│   │   │   └── settings/        # Pengaturan organisasi & logo
│   │   ├── sign-in/             # Halaman login
│   │   ├── verify/[ref]/        # Halaman verifikasi publik
│   │   └── api/                 # Route handlers (API endpoints)
│   ├── components/
│   │   ├── ui/                  # Komponen UI yang dapat digunakan ulang
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Dialog.tsx
│   │   │   └── ...
│   │   └── layout/
│   │       └── AdminLayout.tsx  # Layout sidebar admin
│   ├── lib/
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── auth-utils.ts        # Helper autentikasi (requireAdmin)
│   │   ├── audit.ts             # Append-only audit log writer
│   │   ├── qr-generator.ts      # Generate QR PNG dengan logo
│   │   ├── signature-block-generator.ts  # Generate blok tanda tangan 800×200px
│   │   ├── issuance-state-machine.ts     # State machine dokumen
│   │   ├── rate-limit.ts        # In-memory rate limiter
│   │   ├── api-response.ts      # Helper response JSON konsisten
│   │   └── schemas/             # Zod validation schemas
│   ├── auth.ts                  # Konfigurasi NextAuth v5
│   ├── proxy.ts                 # Middleware proteksi route admin
│   └── types/                   # TypeScript type definitions
├── uploads/                     # File logo & PNG (tidak di-commit)
│   ├── logos/
│   └── assets/
├── .env.example                 # Template variabel lingkungan
└── README.md
```

### Arsitektur

Aplikasi adalah **Next.js 16 App Router** dengan pendekatan:

- **Server Components** untuk semua halaman admin — data di-fetch langsung di server, tidak perlu API call terpisah dari client
- **Client Components** hanya untuk interaksi UI (form, filter, dialog)
- **Route Handlers** (`/api/*`) sebagai API endpoints yang diakses oleh client components
- **Prisma ORM** dengan SQLite di development, siap upgrade ke PostgreSQL di produksi

**Alur penerbitan dokumen:**
```
Admin isi form → POST /api/issuances (buat DRAFT)
→ POST /api/issuances/[id]/issue
  → generateQR() → PNG buffer
  → generateSignatureBlock() → PNG buffer
  → Simpan file ke UPLOAD_DIR
  → Update status ke ISSUED
  → Tulis AuditEvent
→ Admin download PNG / salin URL
→ Siapapun pindai QR → GET /verify/[ref] → tampilkan data publik
```

Lihat [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) untuk detail lengkap.

### Database

Skema menggunakan 8 entitas utama: `User`, `Organization`, `OrganizationalUnit`, `Signer`, `DocumentIssuance`, `GeneratedAsset`, `IssuanceStatusHistory`, `AuditEvent`.

```bash
# Lihat data via GUI
npx prisma studio

# Buat migrasi baru setelah mengubah schema.prisma
npx prisma migrate dev --name nama-perubahan

# Reset database (hapus semua data, ulang migrasi + seed)
npx prisma migrate reset

# Regenerate Prisma client setelah ubah schema
npx prisma generate
```

> **Catatan:** `AuditEvent` adalah append-only — tidak ada UPDATE atau DELETE. Log audit tidak boleh dimodifikasi.

### Testing

```bash
npm run test             # Jalankan semua test (53 test)
npm run test:coverage    # + laporan coverage
```

Test ada di `src/**/__tests__/` dan `src/lib/__tests__/`. Mencakup:
- QR generation dan decode validasi
- Signature block generation
- State machine transitions
- API route integration (dengan mock Prisma)
- Authorization dan rate limiting
- Archive search/filter

### Deployment ke Produksi

**Ganti ke PostgreSQL:**

1. Edit `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` ke connection string PostgreSQL di `.env` produksi
3. Jalankan `npx prisma migrate deploy` (bukan `migrate dev`)

**Environment produksi yang wajib diubah:**
- `NEXTAUTH_SECRET` — generate baru: `openssl rand -base64 32`
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL` — URL domain produksi
- `BASE_URL` — URL domain produksi (sama dengan NEXTAUTH_URL atau subdomain)
- `UPLOAD_DIR` — path absolut di server produksi, pastikan writable

**Build dan start:**
```bash
npm run build
npm run start
```

**Pastikan folder uploads ada dan writable di server:**
```bash
mkdir -p /var/wss/uploads/logos /var/wss/uploads/assets
chown -R www-data:www-data /var/wss/uploads  # sesuaikan user
```

### Menambah Fitur Baru

Ikuti pola yang sudah ada:

1. **Tambah entitas baru** → edit `prisma/schema.prisma` → `npx prisma migrate dev --name nama`
2. **Tambah API endpoint** → buat file di `src/app/api/[nama]/route.ts`
   - Gunakan `requireAdmin()` untuk endpoint yang butuh auth
   - Validasi input dengan Zod (lihat `src/lib/schemas/` untuk contoh)
   - Kembalikan response dengan `apiSuccess()` / `apiError()` dari `src/lib/api-response.ts`
   - Tulis audit event dengan `writeAuditEvent()` dari `src/lib/audit.ts`
3. **Tambah halaman admin** → buat folder di `src/app/admin/[nama]/`
   - `page.tsx` → server component, gunakan `export const instant = false`
   - Gunakan komponen dari `src/components/ui/` (Button, Input, DataTable, dll.)
   - Warna menggunakan nilai hex langsung, bukan CSS variable (misal `bg-[#1e3a5f]`)
4. **Tambah nav item** → edit `src/components/layout/AdminLayout.tsx`, tambah ke array `NAV_ITEMS`
5. **Tulis test** → buat file di `src/__tests__/` atau dekat file yang diuji

---

## Keamanan

- Password di-hash dengan bcryptjs (12 rounds)
- JWT session — tidak ada session di database
- Semua endpoint admin memerlukan role ADMIN
- Public endpoint (`/verify/[ref]`) rate-limited 20 req/menit per IP
- File upload divalidasi MIME type di server, max 2MB
- Field sensitif (`adminNotes`, `passwordHash`, email admin) tidak pernah dikembalikan di response publik
- Audit log mencatat semua aksi penting, disimpan 60 hari

Lihat [docs/SECURITY.md](docs/SECURITY.md) untuk detail.

---

## Lisensi

MIT — lihat [LICENSE](LICENSE) untuk detail.
