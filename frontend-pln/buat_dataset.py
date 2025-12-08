import pandas as pd
import random

print("Sedang membuat dataset simulasi...")

# Kita simulasikan 1000 data sampel pengujian minyak trafo
data = []

for _ in range(1000):
    # Random nilai gas (dalam ppm - parts per million)
    # Ini logika sederhana: Kalau gas tinggi, status fault
    h2 = random.randint(0, 200)   # Hidrogen
    ch4 = random.randint(0, 150)  # Metana
    c2h2 = random.randint(0, 50)  # Asetilen
    c2h4 = random.randint(0, 150) # Etilen
    c2h6 = random.randint(0, 100) # Etana

    # Logika penentuan status (Sangat disederhanakan untuk simulasi)
    if c2h2 > 10:
        status = "Arcing (Bahaya Tinggi)"
    elif h2 > 100 or ch4 > 120:
        status = "Overheating (Panas Berlebih)"
    elif c2h4 > 100:
        status = "Corona / Partial Discharge"
    else:
        status = "Normal"

    data.append([h2, ch4, c2h2, c2h4, c2h6, status])

# Simpan ke CSV
df = pd.DataFrame(data, columns=['H2', 'CH4', 'C2H2', 'C2H4', 'C2H6', 'Status'])
df.to_csv('dataset_trafo.csv', index=False)
print(f"✓ Dataset dummy berhasil dibuat: dataset_trafo.csv")
print(f"✓ Total baris: {len(df)}")
print(f"✓ Kolom: {list(df.columns)}")
print("\nSample data:")
print(df.head())