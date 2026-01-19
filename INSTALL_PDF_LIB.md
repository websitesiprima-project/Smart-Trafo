# Instalasi Package PDF-lib

Untuk mengaktifkan fitur cetak PDF menggunakan template, Anda perlu menginstal package `pdf-lib`.

## Cara Install:

### Opsi 1: Menggunakan PowerShell dengan Bypass Execution Policy
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
cd "c:\Users\User\Documents\TUGAS_JOKA\MAGANG\tugas_akhir_magang\Smart-Trafo\frontend-pln"
npm install pdf-lib
```

### Opsi 2: Menggunakan Command Prompt (CMD)
```cmd
cd "c:\Users\User\Documents\TUGAS_JOKA\MAGANG\tugas_akhir_magang\Smart-Trafo\frontend-pln"
npm install pdf-lib
```

### Opsi 3: Manual edit package.json
Tambahkan baris berikut di bagian `dependencies` dalam file `package.json`:
```json
"pdf-lib": "^1.17.1"
```

Kemudian jalankan:
```cmd
npm install
```

## Catatan:
- Package `pdf-lib` diperlukan untuk memodifikasi template PDF
- Template PDF sudah dicopy ke folder `public/template_dga.pdf`
- Jika instalasi gagal, sistem akan fallback ke metode PDF legacy (tanpa template)
