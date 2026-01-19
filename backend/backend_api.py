from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib  # <--- SUDAH DIGANTI (PENTING)
import numpy as np
import os
import sys
from groq import Groq
from supabase import create_client, Client
from dotenv import load_dotenv 

# 1. LOAD ENVIRONMENT
load_dotenv()
app = FastAPI(title="Volty AI Backend - Ultimate Version")

# 2. KEAMANAN CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://volty-frontend.vercel.app"
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
VITE_SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
VITE_SUPABASE_KEY = os.getenv("VITE_SUPABASE_KEY")

# Init Groq
groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("✅ Groq Client Connected")
    except Exception as e:
        print(f"❌ Groq Error: {e}")

# Init Supabase
supabase = None
db_active = False
if VITE_SUPABASE_URL and VITE_SUPABASE_KEY:
    try:
        supabase = create_client(VITE_SUPABASE_URL, VITE_SUPABASE_KEY)
        db_active = True
        print("✅ Supabase Connected")
    except Exception as e:
        print(f"❌ Supabase Error: {e}")

# ==========================================
# 4. INIT MODEL ML (BAGIAN PERBAIKAN UTAMA)
# ==========================================
model_trafo = None
try:
    # Menggunakan Absolute Path agar file pasti ditemukan dimanapun terminal dibuka
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "smart_dga_model.pkl")
    
    # Cek apakah file ada
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"File tidak ditemukan di path: {model_path}")

    # LOAD MENGGUNAKAN JOBLIB (Bukan Pickle)
    model_trafo = joblib.load(model_path)
    print("✅ ML Model Loaded (via Joblib)")
    
except Exception as e: 
    print(f"❌ ERROR LOADING MODEL: {str(e)}")
    print("⚠️ System running without ML prediction.")


# 5. DATA MODELS
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
    context: str = "" 

# ==========================================
# 6. METODE ANALISIS TEKNIS
# ==========================================

def hitung_tdcg(data: TrafoInput):
    return data.h2 + data.ch4 + data.c2h6 + data.c2h4 + data.c2h2 + data.co

def analisis_ratio_co2_co(data: TrafoInput):
    if data.co == 0: return "Tidak Dapat Dihitung (CO=0)", 0
    ratio = round(data.co2 / data.co, 2)
    
    if ratio < 3:
        status = "Indikasi Fault Kertas (Carbonization)"
    elif 3 <= ratio <= 10:
        status = "Kertas Normal"
    else:
        status = "Degradasi Termal Ringan (<150°C)"
        
    return status, ratio

def analisis_duval_triangle_1(data: TrafoInput):
    total = data.ch4 + data.c2h4 + data.c2h2
    if total == 0:
        return "Gas Kosong (Total 0)", 0, 0, 0

    pct_ch4 = round((data.ch4 / total) * 100, 1)
    pct_c2h4 = round((data.c2h4 / total) * 100, 1)
    pct_c2h2 = round((data.c2h2 / total) * 100, 1)

    diagnosa = "Tidak Teridentifikasi"

    # Logika Zone Duval Triangle 1 (Standard IEEE/IEC)
    if pct_c2h2 >= 98:
        diagnosa = "PD: Partial Discharge"
    elif pct_c2h2 >= 87 and pct_c2h2 < 98 and pct_ch4 < 13:
         diagnosa = "PD: Partial Discharge"
    elif pct_c2h2 > 13 and pct_c2h4 >= 23:
        diagnosa = "D2: Discharge of High Energy (Arcing)"
    elif pct_c2h2 > 13 and pct_c2h4 < 23:
         diagnosa = "D1: Discharge of Low Energy (Sparking)"
    elif pct_c2h2 < 13 and pct_c2h2 > 0 and pct_c2h4 >= 23 and pct_c2h4 < 50:
         diagnosa = "D2: Discharge of High Energy"
    elif pct_c2h4 >= 50:
        diagnosa = "T3: Thermal Fault > 700°C"
    elif pct_c2h4 >= 20 and pct_c2h4 < 50 and pct_c2h2 < 4:
        diagnosa = "T2: Thermal Fault 300-700°C"
    elif pct_ch4 >= 50 and pct_c2h4 < 20 and pct_c2h2 < 4:
         diagnosa = "T1: Thermal Fault < 300°C"
    elif pct_c2h2 < 2 and pct_c2h4 < 2:
         diagnosa = "T1: Thermal Fault < 300°C" 
    else:
        diagnosa = "DT: Campuran (Thermal & Electrical)"

    return diagnosa, pct_ch4, pct_c2h4, pct_c2h2

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
        diagnosa.append(f"C2H2 Terdeteksi")
        status = 3 if data.c2h2 >= 5 else 2 
        
    if data.c2h4 > (LIMITS['c2h4']*2) or data.ch4 > (LIMITS['ch4']*2): 
        status = 3
    
    status_text = "Normal" if status == 1 else ("Waspada (Cond 2)" if status == 2 else "KRITIS (Cond 3)")
    return status_text, ", ".join(diagnosa) if diagnosa else "Parameter Gas Normal"

