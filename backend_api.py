from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import os
import sqlite3  # <--- Ganti dari mysql.connector ke sqlite3
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- KONFIGURASI DATABASE SQLITE ---
DB_NAME = "pln_database.db"

def init_db():
    """Fungsi untuk membuat tabel otomatis saat aplikasi nyala"""
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        # Buat tabel jika belum ada
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS riwayat_uji (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                h2 REAL,
                ch4 REAL,
                c2h2 REAL,
                c2h4 REAL,
                c2h6 REAL,
                hasil_ai TEXT,
                hasil_ieee TEXT,
                diagnosa TEXT
            )
        ''')
        conn.commit()
        conn.close()
        print(f"✅ Database SQLite siap: {DB_NAME}")
    except Exception as e:
        print(f"❌ Gagal inisialisasi DB: {e}")

# Jalankan inisialisasi saat file ini diload
init_db()

def simpan_ke_db(data_input, ai_res, ieee_res, diag):
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        sql = """
        INSERT INTO riwayat_uji (h2, ch4, c2h2, c2h4, c2h6, hasil_ai, hasil_ieee, diagnosa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        # Perhatikan: SQLite pakai tanda tanya (?), MySQL pakai (%s)
        val = (data_input.h2, data_input.ch4, data_input.c2h2, data_input.c2h4, data_input.c2h6, 
               ai_res, ieee_res, diag)
        
        cursor.execute(sql, val)
        conn.commit()
        conn.close()
        print("✅ Data tersimpan ke SQLite")
    except Exception as e:
        print(f"❌ Gagal simpan ke DB: {e}")

# --- LOAD MODEL AI ---
model_path = 'model_trafo.pkl'
model = None
if os.path.exists(model_path):
    try:
        model = joblib.load(model_path)
    except:
        pass

class TrafoInput(BaseModel):
    h2: float
    ch4: float
    c2h2: float
    c2h4: float
    c2h6: float

@app.post("/predict")
def predict(data: TrafoInput):
    # 1. Prediksi AI
    prediksi_ai = "Model Error"
    if model:
        df = pd.DataFrame([[data.h2, data.ch4, data.c2h2, data.c2h4, data.c2h6]], 
                          columns=['H2', 'CH4', 'C2H2', 'C2H4', 'C2H6'])
        prediksi_ai = model.predict(df)[0]
    
    # 2. Logika IEEE C57.104
    status_ieee = "Kondisi 1 (Normal)"
    diagnosis_ieee = "Tidak ada indikasi fault"
    
    if data.c2h2 > 35:
        status_ieee = "Kondisi 4 (Bahaya)"
        diagnosis_ieee = "Arcing (High Energy Discharge)"
    elif data.c2h4 > 50 and data.c2h4 > data.c2h2:
        status_ieee = "Kondisi 3 (Warning)"
        diagnosis_ieee = "Thermal Fault (Overheating)"
    elif data.h2 > 100:
        status_ieee = "Kondisi 2 (Perhatian)"
        diagnosis_ieee = "Corona / Partial Discharge"
    elif "Normal" in str(prediksi_ai):
        status_ieee = "Kondisi 1 (Normal)"
        diagnosis_ieee = "Operasi Aman"

    # 3. SIMPAN KE DATABASE
    simpan_ke_db(data, prediksi_ai, status_ieee, diagnosis_ieee)

    return {
        "ai_status": prediksi_ai,
        "ieee_status": status_ieee,
        "diagnosis": diagnosis_ieee
    }

# --- TAMBAHAN: API UNTUK AMBIL RIWAYAT ---
@app.get("/history")
def get_history():
    try:
        conn = sqlite3.connect(DB_NAME)
        # Agar data bisa diakses pakai nama kolom (seperti dictionary)
        conn.row_factory = sqlite3.Row 
        cursor = conn.cursor()
        
        # Ambil 50 data terbaru
        cursor.execute("SELECT * FROM riwayat_uji ORDER BY id DESC LIMIT 50")
        rows = cursor.fetchall()
        
        conn.close()
        return rows
    except Exception as e:
        print(f"Error fetch history: {e}")
        return []