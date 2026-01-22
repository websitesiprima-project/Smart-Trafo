import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# 1. Load Data
df = pd.read_csv('DATASET_RIIL_22-25.csv')

# 2. Fungsi Logika IEEE Key Gas Method (Sederhana)
# Fungsi ini bertugas memberi "Nama Penyakit" ke data Anda
def get_key_gas_diagnosis(row):
    h2 = row['H2']
    ch4 = row['CH4']
    c2h6 = row['C2H6']
    c2h4 = row['C2H4']
    c2h2 = row['C2H2']
    co = row['CO']
    
    # Hitung TDCG dulu untuk cek apakah gas signifikan
    tdcg = h2 + ch4 + c2h6 + c2h4 + c2h2 + co
    
    # Jika gas sangat kecil, anggap Normal (biar AI tidak over-sensitive)
    if tdcg < 720: 
        return "Normal"

    # Prioritas Diagnosa (Key Gas)
    # 1. Arcing (C2H2 ada sedikit saja sudah bahaya)
    if c2h2 > 10 and c2h2 > h2: 
        return "Arcing (High Energy)"
    
    # 2. Overheating Oil (C2H4 dominan)
    if c2h4 > c2h6 and c2h4 > ch4:
        return "Thermal Oil (Overheating)"
    
    # 3. Partial Discharge / Corona (H2 Dominan)
    if h2 > 100 and h2 > ch4 and h2 > c2h4:
        return "Partial Discharge (Corona)"
        
    # 4. Overheating Cellulose (CO Dominan drastis)
    if co > 1000:
        return "Cellulose Degradation (Kertas)"
        
    # Default jika tinggi tapi pola tidak spesifik
    return "General Overheating"

# 3. Terapkan Label Baru ke Data
print("Sedang melakukan Auto-Labeling berdasarkan Key Gas Method...")
df['Fault_Type'] = df.apply(get_key_gas_diagnosis, axis=1)

print("\nContoh Hasil Label Baru:")
print(df[['H2', 'C2H4', 'C2H2', 'CO', 'Label_Diagnosa', 'Fault_Type']].head(10))

# 4. Siapkan Training Data
# Kita pakai 8 Fitur (termasuk TDCG & CO2)
df['TDCG'] = df['H2'] + df['CH4'] + df['C2H6'] + df['C2H4'] + df['C2H2'] + df['CO']
features = ['H2', 'CH4', 'C2H6', 'C2H4', 'C2H2', 'CO', 'CO2', 'TDCG']

X = df[features]
y = df['Fault_Type'] # <-- LABEL BARU KITA!

# 5. Training Random Forest
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 6. Evaluasi
y_pred = model.predict(X_test)
print(f"\n✅ Akurasi Model Key Gas: {accuracy_score(y_test, y_pred) * 100:.2f}%")
print(classification_report(y_test, y_pred))

# 7. Simpan Model
joblib.dump(model, "smart_dga_model_keygas.pkl")
print("Model Key Gas berhasil disimpan!")