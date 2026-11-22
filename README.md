# Sistem Informasi Sekolah (SIS)

Aplikasi web sekolah: situs publik, portal siswa, portal guru, dan dasbor admin/TU.
Tanpa proses build: HTML + ES modules + Firebase Realtime Database. Bahasa antarmuka Indonesia.

## Menjalankan

Modul JavaScript tidak berjalan dari `file://`, jadi layani folder ini lewat server statis:

```bash
cd sis-sekolah
python3 -m http.server 8080      # atau: npx serve .
# buka http://localhost:8080
```

Kamera (pindai QR) hanya aktif di **HTTPS atau localhost**.

### Mode demo (default)
Selama `assets/js/config.js` belum diisi, data (seed realistis) tersimpan di `localStorage`
dan tersinkron antar-tab. Cocok untuk mencoba semua alur, termasuk absensi QR: buka
`gerbang.html` (admin) di satu tab, dan portal siswa di tab lain.
Tombol "Reset data demo" ada di Admin → Pengaturan.

| Peran | Masuk dengan | Kata sandi |
|---|---|---|
| Siswa (kelas yang sama dengan Wali Nurul) | `0051234511` | `siswa123` |
| Guru / Wali Kelas X RPL 1 (Siti) | `198503122010012005` | `guru123` |
| Guru / Wali Kelas X RPL 2 (Dewi) | `198807192015022001` | `guru123` |
| Guru / Wali Kelas XI TKJ 1 (Nurul) | `199001142018012002` | `guru123` |
| Admin / TU | `admin` | `admin123` |

Siswa lain: NISN `0051234501`–`0051234520` (5 siswa per kelas). Guru lain: lihat Admin → Pengguna.
Tombol cepat tersedia di halaman Masuk saat mode demo.

### Memakai Firebase (realtime sungguhan)
1. Buat proyek Firebase → aktifkan **Authentication → Email/Password**.
2. Buat **Realtime Database** (mis. asia-southeast1).
3. Tab *Rules*: tempel isi `database.rules.json`, Publish.
4. Project settings → tambahkan app Web → salin config ke `assets/js/config.js`
   (wajib ada `apiKey` dan `databaseURL`).
5. Buka `setup.html` → **Isi data awal** (membuat akun + seed). Setelah itu masuk dengan akun di atas.
6. Tambahkan domain hosting ke Authentication → Settings → Authorized domains.

Login memakai NISN/NIP/username yang diubah menjadi email `id@portal.sekolah.local`
(ubah di `APP.emailDomain`). Kata sandi pengguna lain diatur lewat Firebase Console.

## Struktur

```
index.html profil.html berita.html galeri.html ppdb.html kontak.html   halaman publik
login.html  gerbang.html  setup.html
siswa/  guru/  admin/                                                   portal per peran
assets/css/   base.css (token+komponen) public.css portal.css
assets/js/
  config.js            ← satu-satunya berkas yang perlu diubah untuk Firebase
  core/    db.js (adapter Firebase/demo)  auth.js  absensi.js  akademik.js
           seed.js  ui.js  icons.js  utils.js
  layout/  public.js (navbar/footer)  portal.js (sidebar/topbar)
  pages/   satu modul per halaman (beranda.js, s-*.js, g-*.js, a-*.js, ...)
assets/vendor/  jsQR (pindai) dan qrcode-generator (buat QR), disimpan lokal
database.rules.json    aturan keamanan Realtime Database
gen-html.mjs           pembuat cangkang HTML (node gen-html.mjs)
```

Menambah halaman: buat modul di `assets/js/pages/`, tambahkan satu baris di `gen-html.mjs`,
jalankan `node gen-html.mjs`, lalu tambahkan menu di `layout/portal.js` atau `layout/public.js`.

## Fitur per peran (tambahan)
- **Guru / Wali Kelas**: Dashboard (rekap hari ini, belum absen, catatan), Murid Kelas (cari, detail, catatan),
  Absensi Kelas (log scan live + input manual Hadir/Terlambat/Sakit/Izin/Alfa), Materi & Tugas, Input Nilai,
  layar kiosk gerbang. Wali hanya melihat kelas yang `kelas/{id}/wali`-nya = dirinya.
- **Admin/TU**: Pengguna, Akademik (jadwal, kelas + wali unik, jurusan, mapel, tahun ajaran aktif),
  PPDB (Diproses/Terverifikasi/Diterima/Cadangan/Ditolak + **Aktifkan jadi akun siswa**), Absensi,
  **Laporan & Ekspor** (absensi per kelas/periode, nilai, data siswa; CSV untuk Excel + cetak), Pengaturan
  (jam masuk, toleransi, durasi rotasi QR, mode uji).

## Cara kerja absensi QR dinamis
1. Guru/Admin membuka `gerbang.html` di perangkat gerbang, lalu **Mulai sesi**. Sesi (`gerbang/sesi`) berstatus
   `aktif` / `jeda` dan punya ID; **Jeda** menghentikan rotasi & menolak scan, **Reset** membuat sesi baru
   (token lama otomatis tak berlaku).
2. Selama aktif, kiosk menerbitkan token acak baru tiap *N* detik (default 20, pilih 10–60 / Pengaturan) ke
   `gerbang/token/*`. QR dibuat lewat API eksternal (`api.qrserver.com`); bila gagal dimuat, otomatis memakai
   generator lokal. Isi QR: `SISABSEN|1|{sesiId}|{tokenId}|{token}|{kedaluwarsa_ms}`. Ada hitung mundur
   dan kode cadangan 6 angka.
3. Siswa memindai (kamera, jsQR) atau mengetik kode di portal. Validasi (`core/absensi.js`): sesi aktif →
   token cocok & milik sesi itu → belum lewat `berlaku` (waktu server) → belum dipakai siswa itu → belum absen
   hari ini → hari/jam sekolah (kecuali mode uji).
4. **Hadir** bila menit ≤ jam masuk + toleransi, selain itu **Terlambat**. Penulisan atomik ke `absensi`,
   `absensi_hari/{tgl}` (berisi `kelasId`) dan `gerbang_pakai`.
5. Dashboard & Absensi Kelas wali memakai `listenBy`/`listen` pada `absensi_hari/{tgl}` sehingga scan siswa
   langsung muncul di kelas yang tepat; siswa yang ditambah Admin/PPDB langsung masuk daftar murid wali.

Catatan: pembatasan "wali hanya melihat kelasnya" diterapkan di UI; aturan Realtime Database membedakan peran
(siswa/guru/admin) tetapi tidak per kelas. Untuk isolasi ketat gunakan Cloud Functions/custom claims.
Gambar QR diminta dari layanan pihak ketiga (isinya token sementara, tidak ada data pribadi).
Catatan keamanan: aturan database mewajibkan token valid, uid sendiri, dan cap waktu ≈ sekarang.
Penentuan Hadir/Terlambat dihitung di sisi klien; untuk keamanan penuh pindahkan ke Cloud Functions.
**Mode uji coba** (Pengaturan) mengizinkan absen di akhir pekan/libur, matikan saat produksi.
Berkas PPDB dan lampiran tugas disimpan sebagai data URL terkompresi di database (cocok skala kecil;
untuk volume besar pindahkan ke Firebase Storage).
