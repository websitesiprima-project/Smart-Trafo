from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os
import sys
from groq import Groq
from supabase import create_client, Client
from dotenv import load_dotenv 
from typing import Any, cast, Dict # 🔥 NEW IMPORTS FOR TYPING FIX

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
VITE_SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
VITE_SUPABASE_KEY = os.getenv("VITE_SUPABASE_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Init Groq
groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("✅ Groq Client Connected")
    except Exception as e:
        print(f"❌ Groq Error: {e}")

# Init Supabase (Client Biasa)
supabase = None
db_active = False
if VITE_SUPABASE_URL and VITE_SUPABASE_KEY:
    try:
        supabase = create_client(VITE_SUPABASE_URL, VITE_SUPABASE_KEY)
        db_active = True
        print("✅ Supabase Client Connected")
    except Exception as e:
        print(f"❌ Supabase Client Error: {e}")

# Init Supabase Admin (Service Role)
supabase_admin = None
if VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase_admin = create_client(VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Supabase Admin (Service Role) Connected")
    except Exception as e:
        print(f"❌ Supabase Admin Error: {e}")

# ==========================================
# 4. INIT MODEL ML
# ==========================================
model_trafo = None
try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "smart_dga_model_keygas.pkl")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"File tidak ditemukan di path: {model_path}")

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

class TrafoBaruInput(BaseModel):
    nama_trafo: str
    lokasi_gi: str
    merk: str
    serial_number: str
    tahun_pembuatan: str
    level_tegangan: str
    user_email: str 

class DeleteRequest(BaseModel):
    user_email: str 

class CreateUserRequest(BaseModel):
    email: str
    password: str
    role: str       
    unit_ultg: str  
    requester_email: str

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

    # ZONA DISCHARGE (D1, D2)
    if pct_c2h2 > 13 and pct_c2h4 < 23:
        diagnosa = "D1: Discharge of Low Energy (Sparking)"
    elif pct_c2h2 > 13 and pct_c2h4 >= 23:
        diagnosa = "D2: Discharge of High Energy (Arcing)"
    
    # ZONA DT
    elif pct_c2h2 >= 4 and pct_c2h2 <= 13 and pct_c2h4 >= 10:
        diagnosa = "DT: Campuran Thermal & Electrical"
    
    # ZONA THERMAL (T1, T2, T3)
    elif pct_c2h4 >= 50 and pct_c2h2 < 4 and data.c2h4 > 100:
        diagnosa = "T3: Thermal Fault > 700°C"
    
    elif pct_c2h4 >= 50 and pct_c2h2 < 4 and data.c2h4 <= 100:
        diagnosa = "T2: Thermal Fault 300-700°C"
    elif pct_c2h4 >= 20 and pct_c2h4 < 50 and pct_c2h2 < 4:
        diagnosa = "T2: Thermal Fault 300-700°C"
    
    elif pct_ch4 >= 50 and pct_c2h4 < 20 and pct_c2h2 < 4:
        diagnosa = "T1: Thermal Fault < 300°C"
    
    elif pct_c2h4 >= 10 and pct_c2h4 < 20 and pct_c2h2 < 4:
        diagnosa = "T1-T2: Thermal Fault Ringan"
    
    # ZONA PD
    elif pct_ch4 >= 98 and pct_c2h2 < 2 and pct_c2h4 < 2:
        diagnosa = "PD: Partial Discharge"
    
    # DEFAULT
    else:
        if pct_c2h4 > pct_ch4 and pct_c2h4 > pct_c2h2:
            if data.c2h4 < 50: diagnosa = "T1-T2: Thermal Fault Ringan"
            elif data.c2h4 < 100: diagnosa = "T2: Thermal Fault 300-700°C"
            else: diagnosa = "T2-T3: Thermal Fault Sedang-Berat"
        elif pct_ch4 > pct_c2h4:
            diagnosa = "T1: Thermal Fault < 300°C"
        else:
            diagnosa = "Indeterminate (Perlu Evaluasi Lanjut)"

    return diagnosa, pct_ch4, pct_c2h4, pct_c2h2

