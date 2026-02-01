"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileCheck,
  AlertTriangle,
  Download,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabaseClient";

const API_URL = "http://127.0.0.1:8000";

// Mapping ULTG ke GI
const ULTG_MAPPING = {
  Lopana: [
    "GI AMURANG",
    "GI LOPANA",
    "GI KAWANGKOAN",
    "PLTP LAHENDONG 12",
    "PLTP LAHENDONG 34",
    "GI TOMOHON",
    "GI TASIKRIA",
    "GI TONSEALAMA",
    "GI SAWANGAN",
  ],
  Sawangan: [
    "GI TELING",
    "GIS TELING",
    "GIS SARIO",
    "GI KEMA",
    "GI TANJUNG MERAH",
    "GI BITUNG",
    "GI RANOMUUT",
    "GI PANIKI",
    "GI PANDU",
    "GI LIKUPANG",
    "GI LIKUPANG NEW",
    "GI MSM",
  ],
  Kotamobagu: [
    "PLTU SULUT 1",
    "GI LOLAK",
    "GI MOLIBAGU",
    "GI OTAM",
    "GI TUTUYAN",
  ],
  Gorontalo: [
    "GI MARISA",
    "GI TILAMUTA",
    "GI TOLINGGULA",
    "GI ANGGREK",
    "GI ISIMU",
    "GI GORONTALO BARU",
    "GI BOTUPINGGE",
    "GI BOROKO",
  ],
};

// Mapping kolom Excel ke field API
const COLUMN_MAPPING = {
  "Gardu Induk": "lokasi_gi",
  "Unit Trafo": "nama_trafo",
  "Tanggal Uji": "tanggal_sampling",
  "Petugas": "diambil_oleh",
  "CO": "co",
  "CO2": "co2",
  "H2": "h2",
  "CH4": "ch4",
  "C2H6": "c2h6",
  "C2H4": "c2h4",
  "C2H2": "c2h2",
};

const REQUIRED_COLUMNS = [
  "Gardu Induk",
  "Unit Trafo",
  "Tanggal Uji",
  "CO",
  "CO2",
  "H2",
  "CH4",
  "C2H6",
  "C2H4",
  "C2H2",
];

// Parse berbagai format tanggal (termasuk Excel serial number)
const parseDate = (dateValue) => {
  // Helper to format date as YYYY-MM-DD
  const formatDate = (year, month, day) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  // Get today's date as fallback
  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

  if (!dateValue) return todayStr;

  // Jika berupa number (Excel serial date)
  // Excel serial date: days since 1899-12-30 (ada bug Excel yang menganggap 1900 leap year)
  if (typeof dateValue === "number") {
    // Excel serial to JS Date
    // Excel base date: December 30, 1899
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const jsDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    return formatDate(jsDate.getFullYear(), jsDate.getMonth() + 1, jsDate.getDate());
  }

  // Jika sudah berupa Date object
  if (dateValue instanceof Date) {
    // Add 1 day to fix timezone offset issue with xlsx
    const adjusted = new Date(dateValue.getTime() + 24 * 60 * 60 * 1000);
    return formatDate(adjusted.getFullYear(), adjusted.getMonth() + 1, adjusted.getDate());
  }

  // Jika string
  const str = String(dateValue).trim();

  // Format: "November 18, 2025" atau "November 18 2025"
  const months = {
    january: 1, february: 2, march: 3, april: 4,
    may: 5, june: 6, july: 7, august: 8,
    september: 9, october: 10, november: 11, december: 12,
  };

  // Try: "Month DD, YYYY" or "Month DD YYYY"
  const match1 = str.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (match1) {
    const month = months[match1[1].toLowerCase()];
    if (month) {
      return formatDate(parseInt(match1[3]), month, parseInt(match1[2]));
    }
  }

  // Try: "DD Month YYYY"
  const match1b = str.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
  if (match1b) {
    const month = months[match1b[2].toLowerCase()];
    if (month) {
      return formatDate(parseInt(match1b[3]), month, parseInt(match1b[1]));
    }
  }

  // Try: "DD/MM/YYYY" atau "DD-MM-YYYY"
  const match2 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match2) {
    return formatDate(parseInt(match2[3]), parseInt(match2[2]), parseInt(match2[1]));
  }

  // Try: "YYYY-MM-DD" (sudah benar)
  const match3 = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match3) {
    return formatDate(parseInt(match3[1]), parseInt(match3[2]), parseInt(match3[3]));
  }

  // Try: "MM/DD/YYYY" (format US)
  const match4 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match4) {
    // Assume MM/DD/YYYY format if first number <= 12
    const first = parseInt(match4[1]);
    const second = parseInt(match4[2]);
    if (first <= 12) {
      return formatDate(parseInt(match4[3]), first, second);
    }
  }

  // Default ke hari ini
  return todayStr;
};

