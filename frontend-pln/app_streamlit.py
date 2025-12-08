import streamlit as st
import pandas as pd
import joblib

# ==========================================
# 1. KONFIGURASI HALAMAN & MODEL
# ==========================================
st.set_page_config(
    page_title="Smart Trafo PLN UPT Manado",
    page_icon="⚡",
    layout="wide" # Agar tampilan lebih lebar dan lega
)

# Load Model Machine Learning
try:
    # Pastikan file ini ada di satu folder yang sama
    model = joblib.load('model_trafo.pkl')
except FileNotFoundError:
    st.error("❌ File 'model_trafo.pkl' tidak ditemukan!")
    st.warning("Silakan jalankan script 'training_model.py' terlebih dahulu untuk membuat otak AI-nya.")
    st.stop()

# ==========================================
# 2. FUNGSI LOGIKA (BACKEND)
# ==========================================

def cek_standar_ieee(h2, ch4, c2h2, c2h4, c2h6, co=0):
    """
    Implementasi Sederhana IEEE C57.104 (Key Gas Method & TDCG Limits)
    Output: (Status Kondisi, Diagnosis Jenis Fault)
    """
    diagnosis = "Tidak Terdeteksi Pola Spesifik"
    tdcg = h2 + ch4 + c2h2 + c2h4 + c2h6 + co # Total Dissolved Combustible Gas

    # A. Cek Berdasarkan Level TDCG (Total Gas)
    status_kondisi = "Kondisi 1 (Operasi Normal)"
    if tdcg > 720:
        status_kondisi = "Kondisi 2 (Perlu Perhatian)"
    if tdcg > 1920:
        status_kondisi = "Kondisi 3 (Waspada Tinggi)"
    if tdcg > 4630:
        status_kondisi = "Kondisi 4 (Bahaya/Kerusakan Imminent)"

    # B. Key Gas Method (Menentukan Jenis Kerusakan)
    # 1. Arcing (Busur Api) - Kunci: Asetilen (C2H2)
    if c2h2 > 35: 
        diagnosis = "Arcing (High Energy Discharge)"
    
    # 2. Corona (Partial Discharge) - Kunci: Hidrogen (H2) dominan
    elif h2 > 100 and h2 > ch4 and h2 > c2h4:
        diagnosis = "Corona / Partial Discharge"
        
    # 3. Thermal Fault (Overheating) - Kunci: Etilen (C2H4)
    elif c2h4 > 50 and c2h4 > c2h2:
        diagnosis = "Thermal Fault (Overheating Oil)"
        
    # 4. Overheating Low Temp - Kunci: Metana (CH4) & Etana (C2H6)
    elif ch4 > 120 or c2h6 > 65:
        diagnosis = "Overheating (Low Temp)"
    
    # Jika normal
    elif status_kondisi == "Kondisi 1 (Operasi Normal)":
        diagnosis = "Normal"

    return status_kondisi, diagnosis

# ==========================================
# 3. ANTARMUKA (SIDEBAR INPUT)
# ==========================================

st.sidebar.image("https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg", width=100)
st.sidebar.title("Input Data DGA")
st.sidebar.markdown("Masukkan hasil uji minyak (ppm):")

# Input Field
h2 = st.sidebar.number_input("Hidrogen (H2)", min_value=0.0, value=0.0)
ch4 = st.sidebar.number_input("Metana (CH4)", min_value=0.0, value=0.0)
c2h2 = st.sidebar.number_input("Asetilen (C2H2)", min_value=0.0, value=0.0)
c2h4 = st.sidebar.number_input("Etilen (C2H4)", min_value=0.0, value=0.0)
c2h6 = st.sidebar.number_input("Etana (C2H6)", min_value=0.0, value=0.0)

tombol_analisis = st.sidebar.button("🔍 Analisis Kesehatan Trafo")

# ==========================================
# 4. ANTARMUKA (HALAMAN UTAMA)
# ==========================================

st.title("⚡ Smart-Trafo: Sistem Deteksi Dini")
st.markdown("""
Aplikasi bantu keputusan untuk diagnosis kesehatan Transformator Daya di **PLN UPT Manado**.
Menggunakan metode Hybrid: **Machine Learning** dan **Standar IEEE C57.104**.
""")
st.divider()

if tombol_analisis:
    
    # --- PROSES PERHITUNGAN ---
    
    # 1. Prediksi AI
    input_data = pd.DataFrame([[h2, ch4, c2h2, c2h4, c2h6]], 
                              columns=['H2', 'CH4', 'C2H2', 'C2H4', 'C2H6'])
    hasil_ml = model.predict(input_data)[0]
    
    # 2. Hitungan IEEE
    kondisi_ieee, diagnosis_ieee = cek_standar_ieee(h2, ch4, c2h2, c2h4, c2h6)

    # --- TAMPILAN HASIL (DUA KOLOM) ---
    
    col_ai, col_ieee = st.columns(2)

    # Kolom Kiri: AI
    with col_ai:
        st.subheader("🤖 Prediksi Machine Learning")
        st.caption("Analisis berdasarkan pola data historis")
        
        if "Normal" in hasil_ml:
            st.success(f"**Status: {hasil_ml}**")
        elif "Bahaya" in hasil_ml or "Arcing" in hasil_ml:
            st.error(f"**Status: {hasil_ml}**")
        else:
            st.warning(f"**Status: {hasil_ml}**")

    # Kolom Kanan: IEEE
    with col_ieee:
        st.subheader("📘 Standar IEEE C57.104")
        st.caption("Analisis berdasarkan Key Gas Method & TDCG")
        
        if "Kondisi 1" in kondisi_ieee:
            st.success(f"**{kondisi_ieee}**")
        elif "Kondisi 4" in kondisi_ieee:
            st.error(f"**{kondisi_ieee}**")
        else:
            st.warning(f"**{kondisi_ieee}**")
        
        st.markdown(f"Dugaan Fault: **{diagnosis_ieee}**")

    # --- KESIMPULAN AKHIR & REKOMENDASI ---
    st.divider()
    st.subheader("📝 Rekomendasi Tindakan")
    
    # Logika Gabungan untuk Rekomendasi
    if "Normal" in hasil_ml and "Kondisi 1" in kondisi_ieee:
        st.success("✅ **AMAN.** Trafo dalam kondisi sehat. Tidak diperlukan tindakan khusus.")
    elif "Arcing" in hasil_ml or "Arcing" in diagnosis_ieee:
        st.error("🔴 **BAHAYA KRITIS (ARCING).** Segera lakukan pemadaman darurat dan uji DGA ulang!")
    elif "Overheating" in hasil_ml or "Thermal" in diagnosis_ieee:
        st.warning("⚠️ **OVERHEATING DETECTED.** Kurangi beban trafo dan jadwalkan purifikasi minyak.")
    else:
        st.warning("⚠️ **PERLU PERHATIAN.** Terdeteksi indikasi awal gangguan (Corona/PD). Monitor tren kenaikan gas per minggu.")

    # --- GRAFIK VISUALISASI ---
    st.subheader("📊 Visualisasi Komposisi Gas")
    chart_data = pd.DataFrame({
        'Jenis Gas': ['H2', 'CH4', 'C2H2', 'C2H4', 'C2H6'],
        'Konsentrasi (ppm)': [h2, ch4, c2h2, c2h4, c2h6]
    })
    st.bar_chart(chart_data.set_index('Jenis Gas'))

else:
    # Tampilan awal jika tombol belum ditekan
    st.info("👋 Halo! Silakan masukkan data gas di menu sebelah kiri (Sidebar) untuk memulai analisis.")