def analisis_rogers_ratio(data: TrafoInput):
    r1 = round(data.ch4 / data.h2, 2) if data.h2 > 0 else 0
    r2 = round(data.c2h2 / data.c2h4, 2) if data.c2h4 > 0 else 0
    r5 = round(data.c2h4 / data.c2h6, 2) if data.c2h6 > 0 else 0
    
    diagnosis = "Tidak Teridentifikasi"
    if r2 < 0.1 and r1 > 0.1 and r1 < 1.0 and r5 < 1.0: diagnosis = "Normal"
    elif r2 < 0.1 and r1 < 0.1 and r5 < 1.0: diagnosis = "Partial Discharge (Corona)"
    elif r2 > 0.1 and r2 < 3.0 and r1 > 0.1 and r1 < 1.0 and r5 > 3.0: diagnosis = "Overheating > 700°C"
    elif r2 < 0.1 and r1 > 1.0 and r5 > 1.0 and r5 < 3.0: diagnosis = "Overheating 300-700°C"
    elif r2 > 0.1 and r2 < 3.0 and r1 > 1.0 and r5 > 3.0: diagnosis = "Arcing (Discharge Energi Tinggi)"
        
    return diagnosis, r1, r2, r5

def analisis_key_gas(data: TrafoInput):
    gases = {
        "Overheating Minyak (C2H4)": float(data.c2h4),
        "Overheating Kertas (CO)": float(data.co),
        "Corona (H2)": float(data.h2),
        "Arcing (C2H2)": float(data.c2h2)
    }
    dominant_gas = max(gases, key=lambda k: gases[k])
    if gases[dominant_gas] == 0: return "Tidak Ada Gas Dominan"
    return f"Dominan {dominant_gas}"

# ==========================================
# 7. ENDPOINTS
# ==========================================

@app.post("/chat")
def chat_with_volty(data: ChatInput):
    if not groq_client: return {"reply": "Maaf, koneksi AI sedang offline."}
    
    system_msg = "Anda adalah Volty, asisten teknis PLN. Jawab singkat, padat, dan teknis."
    user_msg = data.message
    
    if data.context:
        system_msg += f"\n\nKONTEKS DATA TRAFO SAAT INI:\n{data.context}"
        
    try:
        chat = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ],
            model="llama-3.3-70b-versatile",
            max_tokens=400
        )
        return {"reply": chat.choices[0].message.content}
    except Exception as e:
        return {"reply": f"Error AI: {str(e)}"}