def analisis_ieee_2019(data: TrafoInput):
    LIMITS_COND1 = {'h2': 100, 'ch4': 120, 'c2h6': 65, 'c2h4': 50, 'c2h2': 1, 'co': 350}
    LIMITS_COND2 = {'h2': 200, 'ch4': 400, 'c2h6': 100, 'c2h4': 100, 'c2h2': 2, 'co': 570}
    LIMITS_COND3 = {'h2': 300, 'ch4': 600, 'c2h6': 150, 'c2h4': 200, 'c2h2': 9, 'co': 1400}
    TDCG_LIMITS = {'cond1': 720, 'cond2': 1920, 'cond3': 4630}
    
    diagnosa = []
    status = 1
    
    tdcg = data.h2 + data.ch4 + data.c2h6 + data.c2h4 + data.c2h2 + data.co
    
    if tdcg > TDCG_LIMITS['cond3']:
        status = 3
        diagnosa.append(f"TDCG Sangat Tinggi ({int(tdcg)} ppm)")
    elif tdcg > TDCG_LIMITS['cond2']:
        status = 3
        diagnosa.append(f"TDCG Tinggi ({int(tdcg)} ppm)")
    elif tdcg > TDCG_LIMITS['cond1']:
        status = max(status, 2)
        diagnosa.append(f"TDCG Meningkat ({int(tdcg)} ppm)")
    
    if data.h2 > LIMITS_COND2['h2']: 
        diagnosa.append("H2 Tinggi")
        status = max(status, 2)
    
    if data.ch4 > LIMITS_COND2['ch4']: 
        diagnosa.append("CH4 Tinggi")
        status = max(status, 2)
    elif data.ch4 > LIMITS_COND1['ch4']: 
        diagnosa.append("CH4 Meningkat")
        status = max(status, 2)
        
    if data.c2h4 > LIMITS_COND2['c2h4']: 
        diagnosa.append("C2H4 Tinggi")
        status = max(status, 2)
    elif data.c2h4 > LIMITS_COND1['c2h4']: 
        diagnosa.append("C2H4 Meningkat")
        status = max(status, 2)
        
    if data.co > LIMITS_COND2['co']: 
        diagnosa.append("CO Tinggi (Degradasi Selulosa)")
        status = max(status, 2)
    elif data.co > LIMITS_COND1['co']: 
        diagnosa.append("CO Meningkat (Penuaan Kertas)")
        status = max(status, 2)
    
    if data.c2h2 > LIMITS_COND3['c2h2']: 
        diagnosa.append(f"C2H2 Kritis ({data.c2h2} ppm) - Indikasi Arcing Aktif")
        status = 3
    elif data.c2h2 > LIMITS_COND2['c2h2']: 
        diagnosa.append(f"C2H2 Terdeteksi ({data.c2h2} ppm)")
        status = max(status, 2)
    elif data.c2h2 > LIMITS_COND1['c2h2']: 
        diagnosa.append(f"C2H2 Trace ({data.c2h2} ppm)")
        status = max(status, 2)
    
    if data.c2h4 > LIMITS_COND3['c2h4'] or data.ch4 > LIMITS_COND3['ch4']: 
        status = 3
    
    status_text = "Normal" if status == 1 else ("Waspada (Cond 2)" if status == 2 else "KRITIS (Cond 3)")
    return status_text, ", ".join(diagnosa) if diagnosa else "Parameter Gas Normal"

def analisis_rogers_ratio(data: TrafoInput):
    h2 = data.h2
    ch4 = data.ch4
    c2h6 = data.c2h6
    c2h4 = data.c2h4
    c2h2 = data.c2h2

    r2 = c2h2 / c2h4 if c2h4 > 0 else -1 
    r1 = ch4 / h2 if h2 > 0 else -1
    r5 = c2h4 / c2h6 if c2h6 > 0 else -1

    diagnosis = "Tidak Terdefinisi"
    
    invalid_ratios = []
    if r1 < 0: invalid_ratios.append("R1 (H2=0)")
    if r2 < 0: invalid_ratios.append("R2 (C2H4=0)")
    if r5 < 0: invalid_ratios.append("R5 (C2H6=0)")
    
    if invalid_ratios:
        diagnosis = f"Rasio Tidak Valid ({', '.join(invalid_ratios)})"
    else:
        if r2 < 0.1 and 0.1 <= r1 <= 1.0 and r5 < 1.0:
            diagnosis = "Normal"
        elif r2 < 0.1 and r1 < 0.1 and r5 < 1.0:
            diagnosis = "Partial Discharge (PD)"
        elif 0.1 <= r2 <= 3.0 and 0.1 <= r1 <= 1.0 and r5 > 3.0:
            diagnosis = "Arcing (High Energy)"
        elif r2 < 0.1 and 0.1 <= r1 <= 1.0 and 1.0 <= r5 <= 3.0:
            diagnosis = "Thermal Fault < 700°C"
        elif r2 < 0.1 and r1 > 1.0 and 1.0 <= r5 <= 3.0:
            diagnosis = "Thermal Fault > 700°C"
        elif r2 > 3.0 or (0.1 <= r2 <= 3.0 and r1 > 1.0 and r5 > 3.0):
            diagnosis = "Low Energy Arcing / Sparking"
        else:
            diagnosis = "Tidak Terdefinisi (Fault Ringan/Awal)"

    r1_str = f"{r1:.2f}" if r1 >= 0 else "N/A"
    r2_str = f"{r2:.2f}" if r2 >= 0 else "N/A"
    r5_str = f"{r5:.2f}" if r5 >= 0 else "N/A"
    
    diagnosis_str = f"{diagnosis} (R1={r1_str}, R2={r2_str}, R5={r5_str})"
    return diagnosis_str, max(r1, 0), max(r2, 0), max(r5, 0)

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
# 7. ENDPOINTS (API ROUTES)
# ==========================================

