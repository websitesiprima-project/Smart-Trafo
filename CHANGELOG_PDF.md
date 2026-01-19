# Changelog - Fitur Cetak PDF dengan Template

## Perubahan yang Dilakukan:

### 1. ✅ Hapus Fitur Upload Excel
- File `ExcelImporter.jsx` tidak lagi digunakan di `HistoryPage.jsx`
- Import dan komponen `<ExcelImporter />` telah dihapus
- Fitur upload Excel sekarang tidak aktif

### 2. ✅ Tambah Tombol Cetak PDF per Item
- Setiap baris data di halaman History sekarang memiliki tombol cetak PDF (ikon Download hijau)
- Pengguna dapat memilih 1 riwayat data untuk dicetak
- Tombol cetak global telah dihapus

### 3. ✅ Modifikasi PDFGenerator.js
- Fungsi baru: `generatePDFFromTemplate(data)` 
- Menggunakan template PDF (`template_dga.pdf`) sebagai basis
- Library `pdf-lib` digunakan untuk mengisi data ke template
- Fallback ke metode legacy jika template tidak ditemukan atau terjadi error

### 4. ✅ Copy Template PDF ke Folder Public
- File `template_dga.pdf` telah dicopy dari root ke `frontend-pln/public/`
- Template dapat diakses oleh aplikasi melalui URL `/template_dga.pdf`

## Cara Menggunakan:

1. Install package `pdf-lib` (lihat `INSTALL_PDF_LIB.md`)
2. Jalankan aplikasi dengan `npm run dev`
3. Buka halaman History
4. Klik ikon Download (hijau) pada data yang ingin dicetak
5. PDF akan otomatis ter-download dengan format template yang telah ditentukan

## Koordinat Template PDF yang Perlu Disesuaikan:

File: `frontend-pln/src/utils/PDFGenerator.js`

Sesuaikan koordinat (x, y) pada fungsi `drawText()` dengan posisi field di template PDF Anda:
- Nama Trafo: x=150, y=700
- Lokasi GI: x=150, y=680
- Tanggal Sampling: x=150, y=660
- Data Gas (H2, CH4, dst): dimulai dari y=600 dengan jarak 20px
- TDCG: x=150, y=450
- Status IEEE: x=150, y=420
- Diagnosis: x=50, y=350

**PENTING**: Buka template PDF Anda dan sesuaikan koordinat ini agar data tercetak pada posisi yang tepat.

## Struktur File yang Berubah:

```
Smart-Trafo/
├── frontend-pln/
│   ├── public/
│   │   └── template_dga.pdf          ← Template PDF (baru)
│   ├── src/
│   │   ├── components/
│   │   │   └── HistoryPage.jsx       ← Dihapus ExcelImporter, tambah tombol cetak
│   │   └── utils/
│   │       └── PDFGenerator.js       ← Ditambah fungsi template PDF
│   └── package.json                  ← Perlu tambah pdf-lib
├── INSTALL_PDF_LIB.md                ← Instruksi instalasi (baru)
└── CHANGELOG_PDF.md                  ← File ini (baru)
```

## Troubleshooting:

**Error: Cannot find module 'pdf-lib'**
- Solusi: Install package dengan `npm install pdf-lib`

**Template PDF tidak ditemukan (404)**
- Pastikan file `template_dga.pdf` ada di folder `frontend-pln/public/`
- Sistem akan fallback ke PDF legacy jika template tidak ditemukan

**Data tidak muncul di PDF atau posisi salah**
- Sesuaikan koordinat (x, y) di file `PDFGenerator.js`
- Gunakan PDF viewer untuk melihat koordinat yang tepat di template Anda
