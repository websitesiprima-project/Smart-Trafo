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
    """
    Analisis Duval Triangle 1 sesuai IEC 60599 & IEEE C57.104-2019
    PENTING: Mempertimbangkan nilai ABSOLUT dan PERSENTASE untuk diagnosis akurat
    """
    total = data.ch4 + data.c2h4 + data.c2h2
    if total == 0:
        return "Gas Kosong (Total 0)", 0, 0, 0

    pct_ch4 = round((data.ch4 / total) * 100, 1)
    pct_c2h4 = round((data.c2h4 / total) * 100, 1)
    pct_c2h2 = round((data.c2h2 / total) * 100, 1)

    diagnosa = "Tidak Teridentifikasi"

    # ================================================================
    # ZONA DISCHARGE (D1, D2) - C2H2 harus signifikan
    # ================================================================
    # D1: Low Energy Discharge (Sparking) - C2H2 > 13%
    if pct_c2h2 > 13 and pct_c2h4 < 23:
        diagnosa = "D1: Discharge of Low Energy (Sparking)"
    # D2: High Energy Discharge (Arcing) - C2H2 > 13% dan C2H4 tinggi
    elif pct_c2h2 > 13 and pct_c2h4 >= 23:
        diagnosa = "D2: Discharge of High Energy (Arcing)"
    
    # ================================================================
    # ZONA DT (Campuran Thermal + Electrical)
    # ================================================================
    elif pct_c2h2 >= 4 and pct_c2h2 <= 13 and pct_c2h4 >= 10:
        diagnosa = "DT: Campuran Thermal & Electrical"
    
    # ================================================================
    # ZONA THERMAL (T1, T2, T3) - C2H2 harus rendah (<4%)
    # PENTING: T3 membutuhkan C2H4 ABSOLUT tinggi, bukan hanya persentase!
    # ================================================================
    # T3: Thermal > 700°C - HARUS C2H4 absolut > 100 ppm DAN persentase dominan
    elif pct_c2h4 >= 50 and pct_c2h2 < 4 and data.c2h4 > 100:
        diagnosa = "T3: Thermal Fault > 700°C"
    
    # T2: Thermal 300-700°C - C2H4 dominan tapi nilai absolut tidak ekstrem
    elif pct_c2h4 >= 50 and pct_c2h2 < 4 and data.c2h4 <= 100:
        # Jika C2H4 absolut rendah (<100), ini T2 bukan T3
        diagnosa = "T2: Thermal Fault 300-700°C"
    elif pct_c2h4 >= 20 and pct_c2h4 < 50 and pct_c2h2 < 4:
        diagnosa = "T2: Thermal Fault 300-700°C"
    
    # T1: Thermal < 300°C - CH4 dominan
    elif pct_ch4 >= 50 and pct_c2h4 < 20 and pct_c2h2 < 4:
        diagnosa = "T1: Thermal Fault < 300°C"
    
    # T1-T2 transisi: Thermal Ringan
    elif pct_c2h4 >= 10 and pct_c2h4 < 20 and pct_c2h2 < 4:
        diagnosa = "T1-T2: Thermal Fault Ringan"
    
    # ================================================================
    # ZONA PD (Partial Discharge) - CH4 sangat dominan
    # ================================================================
    elif pct_ch4 >= 98 and pct_c2h2 < 2 and pct_c2h4 < 2:
        diagnosa = "PD: Partial Discharge"
    
    # ================================================================
    # DEFAULT: Evaluasi berdasarkan gas dominan
    # ================================================================
    else:
        if pct_c2h4 > pct_ch4 and pct_c2h4 > pct_c2h2:
            # C2H4 dominan tapi nilai absolut rendah = thermal ringan-sedang
            if data.c2h4 < 50:
                diagnosa = "T1-T2: Thermal Fault Ringan"
            elif data.c2h4 < 100:
                diagnosa = "T2: Thermal Fault 300-700°C"
            else:
                diagnosa = "T2-T3: Thermal Fault Sedang-Berat"
        elif pct_ch4 > pct_c2h4:
            diagnosa = "T1: Thermal Fault < 300°C"
        else:
            diagnosa = "Indeterminate (Perlu Evaluasi Lanjut)"

    return diagnosa, pct_ch4, pct_c2h4, pct_c2h2

