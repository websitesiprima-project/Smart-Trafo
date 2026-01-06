from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import numpy as np
import os
from groq import Groq
from supabase import create_client, Client
from dotenv import load_dotenv 

# 1. LOAD ENVIRONMENT
load_dotenv()
app = FastAPI()

# 2. KEAMANAN CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # "https://volty-frontend.vercel.app" # Aktifkan nanti pas deploy
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. KONEKSI CLIENTS
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Init Groq (Dengan Type Hinting yang lebih aman)
groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
    except:
        groq_client = None

# Init Supabase
supabase = None
db_active = False
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        db_active = True
    except:
        supabase = None
        db_active = False

# Init Model ML
model_trafo = None
try:
    with open("model_trafo.pkl", "rb") as f: 
        model_trafo = pickle.load(f)
except: 
    model_trafo = None

# 4. DATA MODELS
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

# ==========================================
# 5. METODE ANALISIS LENGKAP (5-in-1)
# ==========================================

# A. TDCG (Total Dissolved Combustible Gas)
def hitung_tdcg(data: TrafoInput):
    return data.h2 + data.ch4 + data.c2h6 + data.c2h4 + data.c2h2 + data.co

# B. IEEE C57.104-2019 (Status Condition)
def analisis_ieee_2019(data: TrafoInput):
    LIMITS = {'h2': 80, 'ch4': 90, 'c2h6': 90, 'c2h4': 50, 'c2h2': 1, 'co': 900}
    diagnosa = []
    status = 1
    
    if data.h2 > LIMITS['h2']: diagnosa.append(f"H2 Tinggi")
    if data.ch4 > LIMITS['ch4']: diagnosa.append(f"CH4 Tinggi")
    if data.c2h6 > LIMITS['c2h6']: diagnosa.append(f"C2H6 Tinggi")
    if data.c2h4 > LIMITS['c2h4']: diagnosa.append(f"C2H4 Tinggi")
    if data.co > LIMITS['co']: diagnosa.append(f"CO Tinggi")
    
    if diagnosa: status = 2
    if data.c2h2 > LIMITS['c2h2']: 
        diagnosa.append("C2H2 Terdeteksi")
        status = 3 if data.c2h2 >= 5 else 2
    if data.c2h4 > (LIMITS['c2h4']*2) or data.ch4 > (LIMITS['ch4']*2): status = 3
    
    status_text = "Normal" if status == 1 else ("Investigasi" if status == 2 else "KRITIS")
    return status_text, ", ".join(diagnosa) if diagnosa else "Gas Normal"

# C. ROGERS RATIO (IEC 60599)
def analisis_rogers_ratio(data: TrafoInput):
    # Rasio (Handle division by zero)
    r1 = round(data.ch4 / data.h2, 2) if data.h2 > 0 else 0  # CH4/H2
    r2 = round(data.c2h2 / data.c2h4, 2) if data.c2h4 > 0 else 0 # C2H2/C2H4
    r5 = round(data.c2h4 / data.c2h6, 2) if data.c2h6 > 0 else 0 # C2H4/C2H6
    
    diagnosis = "Tidak Teridentifikasi"
    
    # Logika Rogers (Sederhana)
    if r2 < 0.1 and r1 > 0.1 and r1 < 1.0 and r5 < 1.0:
        diagnosis = "Normal"
    elif r2 < 0.1 and r1 < 0.1 and r5 < 1.0:
        diagnosis = "Partial Discharge (Corona)"
    elif r2 > 0.1 and r2 < 3.0 and r1 > 0.1 and r1 < 1.0 and r5 > 3.0:
        diagnosis = "Overheating > 700°C"
    elif r2 < 0.1 and r1 > 1.0 and r5 > 1.0 and r5 < 3.0:
        diagnosis = "Overheating 300-700°C"
    elif r2 > 0.1 and r2 < 3.0 and r1 > 1.0 and r5 > 3.0:
        diagnosis = "Arcing (Discharge Energi Tinggi)"
        
    return diagnosis, r1, r2, r5

