from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os
import sys
import math
from groq import Groq
from supabase import create_client, Client
from dotenv import load_dotenv 
from typing import Any, cast, Dict, List, Optional

# ==========================================
# 1. LOAD ENVIRONMENT
# ==========================================
load_dotenv()
app = FastAPI(title="Volty AI Backend - Ultimate Version")

# ==========================================
# 2. KEAMANAN CORS
# ==========================================
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

# ==========================================
# 3. KONEKSI CLIENTS
# ==========================================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
VITE_SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
VITE_SUPABASE_KEY = os.getenv("VITE_SUPABASE_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# --- Init Groq ---
groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("✅ Groq Client Connected")
    except Exception as e:
        print(f"❌ Groq Error: {e}")

# --- Init Supabase (Client Biasa) ---
supabase: Optional[Client] = None
db_active = False
if VITE_SUPABASE_URL and VITE_SUPABASE_KEY:
    try:
        supabase = create_client(VITE_SUPABASE_URL, VITE_SUPABASE_KEY)
        db_active = True
        print("✅ Supabase Client Connected")
    except Exception as e:
        print(f"❌ Supabase Client Error: {e}")

# --- Init Supabase Admin (Service Role) ---
supabase_admin: Optional[Client] = None
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
        print(f"⚠️ Warning: File model tidak ditemukan di path: {model_path}")
    else:
        model_trafo = joblib.load(model_path)
        print("✅ ML Model Loaded (via Joblib)")
    
except Exception as e: 
    print(f"❌ ERROR LOADING MODEL: {str(e)}")
    print("⚠️ System running without ML prediction.")


# ==========================================
# 5. DATA MODELS
# ==========================================
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
    suhu_sampel: float = 0.0
    diambil_oleh: str = "" 
    h2: float = 0.0
    ch4: float = 0.0
    c2h2: float = 0.0
    c2h4: float = 0.0
    c2h6: float = 0.0
    co: float = 0.0
    co2: float = 0.0
    skip_db_save: bool = False  # True untuk InputFormPage

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

class MasterUltgInput(BaseModel):
    nama_ultg: str
    requester_email: str

class MasterGiInput(BaseModel):
    nama_gi: str
    nama_ultg: str
    lat: float = 0.0 
    lon: float = 0.0 
    requester_email: str

# ==========================================
# 6. METODE ANALISIS TEKNIS
# ==========================================

def hitung_tdcg(data: TrafoInput):
    """Menghitung Total Dissolved Combustible Gas"""
    return data.h2 + data.ch4 + data.c2h6 + data.c2h4 + data.c2h2 + data.co

# --- ANALISIS SPLN T5.004-4:2016 ---
def analisis_spln(data: TrafoInput, tdcg: float):
    """
    Analisis berdasarkan SPLN T5.004-4:2016 
    Pedoman Pemeliharaan Trafo Tenaga PLN
    """
    if tdcg <= 720:
        status = "Kondisi 1 - Operasi Normal"
        tindakan = "Operasi normal, lakukan sampling rutin sesuai jadwal"
    elif tdcg <= 1920:
        status = "Kondisi 2 - Waspada"
        tindakan = "Lakukan uji rutin lebih sering, perhatikan tren kenaikan gas"
    elif tdcg <= 4630:
        status = "Kondisi 3 - Peringatan"
        tindakan = "Lakukan uji lanjut segera, pertimbangkan pengurangan beban"
    else:
        status = "Kondisi 4 - Bahaya"
        tindakan = "SEGERA evaluasi untuk trip/isolasi transformator"
    
    catatan = f"TDCG = {tdcg} ppm. {tindakan}"
    return status, catatan

# --- ANALISIS DUVAL PENTAGON 1 ---
def analisis_duval_pentagon(data: TrafoInput):
    """
    Analisis Duval Pentagon 1 - Koordinat Centroid & Zona
    """
    total = data.h2 + data.c2h6 + data.ch4 + data.c2h4 + data.c2h2
    if total == 0:
        return "Tidak Ada Gas Terdeteksi", {
            "h2": 0, "c2h6": 0, "ch4": 0, "c2h4": 0, "c2h2": 0, "zona": "N/A"
        }
    
    # Hitung persentase gas
    pH2 = (data.h2 / total) * 100
    pC2H6 = (data.c2h6 / total) * 100
    pCH4 = (data.ch4 / total) * 100
    pC2H4 = (data.c2h4 / total) * 100
    pC2H2 = (data.c2h2 / total) * 100
    
    def rad(deg):
        return deg * math.pi / 180
    
    k = 0.4
    
    # Hitung titik-titik vektor
    points = [
        {"x": 0, "y": pH2 * k},  # H2 (Top)
        {"x": pC2H6 * k * math.cos(rad(162)), "y": pC2H6 * k * math.sin(rad(162))},
        {"x": pCH4 * k * math.cos(rad(234)), "y": pCH4 * k * math.sin(rad(234))},
        {"x": pC2H4 * k * math.cos(rad(306)), "y": pC2H4 * k * math.sin(rad(306))},
        {"x": pC2H2 * k * math.cos(rad(18)), "y": pC2H2 * k * math.sin(rad(18))},
    ]
    
    # Hitung Centroid
    Cx = sum(p["x"] for p in points)
    Cy = sum(p["y"] for p in points)
    
    # Fungsi Cross Product untuk menentukan posisi relatif titik terhadap garis
    def is_left_of_line(px, py, ax, ay, bx, by):
        return (bx - ax) * (py - ay) - (by - ay) * (px - ax) > 0
    
    def is_right_of_line(px, py, ax, ay, bx, by):
        return (bx - ax) * (py - ay) - (by - ay) * (px - ax) < 0
    
    zona_names = {
        "PD": "PD: Partial Discharge",
        "D1": "D1: Low Energy Discharge (Sparking)",
        "D2": "D2: High Energy Discharge (Arcing)",
        "T3": "T3: Thermal Fault > 700°C",
        "T2": "T2: Thermal Fault 300-700°C",
        "T1": "T1: Thermal Fault < 300°C",
        "S": "S: Stray Gassing (Normal)"
    }
    
    detected_zone = "S"
    
    # === KLASIFIKASI ZONA ===
    
    # 1. CEK ZONA PD
    if Cx >= -1 and Cx <= 0 and Cy >= 24.5 and Cy <= 40:
        detected_zone = "PD"
    
    # 2. CEK ZONA D1
    elif Cx > 0 and Cy > 0:
        if is_left_of_line(Cx, Cy, 0, 1.5, 32, -6.1):
            detected_zone = "D1"
        else:
            detected_zone = "D2"
    
    # 3. CEK ZONA D2
    elif Cx > 0 and Cy <= 0:
        if is_left_of_line(Cx, Cy, 0, -3, 24.3, -30):
            detected_zone = "D2"
        else:
            detected_zone = "T3"
    
    # 4. CEK ZONA T3
    elif Cx >= 0 and Cy < -3:
        if Cy > -32.4:
            detected_zone = "T3"
        else:
            detected_zone = "T3"
    
    # 5. CEK ZONA T2
    elif Cx < 0 and Cy < -4:
        if is_right_of_line(Cx, Cy, -6, -4, -22.5, -32.4):
            if Cx > 0:
                detected_zone = "T3"
            else:
                detected_zone = "T2"
        else:
            detected_zone = "T1"
    
    # 6. CEK ZONA T1
    elif Cx < 0 and Cy >= -4 and Cy < 1.5:
        if is_right_of_line(Cx, Cy, -35, 3.1, 0, 1.5):
            detected_zone = "T1"
        else:
            detected_zone = "S"
    
    # 7. CEK ZONA S
    elif Cx < 0 and Cy >= 1.5:
        detected_zone = "S"
    
    # 8. DEFAULT / FALLBACK
    else:
        max_gas = max(pH2, pC2H6, pCH4, pC2H4, pC2H2)
        if max_gas == pH2:
            if pH2 > 80:
                detected_zone = "PD"
            else:
                detected_zone = "D1" if pC2H2 > pCH4 else "S"
        elif max_gas == pC2H2:
            detected_zone = "D1" if pC2H4 < 25 else "D2"
        elif max_gas == pC2H4:
            if pC2H2 > 10:
                detected_zone = "D2"
            elif pC2H4 > 50:
                detected_zone = "T3"
            else:
                detected_zone = "T2"
        elif max_gas == pCH4:
            detected_zone = "T1"
        elif max_gas == pC2H6:
            detected_zone = "S"
        else:
            detected_zone = "S"
    
    diagnosa = zona_names.get(detected_zone, "Indeterminate")
    
    pct = {
        "h2": round(pH2, 1),
        "c2h6": round(pC2H6, 1),
        "ch4": round(pCH4, 1),
        "c2h4": round(pC2H4, 1),
        "c2h2": round(pC2H2, 1),
        "centroid_x": round(Cx, 2),
        "centroid_y": round(Cy, 2),
        "zona": detected_zone
    }
    
    return diagnosa, pct

def analisis_ratio_co2_co(data: TrafoInput):
    if data.co == 0:
        return "Tidak Dapat Dihitung (CO=0)", 0.0
        
    ratio = round(data.co2 / data.co, 2)
    
    if ratio < 3:
        status = "Indikasi Fault Kertas (Carbonization)"
    elif 3 <= ratio <= 10:
        status = "Kertas Normal"
    else:
        status = "Degradasi Termal Ringan (<150°C)"
        
    return status, ratio

# NOTE: Fungsi analisis_duval_triangle_1 telah DIHAPUS.

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
    # PYLANCE FIX: Cast to Any to satisfy 'max' type checker
    dominant_gas = max(gases, key=cast(Any, gases.get))
    if gases[dominant_gas] == 0: return "Tidak Ada Gas Dominan"
    return f"Dominan {dominant_gas}"

# ==========================================
# 7. ENDPOINTS (API ROUTES)
# ==========================================

# --- 1. TAMBAH TRAFO (SUPER ADMIN) ---
@app.post("/assets/add")
def add_trafo(data: TrafoBaruInput):
    if not supabase: 
        return {"error": "DB Error"}
    
    try:
        user_check = supabase.table("profiles").select("role").eq("email", data.user_email).execute()
        
        current_role = "user"
        if user_check.data and isinstance(user_check.data, list) and len(user_check.data) > 0:
            user_data = cast(Dict[str, Any], user_check.data[0]) 
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
    spln_status, spln_note = analisis_spln(data, tdcg)
    pentagon_res, pentagon_pct = analisis_duval_pentagon(data)
    
    # Legacy methods
    rogers_res, val_r1, val_r2, val_r5 = analisis_rogers_ratio(data)
    key_gas_res = analisis_key_gas(data)
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
        system_prompt = """Anda adalah VOLTY, Spesialis Senior Analisis DGA (Dissolved Gas Analysis) Transformator untuk PLN UPT Manado.

TUGAS: Menyusun laporan kesimpulan analisis DGA transformator berdasarkan hasil analisis yang sudah dihitung.

STANDAR ACUAN (3 metode yang digunakan):
1. IEEE C57.104-2019 - Standar internasional untuk interpretasi DGA
2. SPLN T5.004-4:2016 - Standar PLN Indonesia berdasarkan nilai TDCG
3. Duval Pentagon 1 - Metode lokalisasi jenis fault

ATURAN PENTING:
- GUNAKAN hasil analisis yang sudah diberikan, JANGAN menganalisis ulang
- Untuk Duval Pentagon, SEBUTKAN PERSIS diagnosa zona yang diberikan (PD/D1/D2/T1/T2/T3/S)
- Jelaskan arti dari setiap hasil dengan bahasa profesional
- Berikan rekomendasi yang sesuai dengan kondisi

FORMAT OUTPUT (Markdown, TANPA emoji):

### DIAGNOSA KONDISI
[Status: Normal / Perlu Perhatian / Perlu Tindakan / Kritis]
[Rangkuman kondisi transformator berdasarkan 3 metode]

### HASIL ANALISIS TEKNIS
**1. IEEE C57.104-2019:** [sebutkan status yang diberikan dan penjelasannya]
**2. SPLN T5.004-4:2016:** [sebutkan status kondisi yang diberikan dan penjelasannya]  
**3. Duval Pentagon:** [SEBUTKAN ZONA PERSIS seperti yang diberikan, jelaskan artinya]

### REKOMENDASI
[Tindakan pemeliharaan/monitoring yang perlu dilakukan]
"""
        
        # Pylance Fix: Safely get values from dictionary
        zona_p = str(pentagon_pct.get('zona', '-'))
        h2_p = float(cast(float, pentagon_pct.get('h2',0)))
        c2h6_p = float(cast(float, pentagon_pct.get('c2h6',0)))
        ch4_p = float(cast(float, pentagon_pct.get('ch4',0)))
        c2h4_p = float(cast(float, pentagon_pct.get('c2h4',0)))
        c2h2_p = float(cast(float, pentagon_pct.get('c2h2',0)))

        pentagon_gases = f"H2:{h2_p}%, C2H6:{c2h6_p}%, CH4:{ch4_p}%, C2H4:{c2h4_p}%, C2H2:{c2h2_p}%"
        
        user_prompt = f"""DATA UJI DGA TRANSFORMATOR:
| Gas | Nilai (ppm) |
|-----|-------------|
| H2 (Hidrogen) | {data.h2} |
| CH4 (Metana) | {data.ch4} |
| C2H6 (Etana) | {data.c2h6} |
| C2H4 (Etilena) | {data.c2h4} |
| C2H2 (Asetilena) | {data.c2h2} |
| CO (Karbon Monoksida) | {data.co} |
| CO2 (Karbon Dioksida) | {data.co2} |
| TDCG | {tdcg} ppm |

=== HASIL ANALISIS ===
1. IEEE C57.104-2019: {ieee_status} ({ieee_note})
2. SPLN T5.004-4:2016: {spln_status} ({spln_note})
3. Duval Pentagon 1: {zona_p} ({pentagon_res})

INSTRUKSI: Susun laporan kesimpulan singkat dan rekomendasi."""
        
        try:
            chat = groq_client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                model="llama-3.3-70b-versatile",
                max_tokens=800,
                temperature=0.3
            )
            volty_chat = chat.choices[0].message.content
        except Exception as e:
            volty_chat = f"Gagal memuat analisis AI: {str(e)}"

    # D. Simpan ke Database (Riwayat Uji)
    if db_active and supabase and not data.skip_db_save:
        try:
            riwayat_record = {
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
                "h2": data.h2,
                "ch4": data.ch4,
                "c2h2": data.c2h2,
                "c2h4": data.c2h4,
                "c2h6": data.c2h6,
                "co": data.co,
                "co2": data.co2,
                "tdcg": tdcg,
                "status_ieee": ieee_status,
                "hasil_ai": volty_chat
            }
            supabase.table("riwayat_uji").insert(riwayat_record).execute()
        except Exception as e:
            print(f"Error saving to riwayat_uji: {e}")

    # E. Return Response
    return {
        "status": "Sukses",
        "tdcg_value": tdcg,
        "ieee_status": ieee_status,
        "ieee_note": ieee_note,
        "spln_status": spln_status,
        "spln_note": spln_note,
        "rogers_diagnosis": rogers_res,
        "rogers_data": {"r1": val_r1, "r2": val_r2, "r5": val_r5},
        "pentagon_diagnosis": pentagon_res,
        "pentagon_data": pentagon_pct,
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
            user_data = cast(Dict[str, Any], user_check.data[0])
            current_role = user_data.get("role", "user")
        
        if current_role != 'super_admin':
            return {"status": "Gagal", "msg": "Hanya Super Admin yang boleh menghapus aset master!"}

        nama_aset = "Unknown Asset"
        asset_data = supabase.table("assets_trafo").select("*").eq("id", asset_id).execute()
        
        if asset_data.data and isinstance(asset_data.data, list) and len(asset_data.data) > 0:
            first_asset = cast(Dict[str, Any], asset_data.data[0])
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
# 8. MANAJEMEN USER (SUPER ADMIN ONLY)
# ==========================================

@app.post("/admin/create-user")
def admin_create_user(data: CreateUserRequest):
    # 1. Pastikan Client Admin Tersedia
    admin_client = supabase_admin
    if admin_client is None: 
        return {"status": "Error", "msg": "Service Key not configured or Supabase offline"}

    # Pastikan Client Public juga ada
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
        
        requester_profile = cast(Dict[str, Any], rows[0])
        
        user_role = requester_profile.get("role")
        if user_role != 'super_admin':
            return {"status": "Gagal", "msg": "Unauthorized: Hanya Super Admin"}

        # 3. Create User di Supabase Auth
        user_attributes = {
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
            "user_metadata": {"role": data.role, "unit_ultg": data.unit_ultg}
        }
        
        new_user = admin_client.auth.admin.create_user(attributes=cast(Any, user_attributes))
        
        # Ambil ID User Baru
        new_user_id = None
        if hasattr(new_user, 'user') and new_user.user:
            new_user_id = new_user.user.id
        
        if not new_user_id:
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
def admin_delete_user(target_id: str, requester_email: str, unit_ultg: str = ""):
    admin_client = supabase_admin
    if admin_client is None: 
        return {"status": "Error", "msg": "Service Key Missing"}
    
    public_client = supabase
    if public_client is None:
        return {"status": "Error", "msg": "Public DB Connection Error"}
    
    try:
        # 2. Cek Super Admin
        check = public_client.table("profiles")\
            .select("role")\
            .eq("email", requester_email)\
            .execute()
            
        rows = check.data
        if not isinstance(rows, list) or len(rows) == 0:
            return {"status": "Gagal", "msg": "Unauthorized"}
        
        requester_profile = cast(Dict[str, Any], rows[0])
            
        if requester_profile.get("role") != 'super_admin':
            return {"status": "Gagal", "msg": "Unauthorized: Bukan Super Admin"}

        # 3. Hapus ULTG terkait (akan cascade delete semua GI)
        ultg_deleted = False
        if unit_ultg and unit_ultg.strip() and unit_ultg != "Kantor Induk":
            try:
                admin_client.table("master_ultg").delete().eq("nama_ultg", unit_ultg).execute()
                ultg_deleted = True
                print(f"✅ ULTG '{unit_ultg}' dan semua GI-nya berhasil dihapus")
            except Exception as ultg_err:
                print(f"⚠️ Gagal hapus ULTG: {ultg_err}")

        # 4. Hapus dari Auth
        admin_client.auth.admin.delete_user(target_id)
        
        # 5. Hapus Profile Manual (Safe Execute)
        try:
            admin_client.table("profiles").delete().eq("id", target_id).execute()
        except:
            pass # Ignore jika sudah terhapus cascade
        
        # 6. Audit Log
        details = f"Menghapus User ID: {target_id}"
        if ultg_deleted:
            details += f" beserta ULTG '{unit_ultg}' dan seluruh GI-nya"
        
        admin_client.table("audit_logs").insert({
            "user_email": requester_email,
            "action": "DELETE_USER",
            "details": details
        }).execute()

        msg = "User berhasil dihapus permanent."
        if ultg_deleted:
            msg = f"User beserta ULTG '{unit_ultg}' dan seluruh GI-nya berhasil dihapus."
        
        return {"status": "Sukses", "msg": msg}
    except Exception as e:
        return {"status": "Error", "msg": str(e)}
    
# ==========================================
# 9. MASTER DATA (ULTG & GI)
# ==========================================

# --- A. GET HIERARCHY ---
@app.get("/master/hierarchy")
def get_master_hierarchy():
    client = supabase
    if client is None: return {}

    try:
        # Ambil nama, lat, lon dari GI
        res = client.table("master_ultg").select("nama_ultg, master_gi(nama_gi, lat, lon)").execute()
        
        rows = res.data
        if not isinstance(rows, list): return {}

        mapping = {}
        for item in rows:
            if not isinstance(item, dict): continue
            item_dict = cast(Dict[str, Any], item)
            
            ultg = str(item_dict.get('nama_ultg', 'Unknown'))
            
            # Ambil GI
            gi_list = item_dict.get('master_gi', [])
            if not isinstance(gi_list, list): gi_list = []

            gis = []
            for g in gi_list:
                if isinstance(g, dict):
                    g_dict = cast(Dict[str, Any], g)
                    gis.append({
                        "name": g_dict.get('nama_gi', 'Unknown'), 
                        "lat": g_dict.get('lat', 0.0), 
                        "lon": g_dict.get('lon', 0.0)
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
        
        user_data = cast(Dict[str, Any], rows[0])
        if user_data.get('role') != 'super_admin':
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
            
        user_data = cast(Dict[str, Any], rows[0])
        if user_data.get('role') != 'super_admin':
            return {"status": "Gagal", "msg": "Unauthorized"}

        # 1. Dapatkan semua GI di bawah ULTG ini
        ultg_res = public_client.table("master_ultg").select("id").eq("nama_ultg", nama_ultg).execute()
        if ultg_res.data and isinstance(ultg_res.data, list) and len(ultg_res.data) > 0:
            ultg_row = cast(Dict[str, Any], ultg_res.data[0])
            ultg_id = ultg_row.get('id')
            
            gi_res = public_client.table("master_gi").select("nama_gi").eq("id_ultg", ultg_id).execute()
            gi_rows = gi_res.data if isinstance(gi_res.data, list) else []
            gi_list = [cast(Dict[str, Any], g)['nama_gi'] for g in gi_rows if isinstance(g, dict)]
            
            # 2. Hapus semua aset trafo dan riwayat uji terkait GI-GI tersebut
            for gi_name in gi_list:
                try:
                    admin_client.table("assets_trafo").delete().eq("lokasi_gi", gi_name).execute()
                    admin_client.table("riwayat_uji").delete().eq("lokasi_gi", gi_name).execute()
                except Exception as del_err:
                    print(f"Warning: Gagal hapus aset/riwayat untuk GI {gi_name}: {del_err}")
        
        # 3. Hapus ULTG (GI akan ikut terhapus jika ada foreign key cascade)
        admin_client.table("master_ultg").delete().eq("nama_ultg", nama_ultg).execute()
        return {"status": "Sukses", "msg": f"ULTG {nama_ultg} beserta semua GI dan aset terkait berhasil dihapus."}
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
        
        user_data = cast(Dict[str, Any], rows[0])
        if user_data.get('role') != 'super_admin':
            return {"status": "Gagal", "msg": "Unauthorized"}

        # Cari ID ULTG
        ultg_res = public_client.table("master_ultg").select("id").eq("nama_ultg", data.nama_ultg).execute()
        
        ultg_rows = ultg_res.data
        if not isinstance(ultg_rows, list) or len(ultg_rows) == 0:
            return {"status": "Gagal", "msg": "ULTG tidak ditemukan"}
        
        # Safe Access ID
        ultg_row = cast(Dict[str, Any], ultg_rows[0])
        ultg_id = ultg_row.get('id')

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
        
        user_data = cast(Dict[str, Any], rows[0])
        if user_data.get('role') != 'super_admin':
            return {"status": "Gagal", "msg": "Unauthorized"}

        ultg_res = public_client.table("master_ultg").select("id").eq("nama_ultg", nama_ultg).execute()
        ultg_rows = ultg_res.data
        if not isinstance(ultg_rows, list) or len(ultg_rows) == 0: return {"status": "Gagal", "msg": "ULTG 404"}
        
        ultg_row = cast(Dict[str, Any], ultg_rows[0])
        ultg_id = ultg_row.get('id')

        # 1. Hapus semua aset trafo terkait GI ini
        try:
            admin_client.table("assets_trafo").delete().eq("lokasi_gi", nama_gi).execute()
        except Exception as asset_err:
            print(f"Warning: Gagal hapus aset untuk GI {nama_gi}: {asset_err}")
        
        # 2. Hapus semua riwayat uji terkait GI ini
        try:
            admin_client.table("riwayat_uji").delete().eq("lokasi_gi", nama_gi).execute()
        except Exception as riwayat_err:
            print(f"Warning: Gagal hapus riwayat untuk GI {nama_gi}: {riwayat_err}")
        
        # 3. Hapus GI
        admin_client.table("master_gi").delete().match({"nama_gi": nama_gi, "id_ultg": ultg_id}).execute()
        return {"status": "Sukses", "msg": f"GI {nama_gi} beserta semua aset dan riwayat terkait berhasil dihapus"}
    except Exception as e:
        return {"status": "Error", "msg": str(e)}