const ExcelImportModal = ({ onClose, onSuccess, isDarkMode, userRole, userUnit }) => {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState({ success: 0, failed: 0, errors: [] });
  const [stage, setStage] = useState("upload"); // upload, preview, processing, done
  const [dragOver, setDragOver] = useState(false);
  
  // State for database assets validation
  const [masterAssets, setMasterAssets] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Fetch master assets on mount
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data, error } = await supabase.from("assets_trafo").select("*");
        if (error) throw error;
        if (data) setMasterAssets(data);
      } catch (err) {
        console.error("Error fetching assets:", err);
      }
    };
    fetchAssets();
  }, []);

  const theme = {
    bg: isDarkMode ? "bg-slate-800" : "bg-white",
    text: isDarkMode ? "text-white" : "text-gray-900",
    subText: isDarkMode ? "text-slate-400" : "text-gray-500",
    border: isDarkMode ? "border-slate-700" : "border-gray-200",
    cardBg: isDarkMode ? "bg-slate-900" : "bg-gray-50",
    hoverBg: isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100",
  };

  // Function to download Excel template
  const downloadTemplate = () => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Row 1: Headers
    const headers = ["Gardu Induk", "Unit Trafo", "Tanggal Uji", "Petugas", "CO", "CO2", "H2", "CH4", "C2H6", "C2H4", "C2H2", ""];
    
    // Row 2: Example values with "Ex:" prefix and note
    const exampleRow = ["Ex: GI Teling", "Ex: TD #1", "Ex: 18/11/2025", "Ex: Ivan", "Ex: 121", "Ex: 122", "Ex: 123", "Ex: 124", "Ex: 125", "Ex: 126", "Ex: 127", "<- untuk bagian ini dihapus karena hanya contoh"];
    
    // Create template with headers, example, and empty rows
    const templateData = [headers, exampleRow];
    for (let i = 0; i < 0; i++) {
      templateData.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, // Gardu Induk
      { wch: 12 }, // Unit Trafo
      { wch: 18 }, // Tanggal Uji
      { wch: 12 }, // Petugas
      { wch: 10 }, // CO
      { wch: 10 }, // CO2
      { wch: 10 }, // H2
      { wch: 10 }, // CH4
      { wch: 10 }, // C2H6
      { wch: 10 }, // C2H4
      { wch: 10 }, // C2H2
      { wch: 25 }, // Note column
    ];
    
    // Add light blue background to header cells (A1:K1)
    const headerStyle = {
      fill: { fgColor: { rgb: "DAEEF3" } }, // Light blue
      font: { bold: true },
    };
    
    const headerCells = ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1", "I1", "J1", "K1"];
    headerCells.forEach((cellRef) => {
      if (ws[cellRef]) {
        ws[cellRef].s = headerStyle;
      }
    });
    
    XLSX.utils.book_append_sheet(wb, ws, "Data DGA");
    
    // Generate and download
    XLSX.writeFile(wb, "Template_Import_DGA.xlsx");
  };

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
      setErrors(["File harus berformat Excel (.xlsx atau .xls)"]);
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    setValidationErrors([]);

    // Parse Excel
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        // cellDates: false - we handle date parsing ourselves to avoid timezone issues
        const workbook = XLSX.read(data, { type: "array", cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: 0 });

        if (jsonData.length === 0) {
          setErrors(["File Excel kosong atau tidak memiliki data."]);
          return;
        }

        // Validasi kolom
        const headers = Object.keys(jsonData[0]);
        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !headers.some((h) => h.toLowerCase().trim() === col.toLowerCase())
        );

        if (missingColumns.length > 0) {
          setErrors([`Kolom tidak ditemukan: ${missingColumns.join(", ")}`]);
          return;
        }

        // Transform data and validate against database
        const valErrors = [];
        const transformed = jsonData.map((row, idx) => {
          const newRow = { _rowNum: idx + 2 }; // +2 karena header + 1-indexed

          Object.entries(COLUMN_MAPPING).forEach(([excelCol, apiField]) => {
            // Cari kolom dengan case-insensitive
            const matchedKey = Object.keys(row).find(
              (k) => k.toLowerCase().trim() === excelCol.toLowerCase()
            );

            if (matchedKey) {
              let value = row[matchedKey];

              // Parse tanggal
              if (apiField === "tanggal_sampling") {
                value = parseDate(value);
              }
              // Parse angka untuk gas
              else if (["co", "co2", "h2", "ch4", "c2h6", "c2h4", "c2h2"].includes(apiField)) {
                value = parseFloat(value) || 0;
              }

              newRow[apiField] = value;
            }
          });

          // Validate and normalize GI and Trafo against database (case-insensitive)
          const inputGI = String(newRow.lokasi_gi || "").trim();
          const inputTrafo = String(newRow.nama_trafo || "").trim();

          // Skip example rows (starting with "Ex:")
          if (inputGI.toLowerCase().startsWith("ex:") || inputTrafo.toLowerCase().startsWith("ex:")) {
            newRow._isExample = true;
            return newRow;
          }

          // Helper function to normalize GI name for flexible matching
          const normalizeGI = (gi) => {
            const normalized = gi.toLowerCase().trim();
            // Remove "gi " prefix if exists for comparison
            if (normalized.startsWith("gi ")) {
              return normalized.substring(3).trim();
            }
            return normalized;
          };

          // Find matching asset in database with flexible GI matching
          // Try multiple matching strategies:
          // 1. Exact case-insensitive match
          // 2. Match without "GI " prefix (user types "Teling" → matches "GI Teling")
          // 3. Match with added "GI " prefix (user types "GI TELING" → matches "GI Teling")
          let matchedAsset = null;
          const inputGINormalized = normalizeGI(inputGI);
          const inputTrafoLower = inputTrafo.toLowerCase();

          for (const asset of masterAssets) {
            const dbGINormalized = normalizeGI(asset.lokasi_gi);
            const dbTrafoLower = asset.nama_trafo.toLowerCase();

            // Check if GI matches (normalized comparison)
            const giMatches = 
              asset.lokasi_gi.toLowerCase() === inputGI.toLowerCase() || // Exact match
              dbGINormalized === inputGINormalized; // Normalized match (without GI prefix)

            // Check if Trafo matches
            const trafoMatches = dbTrafoLower === inputTrafoLower;

            if (giMatches && trafoMatches) {
              matchedAsset = asset;
              break;
            }
          }

          if (matchedAsset) {
            // Use the proper casing from database
            newRow.lokasi_gi = matchedAsset.lokasi_gi;
            newRow.nama_trafo = matchedAsset.nama_trafo;
            newRow.merk_trafo = matchedAsset.merk || "";
            newRow.serial_number = matchedAsset.serial_number || "";
            newRow.level_tegangan = matchedAsset.level_tegangan || "";
            newRow.tahun_pembuatan = matchedAsset.tahun_pembuatan || "";
            newRow._isValid = true;
          } else {
            // Check if GI exists but trafo doesn't (with flexible matching)
            const giExists = masterAssets.some((asset) => {
              const dbGINormalized = normalizeGI(asset.lokasi_gi);
              return (
                asset.lokasi_gi.toLowerCase() === inputGI.toLowerCase() ||
                dbGINormalized === inputGINormalized
              );
            });
            
            if (!giExists) {
              valErrors.push({
                row: idx + 2,
                gi: inputGI,
                trafo: inputTrafo,
                type: "gi_not_found",
                message: `Gardu Induk "${inputGI}" tidak terdaftar`
              });
            } else {
              valErrors.push({
                row: idx + 2,
                gi: inputGI,
                trafo: inputTrafo,
                type: "trafo_not_found",
                message: `Unit Trafo "${inputTrafo}" di ${inputGI} tidak terdaftar`
              });
            }
            newRow._isValid = false;
          }

          // Default values
          newRow.no_dokumen = "-";
          if (!newRow.merk_trafo) newRow.merk_trafo = "";
          if (!newRow.serial_number) newRow.serial_number = "";
          if (!newRow.level_tegangan) newRow.level_tegangan = "";
          newRow.mva = "";
          if (!newRow.tahun_pembuatan) newRow.tahun_pembuatan = "";
          newRow.suhu_sampel = 0;

          return newRow;
        });

        // Filter out example rows
        const validData = transformed.filter((row) => !row._isExample);
        
        // 🔥 VALIDASI ULTG: Cek apakah user berhak mengisi GI tersebut
        if (userRole !== "super_admin" && userUnit) {
          const allowedGIs = ULTG_MAPPING[userUnit] || [];
          const ultgErrors = [];

          validData.forEach((row, idx) => {
            if (!row._isValid) return; // Skip jika sudah invalid dari validasi database

            const rowGI = (row.lokasi_gi || "").trim();
            const isAllowed = allowedGIs.some(
              (allowed) =>
                rowGI.toLowerCase().includes(allowed.toLowerCase()) ||
                allowed.toLowerCase().includes(rowGI.toLowerCase())
            );

            if (!isAllowed) {
              ultgErrors.push({
                row: row._rowNum,
                gi: rowGI,
                trafo: row.nama_trafo,
                type: "ultg_unauthorized",
                message: `GI "${rowGI}" bukan bagian dari ULTG ${userUnit}. Hanya Super Admin yang dapat mengisi data ke semua GI.`
              });
            }
          });

          // Gabungkan error ULTG dengan validation errors lainnya
          if (ultgErrors.length > 0) {
            valErrors.push(...ultgErrors);
          }
        }
        
        // Check for validation errors
        if (valErrors.length > 0) {
          setValidationErrors(valErrors);
          setShowValidationModal(true);
          return;
        }

        setParsedData(validData);
        setStage("preview");
      } catch (err) {
        console.error("Parse error:", err);
        setErrors(["Gagal membaca file Excel. Pastikan format file benar."]);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }, [masterAssets]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const startImport = async () => {
    setStage("processing");
    setIsProcessing(true);
    setProgress({ current: 0, total: parsedData.length });
    setResults({ success: 0, failed: 0, errors: [] });

    let success = 0;
    let failed = 0;
    const importErrors = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      setProgress({ current: i + 1, total: parsedData.length });

      try {
        const payload = { ...row };
        // Remove internal tracking fields
        delete payload._rowNum;
        delete payload._isValid;
        delete payload._isExample;

        console.log("Sending payload:", payload); // Debug log

        const res = await fetch(`${API_URL}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const result = await res.json();
        if (result.status === "Sukses") {
          success++;
        } else {
          throw new Error(result.msg || "Unknown error");
        }
      } catch (err) {
        failed++;
        importErrors.push({
          row: row._rowNum,
          gi: row.lokasi_gi,
          trafo: row.nama_trafo,
          error: err.message,
        });
      }

      // Delay untuk menghindari rate limit
      if (i < parsedData.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setResults({ success, failed, errors: importErrors });
    setIsProcessing(false);
    setStage("done");
  };

  const handleClose = () => {
    if (stage === "done" && results.success > 0) {
      onSuccess();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`w-full max-w-4xl rounded-2xl shadow-2xl ${theme.bg} max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${theme.border}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <FileSpreadsheet className="text-green-500" size={24} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${theme.text}`}>Import Data Excel</h2>
              <p className={`text-xs ${theme.subText}`}>
                {stage === "upload" && "Upload file Excel dengan data DGA"}
                {stage === "preview" && `${parsedData.length} data siap diimport`}
                {stage === "processing" && `Memproses ${progress.current}/${progress.total}...`}
                {stage === "done" && `Selesai: ${results.success} berhasil, ${results.failed} gagal`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className={`p-2 rounded-full transition ${theme.hoverBg} ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <X size={20} className={theme.subText} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Stage: Upload */}
          {stage === "upload" && (
            <div className="space-y-6">
              {/* Drag & Drop Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragOver
                    ? "border-green-500 bg-green-500/5"
                    : `${theme.border} ${theme.cardBg}`
                }`}
              >
                <Upload className={`mx-auto mb-4 ${dragOver ? "text-green-500" : theme.subText}`} size={48} />
                <p className={`font-medium mb-2 ${theme.text}`}>
                  Drag & drop file Excel di sini
                </p>
                <p className={`text-sm mb-4 ${theme.subText}`}>atau</p>
                <label className="inline-block px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium cursor-pointer transition">
                  Pilih File
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                <p className={`text-xs mt-4 ${theme.subText}`}>
                  Format: .xlsx atau .xls
                </p>

                {errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    {errors.map((err, i) => (
                      <p key={i} className="text-sm text-red-500 flex items-center gap-2">
                        <AlertCircle size={16} /> {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Template Preview */}
              <div className={`rounded-xl border overflow-hidden ${theme.border}`}>
                <div className={`px-4 py-3 border-b ${theme.border} ${isDarkMode ? "bg-slate-900" : "bg-gray-100"} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
                  <div>
                    <h3 className={`font-bold text-sm flex items-center gap-2 ${theme.text}`}>
                      <FileSpreadsheet size={16} className="text-green-500" />
                      Contoh Format Template Excel
                    </h3>
                    <p className={`text-xs mt-1 ${theme.subText}`}>
                      Pastikan file Excel Anda memiliki kolom dengan nama persis seperti di bawah ini
                    </p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-xs flex items-center gap-2 transition whitespace-nowrap"
                  >
                    <Download size={14} />
                    Download Template
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className={isDarkMode ? "bg-slate-800" : "bg-gray-50"}>
                      <tr>
                        <th className={`px-3 py-2 text-left font-bold border-r ${theme.border} ${theme.text}`}>Gardu Induk</th>
                        <th className={`px-3 py-2 text-left font-bold border-r ${theme.border} ${theme.text}`}>Unit Trafo</th>
                        <th className={`px-3 py-2 text-left font-bold border-r ${theme.border} ${theme.text}`}>Tanggal Uji</th>
                        <th className={`px-3 py-2 text-left font-bold border-r ${theme.border} ${theme.text}`}>Petugas</th>
                        <th className={`px-3 py-2 text-center font-bold border-r ${theme.border} text-blue-500`}>CO</th>
                        <th className={`px-3 py-2 text-center font-bold border-r ${theme.border} text-blue-500`}>CO2</th>
                        <th className={`px-3 py-2 text-center font-bold border-r ${theme.border} text-green-500`}>H2</th>
                        <th className={`px-3 py-2 text-center font-bold border-r ${theme.border} text-green-500`}>CH4</th>
                        <th className={`px-3 py-2 text-center font-bold border-r ${theme.border} text-orange-500`}>C2H6</th>
                        <th className={`px-3 py-2 text-center font-bold border-r ${theme.border} text-orange-500`}>C2H4</th>
                        <th className={`px-3 py-2 text-center font-bold text-red-500`}>C2H2</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme.border}`}>
                      <tr className={theme.hoverBg}>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.text}`}>GI Teling</td>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.text}`}>TD #1</td>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.subText}`}>November 18, 2025</td>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.subText}`}>M Ifan</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>199</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>631</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>0</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>5</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>2</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>4</td>
                        <td className={`px-3 py-2 text-center font-mono ${theme.text}`}>0</td>
                      </tr>
                      <tr className={theme.hoverBg}>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.text}`}>GI Teling</td>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.text}`}>TD #2</td>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.subText}`}>November 18, 2025</td>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.subText}`}>M Ifan</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>113</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>577</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>0</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>1</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>4</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} font-mono ${theme.text}`}>4</td>
                        <td className={`px-3 py-2 text-center font-mono ${theme.text}`}>0</td>
                      </tr>
                      <tr className={`${theme.hoverBg} ${isDarkMode ? "bg-slate-800/50" : "bg-gray-50/50"}`}>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.subText} italic`}>...</td>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.subText} italic`}>...</td>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.subText} italic`}>...</td>
                        <td className={`px-3 py-2 border-r ${theme.border} ${theme.subText} italic`}>...</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} ${theme.subText} italic`}>...</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} ${theme.subText} italic`}>...</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} ${theme.subText} italic`}>...</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} ${theme.subText} italic`}>...</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} ${theme.subText} italic`}>...</td>
                        <td className={`px-3 py-2 text-center border-r ${theme.border} ${theme.subText} italic`}>...</td>
                        <td className={`px-3 py-2 text-center ${theme.subText} italic`}>...</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className={`px-4 py-3 border-t ${theme.border} ${isDarkMode ? "bg-blue-500/5" : "bg-blue-50"}`}>
                  <p className={`text-xs ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                    <strong>Catatan:</strong> Kolom "Petugas" bersifat opsional. Format tanggal yang didukung: "November 18, 2025", "18/11/2025", atau "2025-11-18".
                    Nilai gas dalam satuan <strong>ppm</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stage: Preview */}
          {stage === "preview" && (
            <div className="space-y-4">
              <div className={`flex items-center gap-2 p-3 rounded-lg ${isDarkMode ? "bg-green-500/10" : "bg-green-50"}`}>
                <FileCheck className="text-green-500" size={20} />
                <span className={`text-sm font-medium ${theme.text}`}>
                  {file?.name} - {parsedData.length} baris data
                </span>
              </div>

              <div className={`rounded-xl border overflow-hidden ${theme.border}`}>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className={`sticky top-0 ${isDarkMode ? "bg-slate-900" : "bg-gray-100"}`}>
                      <tr>
                        <th className={`px-3 py-2 text-left font-bold ${theme.text}`}>#</th>
                        <th className={`px-3 py-2 text-left font-bold ${theme.text}`}>Gardu Induk</th>
                        <th className={`px-3 py-2 text-left font-bold ${theme.text}`}>Unit Trafo</th>
                        <th className={`px-3 py-2 text-left font-bold ${theme.text}`}>Tanggal</th>
                        <th className={`px-3 py-2 text-left font-bold ${theme.text}`}>Petugas</th>
                        <th className={`px-3 py-2 text-right font-bold ${theme.text}`}>CO</th>
                        <th className={`px-3 py-2 text-right font-bold ${theme.text}`}>CO2</th>
                        <th className={`px-3 py-2 text-right font-bold ${theme.text}`}>H2</th>
                        <th className={`px-3 py-2 text-right font-bold ${theme.text}`}>CH4</th>
                        <th className={`px-3 py-2 text-right font-bold ${theme.text}`}>C2H6</th>
                        <th className={`px-3 py-2 text-right font-bold ${theme.text}`}>C2H4</th>
                        <th className={`px-3 py-2 text-right font-bold ${theme.text}`}>C2H2</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme.border}`}>
                      {parsedData.map((row, idx) => (
                        <tr key={idx} className={theme.hoverBg}>
                          <td className={`px-3 py-2 ${theme.subText}`}>{idx + 1}</td>
                          <td className={`px-3 py-2 font-medium ${theme.text}`}>{row.lokasi_gi}</td>
                          <td className={`px-3 py-2 ${theme.text}`}>{row.nama_trafo}</td>
                          <td className={`px-3 py-2 ${theme.subText}`}>{row.tanggal_sampling}</td>
                          <td className={`px-3 py-2 ${theme.subText}`}>{row.diambil_oleh || "-"}</td>
                          <td className={`px-3 py-2 text-right font-mono ${theme.text}`}>{row.co}</td>
                          <td className={`px-3 py-2 text-right font-mono ${theme.text}`}>{row.co2}</td>
                          <td className={`px-3 py-2 text-right font-mono ${theme.text}`}>{row.h2}</td>
                          <td className={`px-3 py-2 text-right font-mono ${theme.text}`}>{row.ch4}</td>
                          <td className={`px-3 py-2 text-right font-mono ${theme.text}`}>{row.c2h6}</td>
                          <td className={`px-3 py-2 text-right font-mono ${theme.text}`}>{row.c2h4}</td>
                          <td className={`px-3 py-2 text-right font-mono ${theme.text}`}>{row.c2h2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`flex items-start gap-2 p-3 rounded-lg ${isDarkMode ? "bg-amber-500/10" : "bg-amber-50"}`}>
                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
                <p className={`text-xs ${isDarkMode ? "text-amber-400" : "text-amber-700"}`}>
                  <strong>Perhatian:</strong> Proses import akan memanggil AI untuk setiap data. 
                  Untuk {parsedData.length} data, estimasi waktu ~{Math.ceil(parsedData.length * 0.6 / 60)} menit.
                  Jangan tutup browser selama proses berlangsung.
                </p>
              </div>
            </div>
          )}

          {/* Stage: Processing */}
          {stage === "processing" && (
            <div className="text-center py-10">
              <Loader2 className="mx-auto mb-4 animate-spin text-green-500" size={48} />
              <p className={`font-bold text-lg mb-2 ${theme.text}`}>
                Memproses Data...
              </p>
              <p className={`text-sm mb-6 ${theme.subText}`}>
                {progress.current} dari {progress.total} data
              </p>
              <div className={`w-full max-w-md mx-auto h-3 rounded-full overflow-hidden ${theme.cardBg}`}>
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className={`text-xs mt-4 ${theme.subText}`}>
                Mohon tunggu, AI sedang menganalisis setiap data...
              </p>
            </div>
          )}

          {/* Stage: Done */}
          {stage === "done" && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <CheckCircle className="mx-auto mb-4 text-green-500" size={56} />
                <p className={`font-bold text-xl mb-2 ${theme.text}`}>Import Selesai!</p>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="text-center">
                    <p className="text-3xl font-black text-green-500">{results.success}</p>
                    <p className={`text-xs ${theme.subText}`}>Berhasil</p>
                  </div>
                  {results.failed > 0 && (
                    <div className="text-center">
                      <p className="text-3xl font-black text-red-500">{results.failed}</p>
                      <p className={`text-xs ${theme.subText}`}>Gagal</p>
                    </div>
                  )}
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className={`rounded-xl border p-4 ${theme.border}`}>
                  <p className={`font-bold text-sm mb-3 ${theme.text}`}>Detail Error:</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {results.errors.map((err, i) => (
                      <div key={i} className={`text-xs p-2 rounded ${isDarkMode ? "bg-red-500/10" : "bg-red-50"}`}>
                        <span className="text-red-500 font-medium">Baris {err.row}:</span>{" "}
                        <span className={theme.subText}>{err.gi} - {err.trafo}</span>{" "}
                        <span className="text-red-400">({err.error})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-5 border-t ${theme.border} flex justify-end gap-3`}>
          {stage === "upload" && (
            <button
              onClick={onClose}
              className={`px-5 py-2.5 rounded-lg font-medium transition ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
            >
              Batal
            </button>
          )}

          {stage === "preview" && (
            <>
              <button
                onClick={() => { setStage("upload"); setFile(null); setParsedData([]); }}
                className={`px-5 py-2.5 rounded-lg font-medium transition ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
              >
                Ganti File
              </button>
              <button
                onClick={startImport}
                className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition flex items-center gap-2"
              >
                <Upload size={18} />
                Mulai Import ({parsedData.length} data)
              </button>
            </>
          )}

          {stage === "done" && (
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition"
            >
              Selesai
            </button>
          )}
        </div>
      </div>

      {/* Validation Error Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className={`${theme.bg} rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden border ${theme.border}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <XCircle className="text-white" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Data Tidak Valid</h3>
                  <p className="text-white/80 text-sm">Ditemukan {validationErrors.length} data yang tidak terdaftar</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 max-h-[50vh] overflow-y-auto">
              <div className={`p-4 rounded-xl mb-4 ${isDarkMode ? "bg-orange-500/10 border border-orange-500/30" : "bg-orange-50 border border-orange-200"}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-orange-500 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <p className={`font-semibold ${isDarkMode ? "text-orange-400" : "text-orange-700"}`}>
                      Data tidak dapat diproses
                    </p>
                    <p className={`text-sm mt-1 ${isDarkMode ? "text-orange-300/80" : "text-orange-600"}`}>
                      Silahkan perbaiki data yang ditandai atau hubungi admin UPT Manado
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {validationErrors.map((err, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg border ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-200"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDarkMode ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"}`}>
                        Baris {err.row}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        err.type === "gi_not_found" 
                          ? (isDarkMode ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600")
                          : err.type === "ultg_unauthorized"
                            ? (isDarkMode ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600")
                            : (isDarkMode ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-600")
                      }`}>
                        {err.type === "gi_not_found" 
                          ? "GI tidak terdaftar" 
                          : err.type === "ultg_unauthorized"
                            ? "Akses Ditolak"
                            : "Trafo tidak terdaftar"}
                      </span>
                    </div>
                    <div className={`text-sm ${theme.text} ${err.type === "ultg_unauthorized" ? "font-semibold" : ""}`}>
                      {err.type === "ultg_unauthorized" ? (
                        <div>
                          <p className="text-red-500 font-bold mb-1">⛔ {err.message}</p>
                          <p className="text-xs opacity-70">
                            <span className="font-medium">GI:</span> {err.gi} • <span className="font-medium">Trafo:</span> {err.trafo}
                          </p>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium">GI:</span> {err.gi} • <span className="font-medium">Trafo:</span> {err.trafo}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className={`p-5 border-t ${theme.border} flex gap-3`}>
              <button
                onClick={() => { setShowValidationModal(false); setValidationErrors([]); setFile(null); }}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
              >
                Tutup & Perbaiki File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelImportModal;
