import joblib

# Load model
model = joblib.load("smart_dga_model.pkl")

# Cek jumlah fitur
print(f"Jumlah Fitur: {model.n_features_in_}") 
# HARUS MUNCUL ANGKA 7 (H2, CH4, C2H6, C2H4, C2H2, CO, CO2)

# Cek nama fitur (jika ada)
if hasattr(model, "feature_names_in_"):
    print(f"Nama Fitur: {model.feature_names_in_}")