def analisis_ieee_2019(data: TrafoInput):
    """
    Analisis berdasarkan IEEE C57.104-2019 Table 1
    Menggunakan TDCG sebagai indikator utama + evaluasi gas individual
    """
    # Batas IEEE C57.104-2019 (Typical Values - Mineral Oil)
    # Cond 1: Normal | Cond 2: Waspada | Cond 3: Kritis
    LIMITS_COND1 = {'h2': 100, 'ch4': 120, 'c2h6': 65, 'c2h4': 50, 'c2h2': 1, 'co': 350}
    LIMITS_COND2 = {'h2': 200, 'ch4': 400, 'c2h6': 100, 'c2h4': 100, 'c2h2': 2, 'co': 570}
    LIMITS_COND3 = {'h2': 300, 'ch4': 600, 'c2h6': 150, 'c2h4': 200, 'c2h2': 9, 'co': 1400}
    TDCG_LIMITS = {'cond1': 720, 'cond2': 1920, 'cond3': 4630}
    
    diagnosa = []
    status = 1
    
    # Hitung TDCG (Total Dissolved Combustible Gas)
    tdcg = data.h2 + data.ch4 + data.c2h6 + data.c2h4 + data.c2h2 + data.co
    
    # Evaluasi TDCG sebagai indikator utama IEEE
    if tdcg > TDCG_LIMITS['cond3']:
        status = 3
        diagnosa.append(f"TDCG Sangat Tinggi ({int(tdcg)} ppm)")
    elif tdcg > TDCG_LIMITS['cond2']:
        status = 3
        diagnosa.append(f"TDCG Tinggi ({int(tdcg)} ppm)")
    elif tdcg > TDCG_LIMITS['cond1']:
        status = max(status, 2)
        diagnosa.append(f"TDCG Meningkat ({int(tdcg)} ppm)")
    
    # Evaluasi gas individual - hanya tandai jika melewati batas
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
    
    # C2H2 - Evaluasi dengan threshold yang benar
    # PENTING: C2H2 1-9 ppm = monitoring, BUKAN langsung kritis
    if data.c2h2 > LIMITS_COND3['c2h2']:  # > 9 ppm
        diagnosa.append(f"C2H2 Kritis ({data.c2h2} ppm) - Indikasi Arcing Aktif")
        status = 3
    elif data.c2h2 > LIMITS_COND2['c2h2']:  # > 2 ppm tapi <= 9 ppm
        diagnosa.append(f"C2H2 Terdeteksi ({data.c2h2} ppm)")
        status = max(status, 2)
    elif data.c2h2 > LIMITS_COND1['c2h2']:  # > 1 ppm tapi <= 2 ppm
        diagnosa.append(f"C2H2 Trace ({data.c2h2} ppm)")
        status = max(status, 2)
    
    # Kondisi Kritis HANYA jika multiple gas sangat tinggi
    if data.c2h4 > LIMITS_COND3['c2h4'] or data.ch4 > LIMITS_COND3['ch4']: 
        status = 3
    
    status_text = "Normal" if status == 1 else ("Waspada (Cond 2)" if status == 2 else "KRITIS (Cond 3)")
    return status_text, ", ".join(diagnosa) if diagnosa else "Parameter Gas Normal"

