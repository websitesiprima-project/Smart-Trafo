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
    h2 = data.h2
    ch4 = data.ch4
    c2h6 = data.c2h6
    c2h4 = data.c2h4
    c2h2 = data.c2h2

    r2 = c2h2 / c2h4 if c2h4 > 0 else 0
    r1 = ch4 / h2 if h2 > 0 else 0
    r5 = c2h4 / c2h6 if c2h6 > 0 else 0

    diagnosis = "Tidak Terdefinisi (Unidentified)"

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

    diagnosis_str = f"{diagnosis} (R1={r1:.2f}, R2={r2:.2f}, R5={r5:.2f})"
    return diagnosis_str, r1, r2, r5

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
        
        # 🔥 FIX TYPE CHECKING & PYLANCE SAFETY
        current_role = "user"
        if user_check.data and isinstance(user_check.data, list) and len(user_check.data) > 0:
            user_data = user_check.data[0] # Ambil item pertama
            if isinstance(user_data, dict): # Pastikan item adalah Dictionary
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

# --- 2. PREDICT / ANALISIS (DIGABUNG MENJADI SATU) ---
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
            # Urutan fitur: [H2, CH4, C2H2, C2H4, C2H6]
            features = np.array([[data.h2, data.ch4, data.c2h2, data.c2h4, data.c2h6]])
            ml_res = model_trafo.predict(features)[0]
        except Exception as e:
            print(f"ML Predict Error: {e}")
            ml_res = "Error Prediction"

    # C. Analisis AI (LLM - Groq)
    volty_chat = "AI sedang menganalisis..."
    if groq_client:
        system_prompt = """
        Anda adalah VOLTY, Spesialis Senior Transformator untuk PLN UPT Manado.
        Aturan: Jawab dalam Bahasa Indonesia, format Markdown.
        Standar: IEEE C57.104-2019.
        """
        user_prompt = f"""
        Data: H2={data.h2}, CH4={data.ch4}, C2H2={data.c2h2}, C2H4={data.c2h4}, C2H6={data.c2h6}, CO={data.co}.
        Hasil Teknis: IEEE={ieee_status}, Duval={duval_res}, Rogers={rogers_res}.
        Berikan diagnosa singkat dan rekomendasi aksi.
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

    # D. Simpan ke Database (Riwayat & Audit)
    if db_active and supabase:
        try:
            # 1. Cari Unit Pemilik berdasarkan email petugas (diambil_oleh)
            ultg_user = "Unknown"
            if data.diambil_oleh:
                user_profile = supabase.table("profiles").select("unit_ultg").eq("email", data.diambil_oleh).execute()
                
                # 🔥 FIX TYPE CHECKING & PYLANCE SAFETY
                if user_profile.data and isinstance(user_profile.data, list) and len(user_profile.data) > 0:
                    profile_data = user_profile.data[0]
                    if isinstance(profile_data, dict):
                        ultg_user = profile_data.get("unit_ultg", "Unknown")

            # 2. Simpan Riwayat
            record = data.model_dump()
            record.update({
                "tdcg": tdcg,
                "status_ieee": ieee_status,
                "diagnosa": f"Duval: {duval_res} | Rogers: {rogers_res}",
                "hasil_ai": volty_chat,
                "ultg_pemilik": ultg_user # Penanda kepemilikan data
            })
            supabase.table("riwayat_uji").insert(record).execute()

            # 3. Simpan Audit Log
            if data.diambil_oleh:
                supabase.table("audit_logs").insert({
                    "user_email": data.diambil_oleh,
                    "action": "UJI_DGA",
                    "details": f"Uji {data.nama_trafo} (Hasil: {ieee_status})"
                }).execute()

        except Exception as e:
            print(f"DB Error saat menyimpan history: {e}")

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

# --- 4. HISTORY & DELETE (DIGABUNG DAN DIPERBAIKI) ---
@app.get("/history")
def get_history():
    if not db_active or not supabase: return []
    try: 
        return supabase.table("riwayat_uji").select("*").order("id", desc=True).limit(1000).execute().data
    except: return []

# --- 5. MANAGEMEN ASET (GET & DELETE) ---
@app.get("/assets")
def get_all_assets():
    if not db_active or not supabase: return []
    try:
        # Ambil semua data aset trafo, urutkan dari yang terbaru
        response = supabase.table("assets_trafo").select("*").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching assets: {e}")
        return []

@app.delete("/assets/delete/{asset_id}")
def delete_asset(asset_id: int, user_email: str):
    if not db_active or not supabase: return {"status": "Error", "msg": "DB Offline"}
    
    try:
        # 1. Validasi Super Admin
        user_check = supabase.table("profiles").select("role").eq("email", user_email).execute()
        
        current_role = "user"
        if user_check.data and isinstance(user_check.data, list) and len(user_check.data) > 0:
            user_data = user_check.data[0]
            if isinstance(user_data, dict):
                current_role = user_data.get("role", "user")
        
        if current_role != 'super_admin':
            return {"status": "Gagal", "msg": "Hanya Super Admin yang boleh menghapus aset master!"}

        # 2. Ambil data sebelum dihapus (untuk log)
        # 🔥 FIX PYLANCE: Pastikan tipe data sebelum akses index
        nama_aset = "Unknown Asset"
        asset_data = supabase.table("assets_trafo").select("*").eq("id", asset_id).execute()
        
        if asset_data.data and isinstance(asset_data.data, list) and len(asset_data.data) > 0:
            first_asset = asset_data.data[0]
            if isinstance(first_asset, dict):
                nama_aset = f"{first_asset.get('nama_trafo', 'Unknown')} ({first_asset.get('lokasi_gi', 'Unknown')})"

        # 3. Hapus Aset
        supabase.table("assets_trafo").delete().eq("id", asset_id).execute()

        # 4. Catat Audit Log
        supabase.table("audit_logs").insert({
            "user_email": user_email,
            "action": "HAPUS_TRAFO",
            "details": f"Menghapus Master Aset: {nama_aset}"
        }).execute()

        return {"status": "Sukses", "msg": f"Aset {nama_aset} berhasil dihapus permanen."}

    except Exception as e:
        return {"status": "Error", "msg": str(e)}


@app.delete("/history/{item_id}")
def delete_history_item(item_id: int): # Ganti nama fungsi biar unik
    if db_active and supabase: 
        try:
            supabase.table("riwayat_uji").delete().eq("id", item_id).execute()
            return {"msg": "Data deleted"}
        except Exception as e: 
            return {"msg": f"Error deleting: {str(e)}"}
    return {"msg": "DB not active"}