# D. KEY GAS METHOD (DIPERBAIKI UNTUK PYLANCE)
def analisis_key_gas(data: TrafoInput):
    # Definisikan tipe dictionary agar Pylance tidak bingung
    gases = {
        "Thermal Oil (C2H4)": float(data.c2h4),
        "Thermal Cell (CO)": float(data.co),
        "Corona (H2)": float(data.h2),
        "Arcing (C2H2)": float(data.c2h2)
    }
    
    # Menggunakan lambda untuk key agar lebih eksplisit dan aman
    dominant_gas = max(gases, key=lambda k: gases[k])
    
    if gases[dominant_gas] == 0: return "Gas Kosong"
    return f"Dominan {dominant_gas}"

# ==========================================
# 6. ENDPOINTS
# ==========================================

@app.on_event("startup")
def startup():
    print("VOLTY AI READY: Rogers Ratio (Table Mode) & Key Gas Loaded ✅")

@app.post("/chat")
def chat_with_volty(data: ChatInput):
    # Cek langsung ke variable groq_client, bukan groq_active
    if not groq_client: return {"reply": "AI Offline."}
    try:
        chat = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": data.message}],
            model="llama-3.3-70b-versatile"
        )
        return {"reply": chat.choices[0].message.content}
    except: return {"reply": "Error AI Connection."}

@app.post("/predict")
def predict(data: TrafoInput):
    # 1. Jalankan Semua Metode Analisis
    tdcg = hitung_tdcg(data)
    ieee_status, ieee_note = analisis_ieee_2019(data)
    rogers_res, val_r1, val_r2, val_r5 = analisis_rogers_ratio(data)
    key_gas_res = analisis_key_gas(data)
    
    # 2. Prediksi ML
    ml_res = "Unknown"
    if model_trafo:
        try: ml_res = model_trafo.predict([[data.h2, data.ch4, data.c2h2, data.c2h4, data.c2h6]])[0]
        except: pass

    # 3. Analisis AI
    volty_chat = "AI Loading..."
    # Cek groq_client agar Pylance tahu ini tidak None
    if groq_client:
        prompt = f"""
        Data DGA: H2={data.h2}, CH4={data.ch4}, C2H2={data.c2h2}, C2H4={data.c2h4}, C2H6={data.c2h6}, CO={data.co}.
        Hasil Analisis Teknis:
        1. IEEE 2019: {ieee_status} ({ieee_note})
        2. Rogers Ratio: {rogers_res} (R1={val_r1}, R2={val_r2}, R5={val_r5})
        3. Key Gas: {key_gas_res}
        4. TDCG: {tdcg} ppm
        
        Sebagai Ahli Trafo, berikan kesimpulan diagnosa naratif singkat dan saran tindakan.
        """
        try:
            chat = groq_client.chat.completions.create(
                messages=[{"role": "system", "content": "Kamu adalah Volty, Ahli Trafo PLN."}, 
                         {"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile", max_tokens=250
            )
            volty_chat = chat.choices[0].message.content
        except: pass

    # 4. Simpan ke Supabase
    if db_active and supabase:
        try:
            record = data.dict()
            record.update({
                "tdcg": tdcg,
                "status_ieee": ieee_status,
                "diagnosa": f"Rogers: {rogers_res} | KeyGas: {key_gas_res}",
                "hasil_ai": volty_chat
            })
            supabase.table("riwayat_uji").insert(record).execute()
        except Exception as e: print(f"DB Error: {e}")

    # 5. Response
    return {
        "status": "Sukses",
        "tdcg_value": tdcg,
        "ieee_status": ieee_status,
        "rogers_diagnosis": rogers_res,
        "rogers_data": {
            "r1": val_r1,
            "r2": val_r2,
            "r5": val_r5
        },
        "key_gas": key_gas_res,
        "ai_prediction": ml_res,
        "volty_chat": volty_chat
    }

@app.get("/history")
def get_history():
    if not db_active or not supabase: return []
    try: return supabase.table("riwayat_uji").select("*").order("id", desc=True).execute().data
    except: return []

@app.delete("/history/{item_id}")
def delete_history(item_id: int):
    if db_active and supabase: 
        supabase.table("riwayat_uji").delete().eq("id", item_id).execute()
    return {"msg": "Deleted"}