# Sistem Generator LHV TKDN & BMP — BBSPJPPI (versi client-side)

Aplikasi ini men-generate dokumen **Laporan Hasil Verifikasi (LHV) TKDN & BMP** dari template Word,
dan berjalan **100% di browser** (tidak butuh server/backend Python) — sehingga bisa langsung
di-hosting gratis di **GitHub Pages**.

## Cara Deploy ke GitHub Pages

1. Buat repository baru di GitHub (bisa publik atau privat + GitHub Pro untuk Pages di repo privat).
2. Upload seluruh isi folder ini (`index.html`, `app.jsx`, `app-logic.js`, `docx-engine.js`,
   folder `templates/`, folder `assets/`) ke root repository tersebut.
3. Buka **Settings → Pages** di repo, pilih source **branch `main` / folder `root`**, simpan.
4. Setelah 1-2 menit, aplikasi bisa diakses di `https://<username>.github.io/<nama-repo>/`.
5. Bagikan link tersebut ke para verifikator — tidak perlu instalasi apa pun, cukup buka lewat browser.

Untuk mencoba di komputer sendiri dulu sebelum upload, jalankan server statis sederhana di folder ini,
misalnya `python -m http.server 8000` lalu buka `http://localhost:8000`. (Tidak bisa dibuka langsung
lewat `file://` karena browser memblokir `fetch()` ke file template pada mode tersebut.)

## Yang perlu Bapak/Ibu lengkapi

- **Logo**: `assets/logo-kemenperin.png` dan `assets/logo-bbspjppi.png` saat ini masih berupa
  placeholder sederhana. Ganti dengan logo asli (ukuran apa saja, disarankan PNG transparan).
- **Template Jasa & Gabungan**: hanya 3 template yang dilampirkan (Produksi Sendiri, Kerjasama, BMP).
  Jika ingin skema "Jasa" dan "Gabungan" juga bisa digenerate, tambahkan file
  `templates/Template_LHV_Jasa.docx` dan `templates/Template_LHV_Gabungan.docx` dengan tag Jinja
  yang sama polanya dengan 3 template yang sudah ada. Sebelum ditambahkan, memilih skema tersebut
  akan menampilkan pesan error yang jelas (bukan crash diam-diam).

## Cara Kerja (ringkas)

- **Form input** — identik dengan aplikasi React yang Bapak/Ibu buat sebelumnya (5 tab: Cover & Logo,
  Ringkasan Eksekutif, Hasil Verifikasi, Dokumen Pendukung, Lampiran).
- **Draft otomatis** — tersimpan di `localStorage` browser selagi mengisi form (seperti sebelumnya).
- **Simpan sebagai Proyek / Buka Proyek Tersimpan** — fitur baru, menyimpan proyek (termasuk semua
  file yang diunggah) ke **IndexedDB** browser, sehingga verifikator bisa mengelola beberapa berkas
  LHV sekaligus di satu perangkat, kapan saja dilanjutkan.
- **Generate Word** (`docx-engine.js`) — pengganti `docxtpl`:
  1. Membuka template `.docx` (format ZIP) dengan **JSZip**.
  2. Menggabungkan kembali tag `{{ }}` / `{% %}` yang oleh Word kadang terpecah ke beberapa elemen XML — diterapkan ke `document.xml` **maupun header/footer** (logo perusahaan di header ikut ter-render).
  3. Merender teks, perulangan (`{% for %}`), kondisi (`{% if %}`), dan filter `batch()` — persis
     sintaks Jinja2 yang dipakai template — menggunakan **nunjucks**.
  4. Menyisipkan gambar (foto produk, sertifikat, KTP, dll.) sebagai elemen gambar asli Word
     (`<w:drawing>`), lengkap dengan relasi file & ukuran (mm) — pengganti `InlineImage` docxtpl.
  5. Menyisipkan tabel rekap bahan baku sebagai tabel Word asli — pengganti fitur `subdoc` docxtpl.
  6. Menyusun ulang menjadi file `.docx` dan otomatis diunduh ke komputer verifikator.
- **Ekstraksi gambar dari PDF** (`app-logic.js`) — pengganti `pypdf`: setiap **halaman PDF** yang
  diunggah dirender menjadi 1 gambar (via **pdf.js**), lalu diperlakukan sama seperti foto biasa.
  *(Catatan desain: ini sedikit berbeda dari backend lama yang mengekstrak gambar mentah dari dalam
  PDF — pendekatan render-per-halaman ini lebih stabil dijalankan di browser dan hasilnya biasanya
  setara atau lebih rapi karena tidak bergantung pada bagaimana gambar disusun di dalam file PDF.)*

## Struktur File

```
index.html          → halaman utama, memuat semua library via CDN
app.jsx              → form React (5 tab, sama seperti aplikasi asli)
app-logic.js          → pemetaan field ⇄ context dokumen, ekstraksi PDF, penyimpanan proyek
docx-engine.js         → mesin generate .docx (pengganti docxtpl)
templates/              → 3 file template Word asli (jangan diubah namanya)
assets/                  → logo (perlu diganti dengan logo asli)
```

## Keterbatasan yang perlu diketahui

- Draft & proyek tersimpan bersifat **per-perangkat/per-browser** (tidak otomatis sinkron antar
  komputer). Jika perlu memindahkan pekerjaan ke komputer lain, gunakan skema kerja: selesaikan &
  generate di satu komputer, atau tambahkan fitur ekspor/impor proyek (JSON) di kemudian hari bila
  dibutuhkan.
- Karena semuanya berjalan di browser, file gambar/PDF yang sangat besar (puluhan MB, sangat banyak
  halaman) bisa membuat proses generate terasa lebih lambat dibanding versi backend Python — namun
  untuk pemakaian normal (foto & scan dokumen per proyek) seharusnya tetap lancar.
