@echo off
title PLN Smart Trafo Launcher
color 0A

echo ========================================================
echo   PLN SMART TRAFO - SYSTEM LAUNCHER
echo ========================================================
echo.
echo [1/3] Memeriksa file sistem...

:: Cek apakah file backend ada
if not exist "backend_api.py" (
    color 0C
    echo [ERROR] File backend_api.py tidak ditemukan!
    echo Pastikan file ini ada di folder Project PLN.
    pause
    exit
)

:: Cek apakah file model ada
if not exist "model_trafo.pkl" (
    color 0E
    echo [WARNING] File model_trafo.pkl tidak ditemukan.
    echo Aplikasi akan berjalan, tapi prediksi AI mungkin error.
    echo Silakan jalankan 'train_model.py' terlebih dahulu.
    timeout /t 5
)

echo [2/3] Menyalakan Server Backend (Python)...
:: start /min artinya menjalankan di jendela baru tapi di-minimize biar tidak ganggu
start /min "PLN Backend" cmd /k "uvicorn backend_api:app --reload"

echo [3/3] Menyalakan Frontend Interface (React)...
cd frontend-pln
if exist "node_modules" (
    :: start tanpa /min biar browser kelihatan nanti
    start "PLN Frontend" cmd /c "npm run dev"
    
    :: Tunggu sebentar lalu buka browser otomatis (opsional, karena Vite biasanya buka sendiri)
    timeout /t 5 >nul
    echo.
    echo [SUKSES] Sistem telah berjalan!
    echo Silakan cek browser Anda.
    echo.
    echo Tekan tombol apa saja untuk menutup launcher ini...
    pause >nul
) else (
    color 0C
    echo [ERROR] Folder node_modules tidak ditemukan di frontend-pln.
    echo Harap jalankan 'npm install' terlebih dahulu.
    pause
)