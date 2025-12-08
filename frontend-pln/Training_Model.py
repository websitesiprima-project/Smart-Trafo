import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import os

# 1. Load Data
try:
    if not os.path.exists('dataset_trafo.csv'):
        raise FileNotFoundError("File 'dataset_trafo.csv' tidak ditemukan. Pastikan file ada di direktori yang sama.")
    
    df = pd.read_csv('dataset_trafo.csv')
    print(f"Dataset berhasil dimuat: {df.shape[0]} baris, {df.shape[1]} kolom")
except Exception as e:
    print(f"Error saat membaca file: {e}")
    exit()

# 2. Pisahkan Fitur (X) dan Target (y)
fitur = ['H2', 'CH4', 'C2H2', 'C2H4', 'C2H6']
target = 'Status'

# Validasi kolom
for kolom in fitur + [target]:
    if kolom not in df.columns:
        print(f"Error: Kolom '{kolom}' tidak ditemukan dalam dataset. Kolom yang tersedia: {list(df.columns)}")
        exit()

X = df[fitur]
y = df[target]

print(f"Fitur: {fitur}")
print(f"Target: {target}")
print(f"Data yang digunakan: {len(X)} sampel")

# 3. Bagi data untuk belajar (80%) dan ujian (20%)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Pilih Algoritma (Random Forest)
model = RandomForestClassifier(n_estimators=100)

# 5. Latih Model
print("Sedang melatih model...")
model.fit(X_train, y_train)

# 6. Tes Akurasi
prediksi = model.predict(X_test)
akurasi = accuracy_score(y_test, prediksi)
presisi = precision_score(y_test, prediksi, average='weighted', zero_division=0)
recall = recall_score(y_test, prediksi, average='weighted', zero_division=0)
f1 = f1_score(y_test, prediksi, average='weighted', zero_division=0)

print(f"\n=== HASIL EVALUASI MODEL ===")
print(f"Akurasi:  {akurasi * 100:.2f}%")
print(f"Presisi: {presisi * 100:.2f}%")
print(f"Recall:  {recall * 100:.2f}%")
print(f"F1-Score: {f1 * 100:.2f}%")

# 7. Simpan Model agar bisa dipakai di Web
try:
    joblib.dump(model, 'model_trafo.pkl')
    print("\n✓ Model berhasil disimpan sebagai 'model_trafo.pkl'")
    print(f"✓ Ukuran file: {os.path.getsize('model_trafo.pkl') / 1024:.2f} KB")
except Exception as e:
    print(f"Error saat menyimpan model: {e}")