def analisis_rogers_ratio(data: TrafoInput):
    """
    Analisis Rogers Ratio Method
    CATATAN: Jika salah satu gas pembagi = 0, rasio tidak valid
    """
    h2 = data.h2
    ch4 = data.ch4
    c2h6 = data.c2h6
    c2h4 = data.c2h4
    c2h2 = data.c2h2

    # Hitung rasio - handle division by zero
    r2 = c2h2 / c2h4 if c2h4 > 0 else -1  # -1 = invalid
    r1 = ch4 / h2 if h2 > 0 else -1
    r5 = c2h4 / c2h6 if c2h6 > 0 else -1

    diagnosis = "Tidak Terdefinisi"
    
    # Jika ada rasio yang tidak valid (pembagi = 0)
    invalid_ratios = []
    if r1 < 0: invalid_ratios.append("R1 (H2=0)")
    if r2 < 0: invalid_ratios.append("R2 (C2H4=0)")
    if r5 < 0: invalid_ratios.append("R5 (C2H6=0)")
    
    if invalid_ratios:
        # Tidak bisa melakukan analisis Rogers yang valid
        diagnosis = f"Rasio Tidak Valid ({', '.join(invalid_ratios)})"
    else:
        # Analisis Rogers standar
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

    # Format output
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
Anda adalah VOLTY, Spesialis Senior Analisis DGA Transformator untuk PLN UPT Manado.

=== ATURAN ANALISIS WAJIB ===
1. Gunakan standar IEEE C57.104-2019 sebagai acuan utama
2. JANGAN membuat klaim berlebihan yang tidak didukung data
3. Perhatikan nilai ABSOLUT gas (ppm), bukan hanya persentase Duval
4. Analisis harus PROPORSIONAL dengan nilai gas yang sebenarnya

=== INTERPRETASI NILAI GAS ===
Gas RENDAH (aman):
- H2 < 100 ppm, CH4 < 120 ppm, C2H4 < 50 ppm, C2H2 < 2 ppm, CO < 350 ppm

Gas MENINGKAT (waspada):
- H2: 100-200, CH4: 120-400, C2H4: 50-100, C2H2: 2-9, CO: 350-570

Gas TINGGI (perlu perhatian):
- H2 > 200, CH4 > 400, C2H4 > 100, C2H2 > 9, CO > 570

=== ATURAN ZONA DUVAL ===
JANGAN sebut "Thermal Fault >700°C" (T3) KECUALI:
- C2H4 absolut > 100 ppm DAN
- C2H4 persentase > 50%

Jika C2H4 hanya 20 ppm dengan persentase tinggi (karena gas lain lebih rendah):
- Ini BUKAN T3, melainkan T1-T2 (thermal ringan-sedang)

=== ATURAN C2H2 ===
- C2H2 < 2 ppm = SANGAT RENDAH, bukan indikasi arcing
- C2H2 2-9 ppm = perlu monitoring, bukan kritis
- C2H2 > 9 ppm = indikasi arcing aktif

=== ATURAN CO & CO2 ===
CO dan CO2 tinggi menunjukkan DEGRADASI SELULOSA (penuaan isolasi kertas)
- Ini BERBEDA dengan thermal fault pada minyak
- Bukan gangguan listrik, tapi penuaan alami

=== FORMAT JAWABAN ===
Bahasa Indonesia, Markdown singkat:
### Diagnosa Singkat
### Hasil Teknis
### Rekomendasi Aksi
"""
        
        # Evaluasi level tiap gas untuk konteks AI
        h2_level = "rendah" if data.h2 < 100 else "meningkat" if data.h2 < 200 else "tinggi"
        ch4_level = "rendah" if data.ch4 < 120 else "meningkat" if data.ch4 < 400 else "tinggi"
        c2h2_level = "sangat rendah" if data.c2h2 < 2 else "rendah" if data.c2h2 < 5 else "sedang" if data.c2h2 < 10 else "tinggi"
        c2h4_level = "rendah" if data.c2h4 < 50 else "sedang" if data.c2h4 < 100 else "tinggi"
        co_level = "normal" if data.co < 350 else "meningkat" if data.co < 570 else "tinggi"
        
        # Info Duval Pentagon
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