@app.post("/predict")
def predict(data: TrafoInput):
    # 1. Jalankan Analisis Lengkap
    tdcg = hitung_tdcg(data)
    ieee_status, ieee_note = analisis_ieee_2019(data)
    rogers_res, val_r1, val_r2, val_r5 = analisis_rogers_ratio(data)
    key_gas_res = analisis_key_gas(data)
    duval_res, pct_ch4, pct_c2h4, pct_c2h2 = analisis_duval_triangle_1(data)
    paper_status, paper_ratio = analisis_ratio_co2_co(data)
    
    # 2. Prediksi Machine Learning (Dengan Safety Check)
    ml_res = "ML Not Active"
    if model_trafo:
        try:
            # Pastikan urutan fitur sama dengan saat training!
            # [H2, CH4, C2H2, C2H4, C2H6] <- Default urutan DGA
            features = np.array([[data.h2, data.ch4, data.c2h2, data.c2h4, data.c2h6]])
            ml_res = model_trafo.predict(features)[0]
        except Exception as e:
            print(f"ML Predict Error: {e}")
            ml_res = "Error Prediction"

    # 3. Analisis AI (Groq)
    volty_chat = "AI sedang menganalisis..."
    if groq_client:
        system_prompt = """
        You are a Senior High Voltage Transformer Specialist.
        RULES:
        1. IF Acetylene (C2H2) > 5 ppm, DIAGNOSE "ARCING" AS MAIN THREAT.
        2. IF TDCG > 720, Status is CRITICAL.
        3. Response in Indonesian. Use Markdown.
        
        OUTPUT FORMAT:
        **Diagnosis Utama**: [Fault & Status]
        **Analisis Gas**: [Logic summary]
        **Rekomendasi Aksi**: [3-4 actionable bullets]
        """
        
        user_prompt = f"""
        Data DGA: H2={data.h2}, CH4={data.ch4}, C2H2={data.c2h2}, C2H4={data.c2h4}, C2H6={data.c2h6}, CO={data.co}, CO2={data.co2}.
        
        Hasil Teknis:
        - IEEE Status: {ieee_status} ({ieee_note})
        - Duval Triangle: {duval_res} (CH4:{pct_ch4}%, C2H4:{pct_c2h4}%, C2H2:{pct_c2h2}%)
        - Rogers: {rogers_res}
        - Isolasi Kertas: {paper_status} (Ratio: {paper_ratio})
        - Prediksi ML: {ml_res}
        """
        
        try:
            chat = groq_client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                model="llama-3.3-70b-versatile",
                max_tokens=600,
                temperature=0.2
            )
            volty_chat = chat.choices[0].message.content
        except Exception as e:
            volty_chat = f"Gagal memuat analisis AI: {str(e)}"

    # 4. Simpan ke Database
    if db_active and supabase:
        try:
            record = data.model_dump() 
            record.update({
                "tdcg": tdcg,
                "status_ieee": ieee_status,
                "diagnosa": f"Duval: {duval_res} | Rogers: {rogers_res}",
                "hasil_ai": volty_chat
            })
            supabase.table("riwayat_uji").insert(record).execute()
        except Exception as e:
            print(f"DB Error: {e}")

    # 5. Return Response
    return {
        "status": "Sukses",
        "tdcg_value": tdcg,
        "ieee_status": ieee_status,
        "rogers_diagnosis": rogers_res,
        "rogers_data": {"r1": val_r1, "r2": val_r2, "r5": val_r5},
        "duval_diagnosis": duval_res,
        "duval_data": {"ch4": pct_ch4, "c2h4": pct_c2h4, "c2h2": pct_c2h2},
        "paper_health": {"status": paper_status, "ratio": paper_ratio},
        "key_gas": key_gas_res,
        "ai_prediction": ml_res,
        "volty_chat": volty_chat
    }

@app.get("/history")
def get_history():
    if not db_active or not supabase: return []
    try: 
        return supabase.table("riwayat_uji").select("*").order("id", desc=True).limit(1000).execute().data
    except: return []

@app.delete("/history/{item_id}")
def delete_history(item_id: int):
    if db_active and supabase: 
        try:
            supabase.table("riwayat_uji").delete().eq("id", item_id).execute()
            return {"msg": "Data deleted"}
        except: return {"msg": "Error deleting"}
    return {"msg": "DB not active"}