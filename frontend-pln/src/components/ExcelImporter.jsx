import React, { useState } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ExcelImporter = ({ onImportSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const targetSheets = [
    "Assessment 2022",
    "Assessment 2023",
    "Assessment 2024",
    "Assessment 2025",
    "Assessment 2026",
  ];

  // --- CLEANING HELPER ---
  const cleanInt = (val) => {
    if (!val) return 0;
    const str = String(val).replace(/[^0-9]/g, "");
    return parseInt(str) || 0;
  };

  const cleanFloat = (val) => {
    if (!val || val === "No Data" || val === "-") return 0;
    const str = String(val).replace(/[^0-9.]/g, "");
    return parseFloat(str) || 0;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const binaryStr = evt.target.result;
        const workbook = XLSX.read(binaryStr, {
          type: "binary",
          cellDates: true,
        });

        let aggregatedData = [];

        for (const sheetName of targetSheets) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;

          console.log(`Membaca Sheet: ${sheetName}`);

          // 1. CARI HEADER (Baris yang ada tulisan "SUBSTATION")
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rawData.length, 20); i++) {
            const rowStr = JSON.stringify(rawData[i] || []).toUpperCase();
            if (rowStr.includes("SUBSTATION") && rowStr.includes("H2")) {
              headerIdx = i;
              break;
            }
          }

          if (headerIdx === -1) continue;

          // 2. BACA DATA
          const jsonData = XLSX.utils.sheet_to_json(sheet, {
            range: headerIdx,
            defval: null,
          });

          // 3. MAPPING DATA
          const mappedData = jsonData
            .map((row) => {
              // Normalisasi Key
              const normalized = {};
              Object.keys(row).forEach(
                (k) => (normalized[k.trim().toUpperCase()] = row[k])
              );

              const gi = normalized["SUBSTATION"];
              const unit = normalized["UNIT"];

              // Skip baris kosong / sub-header
              if (!gi || !unit || gi === "SUBSTATION" || unit === "UNIT")
                return null;

              // Tanggal
              let dateStr = `${sheetName.split(" ")[1]}-01-01`; // Default
              if (normalized["TEST DATE"] instanceof Date) {
                dateStr = normalized["TEST DATE"].toISOString().split("T")[0];
              }

              // Bersihkan MVA (karena di excel isinya "Image")
              let mvaVal = normalized["NAMEPLATE"];
              if (!mvaVal || String(mvaVal).includes("Image")) mvaVal = "-";

              return {
                lokasi_gi: String(gi),
                nama_trafo: String(unit),
                tanggal_sampling: dateStr,

                // Data Teknis
                merk_trafo: String(normalized["MERK"] || "-"),
                serial_number: String(normalized["SERIAL NUMBER"] || "-"),
                tahun_pembuatan: cleanInt(normalized["YEAR MANUFACTURE"]),
                level_tegangan: String(normalized["VOLTAGE LEVEL"] || "-"),
                mva: String(mvaVal),
                jenis_minyak: String(normalized["OIL TYPE"] || "Mineral Oil"),

                // Data Wajib Lain
                no_dokumen: `IMPORT-${sheetName}`,
                suhu_sampel: 0,
                diambil_oleh: "Import Excel",

                // Data Gas
                h2: cleanFloat(normalized["H2"]),
                ch4: cleanFloat(normalized["CH4"]),
                c2h2: cleanFloat(normalized["C2H2"]),
                c2h4: cleanFloat(normalized["C2H4"]),
                c2h6: cleanFloat(normalized["C2H6"]),
                co: cleanFloat(normalized["CO"]),
                co2: cleanFloat(normalized["CO2"]),

                // Hasil
                tdcg_value: cleanFloat(normalized["TDCG"]),
                ieee_status: String(
                  normalized["ANALYTIC"] || normalized["ASSESSMENT"] || "Normal"
                ),
              };
            })
            .filter((d) => d !== null);

          aggregatedData = [...aggregatedData, ...mappedData];
        }

        if (aggregatedData.length === 0) {
          toast.error("Tidak ada data valid ditemukan. Cek format Excel.");
          setLoading(false);
          return;
        }

        console.log(`Siap upload ${aggregatedData.length} data.`);
        await sendToBackend(aggregatedData);
      } catch (error) {
        console.error("Excel Error:", error);
        toast.error("File Excel bermasalah.");
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const sendToBackend = async (data) => {
    try {
      let successCount = 0;
      // Sequential Upload (Satu per satu) untuk menghindari Error 422/500
      for (const item of data) {
        if (item.h2 === 0 && item.ch4 === 0 && item.tdcg_value === 0) continue;

        const res = await fetch("http://127.0.0.1:8000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });

        if (res.ok) successCount++;
      }

      toast.success(`Selesai! ${successCount} data berhasil disimpan.`);
      if (onImportSuccess) onImportSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center hover:bg-gray-100 transition-all no-print mb-6">
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileUpload}
        className="hidden"
        id="excel-upload"
        disabled={loading}
      />
      <label
        htmlFor="excel-upload"
        className="cursor-pointer flex flex-col items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin text-blue-500" size={24} />
            <span className="text-xs text-gray-500 font-bold">
              Sedang Mengupload (Mohon Tunggu)...
            </span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="text-green-600" size={24} />
            <span className="text-xs font-bold text-gray-700">
              Klik Disini untuk Upload Excel (2022-2026)
            </span>
          </>
        )}
      </label>
    </div>
  );
};

export default ExcelImporter;
