from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import numpy as np
import datetime
import os

# --- LIBRARY BARU ---
from groq import Groq
from supabase import create_client, Client
from dotenv import load_dotenv 

# LOAD FILE .ENV
load_dotenv()

app = FastAPI()

# ==========================================
# KEAMANAN 1: KONFIGURASI CORS DIPERKETAT
# ==========================================
origins = [
    "http://localhost:5173",      # Izin untuk Frontend Lokal
    "http://127.0.0.1:5173",
    # "https://nama-project-anda.vercel.app" # Buka komentar ini nanti pas deploy
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # Hanya website di atas yang bisa akses
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# KEAMANAN 2: LOAD CREDENTIALS DARI .ENV
# ==========================================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Init Clients (Dengan Error Handling)
try:
    if not GROQ_API_KEY:
        print("⚠️ Peringatan: GROQ_API_KEY tidak ditemukan di .env")
    groq_client = Groq(api_key=GROQ_API_KEY)
    groq_active = True
except Exception as e:
    print(f"Error Init Groq: {e}")
    groq_client = None
    groq_active = False

try:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase Credentials Missing in .env")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    db_active = True
except Exception as e:
    print(f"Error Supabase: {e}")
    supabase = None
    db_active = False

# Instruksi AI
system_instruction = """
Kamu adalah Volty, Asisten Ahli Diagnosa Trafo PLN.
Tugasmu: Menganalisis data gas terlarut (DGA) berdasarkan standar TERBARU IEEE C57.104-2019.
Konteks: Kamu sedang membaca formulir hasil uji laboratorium.
Aturan: Berikan kesimpulan tegas (Normal/Investigasi/Bahaya) dan saran teknis singkat untuk operator.
"""

@app.on_event("startup")
def startup_event():
    print("\n-------------------------------------------")
    print(f"   VOLTY AI - CLOUD EDITION ☁️")
    print(f"   Status: SECURE MODE (CORS Restricted)")
    print(f"   Database: Supabase (PostgreSQL)")
    print(f"   AI Engine: Groq Llama 3")
    print("-------------------------------------------\n")

# ... (SISA KODE KE BAWAH PERSIS SAMA SEPERTI SEBELUMNYA) ...
# ... (Bagian Load Model, Pydantic Models, Logic IEEE, dan Endpoints TETAP SAMA) ...
# ... Silakan paste sisa kode Anda di bawah sini ...
# (Load Model ML)
try:
    with open("model_trafo.pkl", "rb") as f:
        model_trafo = pickle.load(f)
except:
    model_trafo = None

# (Data Models)
class TrafoInput(BaseModel):
    no_dokumen: str = "-"
    merk_trafo: str = ""
    serial_number: str = ""
    level_tegangan: str = ""
    mva: str = ""
    tahun_pembuatan: str = ""
    lokasi_gi: str = ""
    nama_trafo: str = ""
    tanggal_sampling: str = ""
    suhu_sampel: float = 0
    diambil_oleh: str = ""
    h2: float
    ch4: float
    c2h2: float
    c2h4: float
    c2h6: float
    co: float
    co2: float

class ChatInput(BaseModel):
    message: str

# (Logic IEEE)
def hitung_tdcg(data: TrafoInput):
    return data.h2 + data.ch4 + data.c2h6 + data.c2h4 + data.c2h2 + data.co

def analisis_logic_ieee_2019(data: TrafoInput):
    # LIMITS IEEE C57.104-2019 (90th Percentile)
    LIMIT_H2 = 80
    LIMIT_CH4 = 90
    LIMIT_C2H6 = 90
    LIMIT_C2H4 = 50
    LIMIT_C2H2 = 1 
    LIMIT_CO = 900

    diagnosa_list = []
    status_level = 1

    if data.h2 > LIMIT_H2: diagnosa_list.append(f"H2 Tinggi ({data.h2})")
    if data.ch4 > LIMIT_CH4: diagnosa_list.append(f"CH4 Tinggi ({data.ch4})")
    if data.c2h6 > LIMIT_C2H6: diagnosa_list.append(f"C2H6 Tinggi ({data.c2h6})")
    if data.c2h4 > LIMIT_C2H4: diagnosa_list.append(f"C2H4 Tinggi ({data.c2h4})")
    if data.co > LIMIT_CO: diagnosa_list.append(f"CO Tinggi ({data.co})")

    if len(diagnosa_list) > 0: status_level = 2
    
    if data.c2h2 > LIMIT_C2H2:
        diagnosa_list.append(f"C2H2 TERDETEKSI ({data.c2h2})")
        status_level = 3 if data.c2h2 >= 5 else 2

    if data.c2h4 > (LIMIT_C2H4 * 2) or data.ch4 > (LIMIT_CH4 * 2):
        status_level = 3

    if status_level == 1:
        status_text = "Status 1 (Normal)"
        diagnosa_final = "Hasil uji dalam batas wajar IEEE 2019."
    elif status_level == 2:
        status_text = "Status 2 (Perlu Investigasi)"
        diagnosa_final = "Indikasi awal gangguan: " + ", ".join(diagnosa_list)
    else:
        status_text = "Status 3 (KRITIS)"
        diagnosa_final = "BAHAYA - Segera Lakukan Pengujian Ulang: " + ", ".join(diagnosa_list)

    return status_text, diagnosa_final, hitung_tdcg(data)

# (Endpoints)
@app.post("/chat")
def chat_with_volty(data: ChatInput):
    if not groq_active: return {"reply": "API Key Groq belum disetting."}
    try:
        chat = groq_client.chat.completions.create(
            messages=[{"role": "system", "content": system_instruction}, {"role": "user", "content": data.message}],
            model="llama-3.3-70b-versatile", temperature=0.6, max_tokens=150
        )
        return {"reply": chat.choices[0].message.content}
    except Exception as e:
        return {"reply": "Maaf, koneksi AI terputus."}

@app.post("/predict")
def predict(data: TrafoInput):
    # 1. Analisis Manual
    status_ieee, diagnosa_lengkap, nilai_tdcg = analisis_logic_ieee_2019(data)

    # 2. Prediksi ML
    input_ai = [[data.h2, data.ch4, data.c2h2, data.c2h4, data.c2h6]]
    prediksi_ml = model_trafo.predict(input_ai)[0] if model_trafo else "AI Error"
    
    # 3. Analisis Naratif Volty
    volty_analysis = "Analisis AI tidak tersedia."
    if groq_active:
        try:
            prompt = f"Data: H2={data.h2}, CH4={data.ch4}, C2H2={data.c2h2}. Status: {status_ieee}. Diagnosa: {diagnosa_lengkap}. Berikan saran teknis singkat."
            chat = groq_client.chat.completions.create(
                messages=[{"role": "system", "content": system_instruction}, {"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile", max_tokens=200
            )
            volty_analysis = chat.choices[0].message.content
        except: pass

    # 4. SIMPAN KE SUPABASE (CLOUD)
    if db_active:
        try:
            # Data Dictionary untuk Supabase
            record = {
                "no_dokumen": data.no_dokumen,
                "merk_trafo": data.merk_trafo,
                "serial_number": data.serial_number,
                "level_tegangan": data.level_tegangan,
                "mva": data.mva,
                "tahun_pembuatan": data.tahun_pembuatan,
                "lokasi_gi": data.lokasi_gi,
                "nama_trafo": data.nama_trafo,
                "tanggal_sampling": data.tanggal_sampling,
                "suhu_sampel": data.suhu_sampel,
                "diambil_oleh": data.diambil_oleh,
                "h2": data.h2, "ch4": data.ch4, "c2h2": data.c2h2, 
                "c2h4": data.c2h4, "c2h6": data.c2h6, "co": data.co, "co2": data.co2,
                "tdcg": nilai_tdcg,
                "hasil_ai": volty_analysis, # Disimpan sebagai chat naratif
                "status_ieee": status_ieee,
                "diagnosa": diagnosa_lengkap
            }
            # Insert Command
            supabase.table("riwayat_uji").insert(record).execute()
        except Exception as e:
            print(f"Gagal simpan ke Supabase: {e}")

    return {
        "status": "Sukses",
        "tdcg_value": nilai_tdcg,
        "ai_status": prediksi_ml,
        "volty_chat": volty_analysis,
        "ieee_status": status_ieee,
        "diagnosis": diagnosa_lengkap
    }

@app.get("/history")
def get_history():
    if not db_active: return []
    try:
        # Select All, Order by ID Descending (Terbaru diatas)
        response = supabase.table("riwayat_uji").select("*").order("id", desc=True).execute()
        return response.data # Supabase mengembalikan list of dict di .data
    except Exception as e:
        print(f"Error Fetch: {e}")
        return []

@app.delete("/history/{item_id}")
def delete_history(item_id: int):
    if not db_active: return {"message": "Database error"}
    try:
        supabase.table("riwayat_uji").delete().eq("id", item_id).execute()
        return {"message": "Data dihapus"}
    except Exception as e:
        return {"message": f"Gagal hapus: {e}"}