# --- 1. TAMBAH TRAFO (SUPER ADMIN) ---
@app.post("/assets/add")
def add_trafo(data: TrafoBaruInput):
    if not supabase: return {"error": "DB Error"}
    
    try:
        user_check = supabase.table("profiles").select("role").eq("email", data.user_email).execute()
        
        current_role = "user"
        if user_check.data and isinstance(user_check.data, list) and len(user_check.data) > 0:
            user_data = user_check.data[0] 
            if isinstance(user_data, dict): 
                current_role = user_data.get("role", "user")
             
        if current_role != 'super_admin':
            return {"status": "Gagal", "msg": "Akses Ditolak. Hanya Super Admin."}

        # Insert Aset
        payload = data.model_dump(exclude={"user_email"})
        supabase.table("assets_trafo").insert(payload).execute()
        
        # Insert Audit Log
        supabase.table("audit_logs").insert({
            "user_email": data.user_email,
            "action": "TAMBAH_TRAFO",
            "details": f"Menambahkan {data.nama_trafo} di {data.lokasi_gi}"
        }).execute()
        
        return {"status": "Sukses", "msg": "Trafo berhasil didaftarkan"}
    except Exception as e:
        return {"status": "Error", "msg": str(e)}

# --- 2. PREDICT / ANALISIS ---
@app.post("/predict")
def predict(data: TrafoInput):
    # A. Jalankan Perhitungan Fisika/Kimia
    tdcg = hitung_tdcg(data)
    ieee_status, ieee_note = analisis_ieee_2019(data)
    rogers_res, val_r1, val_r2, val_r5 = analisis_rogers_ratio(data)
    key_gas_res = analisis_key_gas(data)
    duval_res, pct_ch4, pct_c2h4, pct_c2h2 = analisis_duval_triangle_1(data)
    paper_status, paper_ratio = analisis_ratio_co2_co(data)
    
    # B. Prediksi Machine Learning
    ml_res = "ML Not Active"
    if model_trafo:
        try:
            features = np.array([[data.h2, data.ch4, data.c2h2, data.c2h4, data.c2h6]])
            ml_res = model_trafo.predict(features)[0]
        except Exception as e:
            print(f"ML Predict Error: {e}")
            ml_res = "Error Prediction"

    # C. Analisis AI (LLM - Groq)
    volty_chat = "AI sedang menganalisis..."
    if groq_client:
        system_prompt = """
Anda adalah VOLTY, Spesialis Senior Analisis DGA Transformator untuk PLN UPT Manado.
=== ATURAN ANALISIS WAJIB ===
1. Gunakan standar IEEE C57.104-2019 sebagai acuan utama
2. JANGAN membuat klaim berlebihan yang tidak didukung data
3. Perhatikan nilai ABSOLUT gas (ppm), bukan hanya persentase Duval
4. Analisis harus PROPORSIONAL dengan nilai gas yang sebenarnya
=== FORMAT JAWABAN ===
Bahasa Indonesia, Markdown singkat:
### Diagnosa Singkat
### Hasil Teknis
### Rekomendasi Aksi
"""
        
        h2_level = "rendah" if data.h2 < 100 else "meningkat" if data.h2 < 200 else "tinggi"
        ch4_level = "rendah" if data.ch4 < 120 else "meningkat" if data.ch4 < 400 else "tinggi"
        c2h2_level = "sangat rendah" if data.c2h2 < 2 else "rendah" if data.c2h2 < 5 else "sedang" if data.c2h2 < 10 else "tinggi"
        c2h4_level = "rendah" if data.c2h4 < 50 else "sedang" if data.c2h4 < 100 else "tinggi"
        co_level = "normal" if data.co < 350 else "meningkat" if data.co < 570 else "tinggi"
        
        total_duval = data.ch4 + data.c2h4 + data.c2h2
        duval_context = ""
        if total_duval > 0:
            pct_ch4_ai = round((data.ch4 / total_duval) * 100, 1)
            pct_c2h4_ai = round((data.c2h4 / total_duval) * 100, 1)
            pct_c2h2_ai = round((data.c2h2 / total_duval) * 100, 1)
            duval_context = f"""
ANALISIS DUVAL:
- CH4: {pct_ch4_ai}% | C2H4: {pct_c2h4_ai}% | C2H2: {pct_c2h2_ai}%
- PERHATIAN: C2H4 absolut = {data.c2h4} ppm {'(RENDAH untuk T3!)' if data.c2h4 <= 100 else '(cukup tinggi)'}
- {'JANGAN sebut T3 karena C2H4 absolut < 100 ppm' if data.c2h4 <= 100 else ''}"""
        
        user_prompt = f"""
DATA DGA TRANSFORMATOR:
| Gas | Nilai (ppm) | Level |
|-----|-------------|-------|
| H2 | {data.h2} | {h2_level} |
| CH4 | {data.ch4} | {ch4_level} |
| C2H2 | {data.c2h2} | {c2h2_level} |
| C2H4 | {data.c2h4} | {c2h4_level} |
| C2H6 | {data.c2h6} | - |
| CO | {data.co} | {co_level} |
| CO2 | {data.co2} | - |
| TDCG | {tdcg} | {'Normal' if tdcg < 720 else 'Waspada' if tdcg < 1920 else 'Kritis'} |
{duval_context}

HASIL METODE ANALISIS:
- IEEE C57.104-2019: {ieee_status}
- Duval Triangle: {duval_res}
- Rogers Ratio: {rogers_res}

PERINGATAN:
- {'Gas-gas umumnya RENDAH, jangan sebut "relatif tinggi"' if data.h2 < 100 and data.ch4 < 120 else ''}
- {'C2H2 sangat rendah = TIDAK ADA indikasi arcing aktif' if data.c2h2 < 5 else ''}
- {'CO meningkat = degradasi isolasi kertas (penuaan), BUKAN thermal fault berat' if data.co > 300 else ''}

Berikan analisis yang AKURAT dan PROPORSIONAL.
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

    # E. Return Response ke Frontend
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

# --- 3. CHATBOT ---
VOLTY_SYSTEM_PROMPT = """Anda adalah VOLTY, asisten AI PLN UPT Manado.""" 

@app.post("/chat")
def chat_with_volty(data: ChatInput):
    if not groq_client: return {"reply": "Maaf, koneksi AI sedang offline."}
    
    system_msg = VOLTY_SYSTEM_PROMPT
    if data.context:
        system_msg += f"\n\nKONTEKS DATA TRAFO:\n{data.context}"
        
    try:
        chat = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": data.message}
            ],
            model="llama-3.3-70b-versatile",
            max_tokens=600
        )
        return {"reply": chat.choices[0].message.content}
    except Exception as e:
        return {"reply": f"Error AI: {str(e)}"}

# --- 4. HISTORY ---
@app.get("/history")
def get_history():
    if not db_active or not supabase: return []
    try: 
        return supabase.table("riwayat_uji").select("*").order("id", desc=True).limit(1000).execute().data
    except: return []

# --- 5. MANAGEMEN ASET ---
@app.get("/assets")
def get_all_assets():
    if not db_active or not supabase: return []
    try:
        response = supabase.table("assets_trafo").select("*").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching assets: {e}")
        return []

@app.delete("/assets/delete/{asset_id}")
def delete_asset(asset_id: int, user_email: str):
    if not db_active or not supabase: return {"status": "Error", "msg": "DB Offline"}
    
    try:
        user_check = supabase.table("profiles").select("role").eq("email", user_email).execute()
        
        current_role = "user"
        if user_check.data and isinstance(user_check.data, list) and len(user_check.data) > 0:
            user_data = user_check.data[0]
            if isinstance(user_data, dict):
                current_role = user_data.get("role", "user")
        
        if current_role != 'super_admin':
            return {"status": "Gagal", "msg": "Hanya Super Admin yang boleh menghapus aset master!"}

        nama_aset = "Unknown Asset"
        asset_data = supabase.table("assets_trafo").select("*").eq("id", asset_id).execute()
        
        if asset_data.data and isinstance(asset_data.data, list) and len(asset_data.data) > 0:
            first_asset = asset_data.data[0]
            if isinstance(first_asset, dict):
                nama_aset = f"{first_asset.get('nama_trafo', 'Unknown')} ({first_asset.get('lokasi_gi', 'Unknown')})"

        supabase.table("assets_trafo").delete().eq("id", asset_id).execute()

        supabase.table("audit_logs").insert({
            "user_email": user_email,
            "action": "HAPUS_TRAFO",
            "details": f"Menghapus Master Aset: {nama_aset}"
        }).execute()

        return {"status": "Sukses", "msg": f"Aset {nama_aset} berhasil dihapus permanen."}

    except Exception as e:
        return {"status": "Error", "msg": str(e)}

@app.delete("/history/{item_id}")
def delete_history_item(item_id: int):
    if db_active and supabase: 
        try:
            supabase.table("riwayat_uji").delete().eq("id", item_id).execute()
            return {"msg": "Data deleted"}
        except Exception as e: 
            return {"msg": f"Error deleting: {str(e)}"}
    return {"msg": "DB not active"}

# ==========================================
# 8. MANAJEMEN USER (SUPER ADMIN ONLY) - FINAL FIX
# ==========================================

@app.post("/admin/create-user")
def admin_create_user(data: CreateUserRequest):
    # 1. Pastikan Client Admin Tersedia & Tidak None
    admin_client = supabase_admin
    if admin_client is None: 
        return {"status": "Error", "msg": "Service Key not configured or Supabase offline"}

    # Pastikan Client Public juga ada untuk cek profil
    public_client = supabase
    if public_client is None:
        return {"status": "Error", "msg": "Public Client offline"}

    try:
        # 2. Cek apakah Requester adalah Super Admin
        check = public_client.table("profiles")\
            .select("role")\
            .eq("email", data.requester_email)\
            .execute()
        
        rows = check.data
        if not isinstance(rows, list) or len(rows) == 0:
            return {"status": "Gagal", "msg": "Unauthorized: User tidak ditemukan"}
        
        requester_profile = rows[0]
        if not isinstance(requester_profile, dict):
            return {"status": "Error", "msg": "Format data profil invalid"}

        user_role = requester_profile.get("role")
        if user_role != 'super_admin':
            return {"status": "Gagal", "msg": "Unauthorized: Hanya Super Admin"}

        # 3. Create User di Supabase Auth
        # FIX: Gunakan dictionary 'attributes' dan casting ke Any agar Pylance tidak komplain
        user_attributes = {
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
            "user_metadata": {"role": data.role, "unit_ultg": data.unit_ultg}
        }
        
        # PYLANCE BYPASS: cast(Any, ...) membungkam error tipe data
        new_user = admin_client.auth.admin.create_user(attributes=cast(Any, user_attributes))
        
        # Ambil ID User Baru (Safe Access tanpa membuat Pylance marah)
        new_user_id = None
        
        # Cek properti user (standar library)
        if hasattr(new_user, 'user') and new_user.user:
            new_user_id = new_user.user.id
        
        if not new_user_id:
            # Fallback (biasanya tidak terjadi jika sukses)
            raise Exception("Gagal mendapatkan ID user baru dari respons Supabase")

        # 4. Update Profile (Upsert)
        profile_payload = {
            "id": new_user_id,
            "email": data.email,
            "role": data.role,
            "unit_ultg": data.unit_ultg
        }
        
        admin_client.table("profiles").upsert(profile_payload).execute()

        # 5. Audit Log
        admin_client.table("audit_logs").insert({
            "user_email": data.requester_email,
            "action": "CREATE_USER",
            "details": f"Membuat user baru: {data.email} ({data.unit_ultg})"
        }).execute()

        return {"status": "Sukses", "msg": f"User {data.email} berhasil dibuat!"}

    except Exception as e:
        print(f"Error Create User: {str(e)}") 
        return {"status": "Error", "msg": f"Gagal membuat user: {str(e)}"}

@app.delete("/admin/delete-user/{target_id}")
def admin_delete_user(target_id: str, requester_email: str):
    # 1. Pastikan Client Admin Tersedia
    admin_client = supabase_admin
    if admin_client is None: 
        return {"status": "Error", "msg": "Service Key Missing"}
    
    public_client = supabase
    if public_client is None:
        return {"status": "Error", "msg": "Public DB Connection Error"}
    
    try:
        # 2. Cek Super Admin (Safe Check)
        check = public_client.table("profiles")\
            .select("role")\
            .eq("email", requester_email)\
            .execute()
            
        rows = check.data
        if not isinstance(rows, list) or len(rows) == 0:
            return {"status": "Gagal", "msg": "Unauthorized"}
        
        requester_profile = rows[0]
        if not isinstance(requester_profile, dict):
             return {"status": "Error", "msg": "Data corrupt"}
            
        if requester_profile.get("role") != 'super_admin':
            return {"status": "Gagal", "msg": "Unauthorized: Bukan Super Admin"}

        # 3. Hapus dari Auth
        admin_client.auth.admin.delete_user(target_id)
        
        # 4. Hapus Profile Manual (Safe Execute)
        try:
            admin_client.table("profiles").delete().eq("id", target_id).execute()
        except:
            pass # Ignore jika sudah terhapus cascade
        
        # 5. Audit Log
        admin_client.table("audit_logs").insert({
            "user_email": requester_email,
            "action": "DELETE_USER",
            "details": f"Menghapus User ID: {target_id}"
        }).execute()

        return {"status": "Sukses", "msg": "User berhasil dihapus permanent."}
    except Exception as e:
        return {"status": "Error", "msg": str(e)}
    
# ==========================================
# 9. MASTER DATA (ULTG & GI) - PYLANCE FIXED
# ==========================================

class MasterUltgInput(BaseModel):
    nama_ultg: str
    requester_email: str

class MasterGiInput(BaseModel):
    nama_gi: str
    nama_ultg: str
    lat: float = 0.0 
    lon: float = 0.0 
    requester_email: str

# --- A. GET HIERARCHY ---
@app.get("/master/hierarchy")
def get_master_hierarchy():
    # Pylance Guard: Pastikan client ada
    client = supabase
    if client is None: return {}

    try:
        # Ambil nama, lat, lon dari GI
        res = client.table("master_ultg").select("nama_ultg, master_gi(nama_gi, lat, lon)").execute()
        
        # Pylance Guard: Pastikan data adalah list
        rows = res.data
        if not isinstance(rows, list): return {}

        mapping = {}
        for item in rows:
            if not isinstance(item, dict): continue # Skip jika format aneh
            
            ultg = item.get('nama_ultg', 'Unknown')
            
            # Ambil GI (bisa list, bisa None)
            gi_list = item.get('master_gi', [])
            if not isinstance(gi_list, list): gi_list = []

            gis = []
            for g in gi_list:
                if isinstance(g, dict):
                    gis.append({
                        "name": g.get('nama_gi', 'Unknown'), 
                        "lat": g.get('lat', 0.0), 
                        "lon": g.get('lon', 0.0)
                    })
            
            mapping[ultg] = gis
            
        return mapping
    except Exception as e:
        print(f"Error fetching hierarchy: {e}")
        return {}

# --- B. ADD ULTG ---
@app.post("/admin/master/add-ultg")
def add_master_ultg(data: MasterUltgInput):
    admin_client = supabase_admin
    if admin_client is None: return {"status": "Error", "msg": "Admin access required"}
    
    public_client = supabase
    if public_client is None: return {"status": "Error", "msg": "DB Error"}

    try:
        # Validasi Super Admin
        check = public_client.table("profiles").select("role").eq("email", data.requester_email).execute()
        
        rows = check.data
        if not isinstance(rows, list) or len(rows) == 0:
            return {"status": "Gagal", "msg": "Unauthorized"}
        
        # Safe Access
        if isinstance(rows[0], dict) and rows[0].get('role') != 'super_admin':
            return {"status": "Gagal", "msg": "Unauthorized"}

        admin_client.table("master_ultg").insert({"nama_ultg": data.nama_ultg}).execute()
        return {"status": "Sukses", "msg": f"ULTG {data.nama_ultg} berhasil ditambahkan"}
    except Exception as e:
        return {"status": "Error", "msg": str(e)}

# --- C. DELETE ULTG ---
@app.delete("/admin/master/delete-ultg/{nama_ultg}")
def delete_master_ultg(nama_ultg: str, requester_email: str):
    admin_client = supabase_admin
    if admin_client is None: return {"status": "Error", "msg": "Admin access required"}
    
    public_client = supabase
    if public_client is None: return {"status": "Error", "msg": "DB Error"}

    try:
        check = public_client.table("profiles").select("role").eq("email", requester_email).execute()
        
        rows = check.data
        if not isinstance(rows, list) or len(rows) == 0:
            return {"status": "Gagal", "msg": "Unauthorized"}
            
        if isinstance(rows[0], dict) and rows[0].get('role') != 'super_admin':
            return {"status": "Gagal", "msg": "Unauthorized"}

        admin_client.table("master_ultg").delete().eq("nama_ultg", nama_ultg).execute()
        return {"status": "Sukses", "msg": f"ULTG {nama_ultg} dihapus."}
    except Exception as e:
        return {"status": "Error", "msg": str(e)}

# --- D. ADD GI ---
@app.post("/admin/master/add-gi")
def add_master_gi(data: MasterGiInput):
    admin_client = supabase_admin
    if admin_client is None: return {"status": "Error", "msg": "Admin access required"}
    
    public_client = supabase
    if public_client is None: return {"status": "Error", "msg": "DB Error"}

    try:
        check = public_client.table("profiles").select("role").eq("email", data.requester_email).execute()
        rows = check.data
        if not isinstance(rows, list) or len(rows) == 0:
            return {"status": "Gagal", "msg": "Unauthorized"}
        
        if isinstance(rows[0], dict) and rows[0].get('role') != 'super_admin':
            return {"status": "Gagal", "msg": "Unauthorized"}

        # Cari ID ULTG
        ultg_res = public_client.table("master_ultg").select("id").eq("nama_ultg", data.nama_ultg).execute()
        
        ultg_rows = ultg_res.data
        if not isinstance(ultg_rows, list) or len(ultg_rows) == 0:
            return {"status": "Gagal", "msg": "ULTG tidak ditemukan"}
        
        # Safe Access ID
        if not isinstance(ultg_rows[0], dict): return {"status": "Error", "msg": "Data ULTG corrupt"}
        ultg_id = ultg_rows[0].get('id')

        # Insert GI
        admin_client.table("master_gi").insert({
            "nama_gi": data.nama_gi,
            "id_ultg": ultg_id,
            "lat": data.lat,
            "lon": data.lon
        }).execute()
        
        return {"status": "Sukses", "msg": f"{data.nama_gi} ditambahkan"}
    except Exception as e:
        return {"status": "Error", "msg": str(e)}

# --- E. DELETE GI ---
@app.delete("/admin/master/delete-gi")
def delete_master_gi(nama_gi: str, nama_ultg: str, requester_email: str):
    admin_client = supabase_admin
    if admin_client is None: return {"status": "Error", "msg": "Admin access required"}
    
    public_client = supabase
    if public_client is None: return {"status": "Error", "msg": "DB Error"}

    try:
        check = public_client.table("profiles").select("role").eq("email", requester_email).execute()
        rows = check.data
        if not isinstance(rows, list) or len(rows) == 0: return {"status": "Gagal", "msg": "Unauthorized"}
        
        if isinstance(rows[0], dict) and rows[0].get('role') != 'super_admin':
            return {"status": "Gagal", "msg": "Unauthorized"}

        ultg_res = public_client.table("master_ultg").select("id").eq("nama_ultg", nama_ultg).execute()
        ultg_rows = ultg_res.data
        if not isinstance(ultg_rows, list) or len(ultg_rows) == 0: return {"status": "Gagal", "msg": "ULTG 404"}
        
        if not isinstance(ultg_rows[0], dict): return {"status": "Error", "msg": "Data ULTG corrupt"}
        ultg_id = ultg_rows[0].get('id')

        admin_client.table("master_gi").delete().match({"nama_gi": nama_gi, "id_ultg": ultg_id}).execute()
        return {"status": "Sukses", "msg": "GI berhasil dihapus"}
    except Exception as e:
        return {"status": "Error", "msg": str(e)}