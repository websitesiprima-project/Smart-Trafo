/**
 * WHITE BOX TEST untuk PDFGenerator.js
 * Menguji logika kalkulasi DGA dan penentuan kondisi IEEE
 */

import { calculateTDCG, getIEEEKondisi } from "../utils/PDFGenerator";

describe("PDFGenerator Logic - White Box Testing", () => {
  // ============================================
  // 1. CALCULATE TDCG
  // ============================================
  describe("calculateTDCG", () => {
    test("harus menghitung total gas (kecuali CO2) dengan benar", () => {
      const data = {
        h2: 10,
        ch4: 10,
        c2h2: 10,
        c2h4: 10,
        c2h6: 10,
        co: 50,
        co2: 9999,
      };
      // Total = 10+10+10+10+10+50 = 100 (CO2 diabaikan)
      expect(calculateTDCG(data)).toBe(100);
    });

    test("harus menangani nilai null/undefined/string", () => {
      const data = { h2: "10", ch4: null, c2h6: undefined, co: "20.5" };
      // 10 + 0 + 0 + 0 + 0 + 20.5 = 30.5 -> round -> 31
      expect(calculateTDCG(data)).toBe(31);
    });

    test("harus mengembalikan 0 untuk data kosong", () => {
      expect(calculateTDCG({})).toBe(0);
    });

    test("harus menangani nilai negatif", () => {
      const data = { h2: -10, ch4: 50 };
      expect(calculateTDCG(data)).toBe(40);
    });

    test("harus round hasil dengan benar", () => {
      const data = { h2: 10.5, ch4: 20.7, c2h2: 1.3 };
      const result = calculateTDCG(data);
      expect(result).toBeGreaterThanOrEqual(32);
      expect(result).toBeLessThanOrEqual(33);
    });

    test("harus handle nilai sangat besar", () => {
      const data = { h2: 50000, ch4: 100000 };
      expect(calculateTDCG(data)).toBe(150000);
    });
  });

  // ============================================
  // 2. IEEE KONDISI DETERMINATION
  // ============================================
  describe("getIEEEKondisi", () => {
    test("Kondisi 1 (Normal) <= 720", () => {
      expect(getIEEEKondisi(0).kondisi).toBe(1);
      expect(getIEEEKondisi(360).kondisi).toBe(1);
      expect(getIEEEKondisi(720).kondisi).toBe(1);
    });

    test("Kondisi 2 (Waspada) antara 721-1920", () => {
      expect(getIEEEKondisi(721).kondisi).toBe(2);
      expect(getIEEEKondisi(1000).kondisi).toBe(2);
      expect(getIEEEKondisi(1920).kondisi).toBe(2);
    });

    test("Kondisi 3 (Bahaya) > 1920", () => {
      expect(getIEEEKondisi(1921).kondisi).toBe(3);
      expect(getIEEEKondisi(5000).kondisi).toBe(3);
      expect(getIEEEKondisi(50000).kondisi).toBe(3);
    });

    test("harus return text kondisi yang benar", () => {
      expect(getIEEEKondisi(100).text).toBe("Normal");
      expect(getIEEEKondisi(1000).text).toBe("Waspada");
      expect(getIEEEKondisi(3000).text).toBe("Bahaya");
    });

    test("harus return RGB color array", () => {
      const result = getIEEEKondisi(100);
      expect(Array.isArray(result.color)).toBe(true);
      expect(result.color.length).toBe(3);
      expect(result.color.every((c) => typeof c === "number")).toBe(true);
    });

    test("boundary value: TDCG = 720 adalah kondisi 1", () => {
      expect(getIEEEKondisi(720).kondisi).toBe(1);
    });

    test("boundary value: TDCG = 721 adalah kondisi 2", () => {
      expect(getIEEEKondisi(721).kondisi).toBe(2);
    });

    test("boundary value: TDCG = 1920 adalah kondisi 2", () => {
      expect(getIEEEKondisi(1920).kondisi).toBe(2);
    });

    test("boundary value: TDCG = 1921 adalah kondisi 3", () => {
      expect(getIEEEKondisi(1921).kondisi).toBe(3);
    });
  });

  // ============================================
  // 3. DATA FLOW & INTEGRATION TEST
  // ============================================
  describe("Integration: TDCG Calculation -> IEEE Status", () => {
    test("flow: hitung TDCG -> tentukan kondisi", () => {
      const sampleData = {
        h2: 50,
        ch4: 60,
        c2h2: 5,
        c2h4: 30,
        c2h6: 20,
        co: 150,
      };

      const tdcg = calculateTDCG(sampleData);
      expect(tdcg).toBe(315); // 50+60+5+30+20+150

      const kondisi = getIEEEKondisi(tdcg);
      expect(kondisi.kondisi).toBe(1); // 315 <= 720
      expect(kondisi.text).toBe("Normal");
    });

    test("flow: critical condition detection", () => {
      const criticalData = {
        h2: 500,
        ch4: 600,
        c2h2: 100,
        c2h4: 300,
        c2h6: 200,
        co: 400,
      };

      const tdcg = calculateTDCG(criticalData);
      expect(tdcg).toBe(2100); // 500+600+100+300+200+400

      const kondisi = getIEEEKondisi(tdcg);
      expect(kondisi.kondisi).toBe(3); // 2100 > 1920
      expect(kondisi.text).toBe("Bahaya");
    });
  });

  // ============================================
  // 4. EDGE CASES
  // ============================================
  describe("Edge Cases", () => {
    test("harus handle nilai nol di semua field", () => {
      const data = {
        h2: 0,
        ch4: 0,
        c2h2: 0,
        c2h4: 0,
        c2h6: 0,
        co: 0,
      };
      expect(calculateTDCG(data)).toBe(0);
    });

    test("harus handle very small decimal", () => {
      const data = {
        h2: 0.001,
        ch4: 0.002,
      };
      const result = calculateTDCG(data);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    test("getIEEEKondisi untuk TDCG negatif", () => {
      // TDCG 0 atau negatif harus masuk kondisi 1
      const result = getIEEEKondisi(-100);
      expect(result.kondisi).toBe(1);
    });
  });

  // ============================================
  // 5. BUSINESS LOGIC VERIFICATION
  // ============================================
  describe("Business Logic Verification", () => {
    test("TDCG tidak termasuk CO2", () => {
      const dataWithoutCO2 = {
        h2: 100,
        ch4: 100,
        c2h2: 50,
        c2h4: 50,
        c2h6: 50,
        co: 100,
      };

      const dataWithCO2 = {
        ...dataWithoutCO2,
        co2: 50000, // CO2 dalam jumlah besar
      };

      // TDCG harusnya sama karena CO2 tidak dihitung
      expect(calculateTDCG(dataWithoutCO2)).toBe(calculateTDCG(dataWithCO2));
    });

    test("TDCG calculation formula accuracy", () => {
      // IEEE formula: TDCG = H2 + CH4 + C2H2 + C2H4 + C2H6 + CO
      const data = {
        h2: 5,
        ch4: 15,
        c2h2: 2,
        c2h4: 8,
        c2h6: 3,
        co: 67, // Sengaja membuat total = 100
      };

      expect(calculateTDCG(data)).toBe(100);
    });

    test("Status transitions berdasarkan threshold", () => {
      // Test threshold transitions
      const tdcgValues = [
        { tdcg: 719, expectedCondition: 1 },
        { tdcg: 720, expectedCondition: 1 },
        { tdcg: 721, expectedCondition: 2 },
        { tdcg: 1919, expectedCondition: 2 },
        { tdcg: 1920, expectedCondition: 2 },
        { tdcg: 1921, expectedCondition: 3 },
      ];

      tdcgValues.forEach(({ tdcg, expectedCondition }) => {
        expect(getIEEEKondisi(tdcg).kondisi).toBe(expectedCondition);
      });
    });
  });
});
