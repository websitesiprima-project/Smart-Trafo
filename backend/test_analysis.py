import os
import sys
import pytest
import math

# 1. FIX PATH
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# 2. MOCK ENV
os.environ["GROQ_API_KEY"] = "dummy_key"
os.environ["SUPABASE_URL"] = "https://dummy.supabase.co"
os.environ["SUPABASE_KEY"] = "dummy_key"
os.environ["SUPABASE_SERVICE_KEY"] = "dummy_key"

# 3. IMPORT (Tanpa Duval Triangle)
from main import (
    TrafoInput, 
    hitung_tdcg, 
    analisis_spln, 
    analisis_duval_pentagon, 
    analisis_rogers_ratio, 
    analisis_key_gas,
    analisis_ratio_co2_co
)

# 4. HELPER
def create_trafo(h2=0.0, ch4=0.0, c2h2=0.0, c2h4=0.0, c2h6=0.0, co=0.0, co2=0.0):
    return TrafoInput(h2=h2, ch4=ch4, c2h2=c2h2, c2h4=c2h4, c2h6=c2h6, co=co, co2=co2)

# ==========================================
# UNIT TESTS
# ==========================================

def test_hitung_tdcg():
    data = create_trafo(h2=10.5, ch4=20.0, c2h6=5.0, c2h4=15.0, c2h2=2.0, co=100.0)
    assert hitung_tdcg(data) == 152.5

def test_analisis_spln():
    status, _ = analisis_spln(create_trafo(), 500.0)
    assert "Kondisi 1" in status
    status, _ = analisis_spln(create_trafo(), 5000.0)
    assert "Kondisi 4" in status

def test_analisis_duval_pentagon_zones():
    # Test Zona PD
    data_pd = create_trafo(h2=95.0, ch4=1.0, c2h6=1.0, c2h4=1.0, c2h2=1.0)
    diag, pct = analisis_duval_pentagon(data_pd)
    assert "PD" in pct["zona"]

    # Test Zona S (Stray Gassing)
    data_s = create_trafo(h2=10.0, c2h6=80.0, ch4=5.0, c2h4=3.0, c2h2=2.0)
    diag, pct = analisis_duval_pentagon(data_s)
    assert "S" in pct["zona"]

def test_analisis_rogers_ratio():
    # Test Normal
    # FIX: Ubah c2h2 dari 1.0 menjadi 0.5 agar R2 = 0.05 (R2 < 0.1 terpenuhi)
    data_norm = create_trafo(h2=100.0, ch4=50.0, c2h2=0.5, c2h4=10.0, c2h6=30.0)
    diag, _, _, _ = analisis_rogers_ratio(data_norm)
    assert "Normal" in diag

    # Test Arcing
    data_arc = create_trafo(h2=100.0, ch4=50.0, c2h2=50.0, c2h4=10.0, c2h6=2.0)
    diag, _, _, _ = analisis_rogers_ratio(data_arc)
    assert "Arcing" in diag

def test_analisis_key_gas():
    # Test Overheating Minyak (C2H4 Dominan)
    data = create_trafo(c2h4=500.0, h2=10.0, co=20.0)
    res = analisis_key_gas(data)
    assert "C2H4" in res or "Minyak" in res

def test_analisis_paper_ratio():
    data = create_trafo(co=100.0, co2=200.0) # Ratio 2.0 (<3)
    status, ratio = analisis_ratio_co2_co(data)
    assert ratio == 2.0
    assert "Carbonization" in status