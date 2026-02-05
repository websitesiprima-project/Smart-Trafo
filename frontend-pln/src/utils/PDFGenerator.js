import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ============================================
// KONSTANTA WARNA
// ============================================

// Warna IEEE C57.104-2019
const IEEE_COLORS = {
  kondisi1: [0, 128, 0], // Hijau biasa
  kondisi2: [204, 153, 0], // Kuning tua
  kondisi3: [178, 34, 34], // Merah darah
};

// Warna SPLN T5.004-4:2016
const SPLN_COLORS = {
  kondisi1: [0, 128, 0], // Hijau
  kondisi2: [255, 140, 0], // Orange
  kondisi3: [255, 64, 30], // Merah muda (pink)
  kondisi4: [128, 0, 0], // Merah maroon/tua
};

// Warna status SPLN untuk tabel Panduan
const SPLN_STATUS_COLORS = {
  veryGood: [144, 238, 144], // Hijau muda (light green)
  good: [34, 139, 34], // Hijau tua (forest green)
  fair: [255, 140, 0], // Orange
  poor: [255, 105, 180], // Merah muda (pink)
  critical: [139, 0, 0], // Merah tua (dark red)
};

// Batas IEEE C57.104-2019
const IEEE_LIMITS = {
  h2: 100,
  ch4: 120,
  c2h2: 1,
  c2h4: 50,
  c2h6: 65,
  co: 350,
  co2: 2500,
};

// ============================================
// FUNGSI UTILITAS
// ============================================

// Fungsi untuk menghitung TDCG (Total Dissolved Combustible Gas) - tanpa CO2
export const calculateTDCG = (data) => {
  return Math.round(
    (parseFloat(data.h2) || 0) +
      (parseFloat(data.ch4) || 0) +
      (parseFloat(data.c2h2) || 0) +
      (parseFloat(data.c2h4) || 0) +
      (parseFloat(data.c2h6) || 0) +
      (parseFloat(data.co) || 0),
  );
};

// Fungsi untuk menentukan kondisi IEEE berdasarkan TDCG
export const getIEEEKondisi = (tdcg) => {
  if (tdcg <= 720) {
    return { kondisi: 1, text: "Normal", color: IEEE_COLORS.kondisi1 };
  } else if (tdcg <= 1920) {
    return { kondisi: 2, text: "Waspada", color: IEEE_COLORS.kondisi2 };
  } else {
    return { kondisi: 3, text: "Bahaya", color: IEEE_COLORS.kondisi3 };
  }
};

// Fungsi untuk parse kondisi IEEE dari status_ieee yang sudah dianalisis oleh AI
const parseIEEEStatusFromAI = (statusIeee, tdcg) => {
  if (!statusIeee) {
    return getIEEEKondisi(tdcg);
  }

  const status = statusIeee.toUpperCase();

  // Cek kondisi 3 (Bahaya/Kritis)
  if (
    status.includes("KRITIS") ||
    status.includes("COND 3") ||
    status.includes("CONDITION 3") ||
    status.includes("BAHAYA")
  ) {
    return { kondisi: 3, text: "Bahaya", color: IEEE_COLORS.kondisi3 };
  }

  // Cek kondisi 2 (Waspada)
  if (
    status.includes("WASPADA") ||
    status.includes("COND 2") ||
    status.includes("CONDITION 2") ||
    status.includes("CAUTION")
  ) {
    return { kondisi: 2, text: "Waspada", color: IEEE_COLORS.kondisi2 };
  }

  // Cek kondisi 1 (Normal)
  if (
    status.includes("NORMAL") ||
    status.includes("COND 1") ||
    status.includes("CONDITION 1")
  ) {
    return { kondisi: 1, text: "Normal", color: IEEE_COLORS.kondisi1 };
  }

  // Fallback ke perhitungan TDCG jika tidak terdeteksi
  return getIEEEKondisi(tdcg);
};

// Fungsi untuk menentukan kondisi SPLN berdasarkan TDCG
const getSPLNKondisi = (tdcg) => {
  if (tdcg <= 720) {
    return { kondisi: 1, text: "Normal", color: SPLN_COLORS.kondisi1 };
  } else if (tdcg <= 1920) {
    return { kondisi: 2, text: "Waspada", color: SPLN_COLORS.kondisi2 };
  } else if (tdcg <= 4630) {
    return { kondisi: 3, text: "Peringatan", color: SPLN_COLORS.kondisi3 };
  } else {
    return { kondisi: 4, text: "Bahaya", color: SPLN_COLORS.kondisi4 };
  }
};

// Fungsi untuk mendapatkan status SPLN per gas
const getSPLNGasStatus = (gas, value) => {
  const v = parseFloat(value) || 0;
  const limits = {
    h2: { veryGood: 30, good: 99, fair: 699, poor: 1800 },
    ch4: { veryGood: 121, good: 400, fair: 1200, poor: 1500 },
    c2h2: { veryGood: 0, good: 1, fair: 10, poor: 35 },
    c2h4: { veryGood: 20, good: 50, fair: 100, poor: 200 },
    c2h6: { veryGood: 65, good: 100, fair: 200, poor: 500 },
    co: { veryGood: 350, good: 570, fair: 2500, poor: 5000 },
    co2: { veryGood: 2500, good: 4000, fair: 10000, poor: 17500 },
  };

  const l = limits[gas];
  if (!l) return { status: "N/A", color: [128, 128, 128] };

  if (v <= l.veryGood)
    return { status: "Very Good", color: SPLN_STATUS_COLORS.veryGood };
  if (v <= l.good) return { status: "Good", color: SPLN_STATUS_COLORS.good };
  if (v <= l.fair) return { status: "Fair", color: SPLN_STATUS_COLORS.fair };
  if (v <= l.poor) return { status: "Poor", color: SPLN_STATUS_COLORS.poor };
  return { status: "Critical", color: SPLN_STATUS_COLORS.critical };
};

// Fungsi untuk menentukan kondisi IEEE lama (untuk backward compatibility)
const getKondisi = (status, data) => {
  const tdcg = calculateTDCG(data);
  return getIEEEKondisi(tdcg);
};

// Fungsi untuk generate kesimpulan otomatis berdasarkan data DGA
const generateAutoKesimpulan = (data) => {
  const tdcg = calculateTDCG(data);
  const kondisi = getIEEEKondisi(tdcg);

  let kesimpulan = `Berdasarkan hasil pengujian Dissolved Gas Analysis (DGA) pada transformator ${data.nama_trafo || "-"} di ${data.lokasi_gi || "-"} tanggal ${data.tanggal_sampling || "-"}, berikut adalah kesimpulan dan rekomendasi:\n\n`;

  // Rekomendasi berdasarkan kondisi
  if (kondisi.kondisi === 1) {
    kesimpulan += `Kondisi transformator dalam keadaan NORMAL. Tidak ditemukan indikasi gangguan yang signifikan. Rekomendasi tindak lanjut:\n\n`;
    kesimpulan += `• Lanjutkan monitoring rutin sesuai jadwal pemeliharaan\n`;
    kesimpulan += `• Interval pengujian DGA berikutnya: 12 bulan\n`;
    kesimpulan += `• Pertahankan kondisi operasi transformator seperti saat ini\n`;
  } else if (kondisi.kondisi === 2) {
    kesimpulan += `Kondisi transformator PERLU PERHATIAN. Terdeteksi adanya indikasi gangguan yang memerlukan monitoring lebih ketat. Rekomendasi tindak lanjut:\n\n`;
    kesimpulan += `• Periksa dan evaluasi beban operasi transformator\n`;
    kesimpulan += `• Persingkat interval pengujian DGA menjadi 3-6 bulan\n`;
    kesimpulan += `• Monitor trend kenaikan gas terlarut secara berkala\n`;
    kesimpulan += `• Lakukan inspeksi visual pada komponen transformator\n`;
  } else {
    kesimpulan += `Kondisi transformator dalam status KRITIS! Terdeteksi gangguan aktif yang memerlukan penanganan segera. \nRekomendasi tindak lanjut:\n\n`;
    kesimpulan += `• SEGERA lakukan inspeksi menyeluruh pada transformator\n`;
    kesimpulan += `• Pertimbangkan untuk menurunkan beban operasi atau mengeluarkan dari operasi\n`;
    kesimpulan += `• Koordinasi dengan tim maintenance untuk tindakan korektif segera\n`;
    kesimpulan += `• Lakukan pengujian tambahan (Furfural, Power Factor, dll)\n`;
    kesimpulan += `• Interval pengujian DGA: 1-3 bulan atau lebih sering\n`;
  }

  kesimpulan += `\n\nCatatan: Rekomendasi ini dihasilkan secara otomatis berdasarkan standar IEEE C57.104-2019. Untuk analisis lebih mendalam dan rekomendasi spesifik, silakan konsultasikan dengan VOLTY AI Assistant.`;

  return kesimpulan;
};

// Fungsi untuk mendeteksi zona Duval Pentagon dari titik
const detectDuvalZone = (gasData) => {
  const { h2, ch4, c2h6, c2h4, c2h2 } = gasData;
  const total = h2 + ch4 + c2h6 + c2h4 + c2h2;

  if (total === 0) return null;

  const rad = (deg) => (deg * Math.PI) / 180;

  // Hitung persentase
  const pH2 = (h2 / total) * 100;
  const pC2H6 = (c2h6 / total) * 100;
  const pCH4 = (ch4 / total) * 100;
  const pC2H4 = (c2h4 / total) * 100;
  const pC2H2 = (c2h2 / total) * 100;

  const k = 0.4;
  const points = [
    { x: 0, y: pH2 * k },
    { x: pC2H6 * k * Math.cos(rad(162)), y: pC2H6 * k * Math.sin(rad(162)) },
    { x: pCH4 * k * Math.cos(rad(234)), y: pCH4 * k * Math.sin(rad(234)) },
    { x: pC2H4 * k * Math.cos(rad(306)), y: pC2H4 * k * Math.sin(rad(306)) },
    { x: pC2H2 * k * Math.cos(rad(18)), y: pC2H2 * k * Math.sin(rad(18)) },
  ];

  let Cx = 0,
    Cy = 0;
  points.forEach((p) => {
    Cx += p.x;
    Cy += p.y;
  });

  // Deteksi zona berdasarkan posisi centroid
  // Ini adalah aproksimasi sederhana berdasarkan koordinat zona

  // PD zone (tengah atas kecil)
  if (Cy > 24.5 && Cy < 33 && Math.abs(Cx) < 1) return "PD";

  // S zone (kiri atas)
  if (Cx < 0 && Cy > 1.5) return "S";

  // D1 zone (kanan atas)
  if (Cx > 0 && Cy > 1.5) return "D1";

  // D2 zone (kanan tengah)
  if (Cx > 0 && Cy > -3 && Cy <= 1.5) return "D2";

  // T3 zone (bawah kanan)
  if (Cx > -6 && Cy <= -3 && Cx > 0) return "T3";

  // T2 zone (bawah tengah kiri)
  if (Cx <= 0 && Cy < -4 && Cx > -22.5) return "T2";

  // T1 zone (kiri)
  if (Cx < 0 && Cy <= 1.5 && Cy > -4) return "T1";

  // Default to closest approximation
  if (Cy > 0) {
    return Cx > 0 ? "D1" : "S";
  } else {
    if (Cx > 5) return "T3";
    if (Cx < -5) return "T1";
    return "T2";
  }
};

// Fungsi untuk menggambar Duval Pentagon dengan warna zona
const drawDuvalPentagon = (doc, centerX, centerY, size, gasData) => {
  const { h2, ch4, c2h6, c2h4, c2h2 } = gasData;
  const total = h2 + ch4 + c2h6 + c2h4 + c2h2;

  if (total === 0) return;

  const rad = (deg) => (deg * Math.PI) / 180;
  const scale = size / 90;

  const toX = (x) => centerX + x * scale;
  const toY = (y) => centerY - y * scale;

  // Warna zona
  const colors = {
    PD: [200, 162, 240],
    D1: [120, 180, 250],
    D2: [250, 140, 140],
    T3: [250, 170, 100],
    T2: [250, 220, 80],
    T1: [250, 235, 140],
    S: [120, 230, 160],
  };

  // Helper untuk menggambar polygon dengan outline
  const drawZone = (
    points,
    color,
    strokeColor = [80, 80, 80],
    strokeWidth = 0.1,
  ) => {
    if (points.length < 3) return;

    // Konversi semua points
    const coords = points.map((p) => [toX(p[0]), toY(p[1])]);

    // Set fill color
    doc.setFillColor(color[0], color[1], color[2]);

    // Gambar polygon dengan triangulation
    for (let i = 1; i < coords.length - 1; i++) {
      doc.triangle(
        coords[0][0],
        coords[0][1],
        coords[i][0],
        coords[i][1],
        coords[i + 1][0],
        coords[i + 1][1],
        "F",
      );
    }

    // Gambar outline untuk setiap zona agar terlihat jelas batasnya
    doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
    doc.setLineWidth(strokeWidth);
    for (let i = 0; i < coords.length; i++) {
      const next = (i + 1) % coords.length;
      doc.line(coords[i][0], coords[i][1], coords[next][0], coords[next][1]);
    }
  };

  // Gambar zona TANPA overlap - setiap zona terpisah dengan jelas

  // T2 - Kuning (segitiga bawah tengah)
  drawZone(
    [
      [-6, -4],
      [1, -32.4],
      [-22.5, -32.4],
    ],
    colors.T2,
    [70, 70, 70],
    0.15,
  );

  // T3 - Orange (bawah kanan)
  drawZone(
    [
      [0, -3],
      [24.3, -30],
      [23.5, -32.4],
      [1, -32.4],
      [-6, -4],
    ],
    colors.T3,
    [70, 70, 70],
    0.15,
  );

  // T1 - Kuning muda (kiri besar) - DIPERBAIKI tanpa overlap dengan T2/T3
  drawZone(
    [
      [-35, 3.1],
      [-23.5, -32.4],
      [-22.5, -32.4],
      [-6, -4],
      [0, -3],
      [0, 1.5],
    ],
    colors.T1,
    [70, 70, 70],
    0.15,
  );

  // D2 - Merah (kanan tengah ke bawah)
  drawZone(
    [
      [4, 16],
      [32, -6.1],
      [24.3, -30],
      [0, -3],
      [0, 1.5],
    ],
    colors.D2,
    [70, 70, 70],
    0.15,
  );

  // D1 - Biru (kanan atas ke tengah) - tanpa overlap dengan S
  drawZone(
    [
      [1, 24.5],
      [1, 33],
      [0, 40],
      [38, 12],
      [32, -6.1],
      [4, 16],
      [0, 1.5],
    ],
    colors.D1,
    [70, 70, 70],
    0.15,
  );

  // S - Hijau (kiri atas ke atas) - tanpa overlap dengan D1
  drawZone(
    [
      [0, 1.5],
      [-35, 3.1],
      [-38, 12.4],
      [0, 40],
      [0, 33],
      [-1, 33],
      [-1, 24.5],
      [0, 24.5],
    ],
    colors.S,
    [70, 70, 70],
    0.15,
  );

  // PD - Ungu (kotak kecil di tengah atas) - paling depan
  drawZone(
    [
      [-1, 24.5],
      [-1, 33],
      [1, 33],
      [1, 24.5],
    ],
    colors.PD,
    [60, 60, 60],
    0.2,
  );

  // Gambar outline pentagon (5 sudut)
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.4);
  const pentagonPoints = [
    { x: 0, y: 40 }, // H2 (atas)
    { x: 38, y: 12 }, // C2H2 (kanan atas)
    { x: 24, y: -32 }, // C2H4 (kanan bawah)
    { x: -24, y: -32 }, // CH4 (kiri bawah)
    { x: -38, y: 12 }, // C2H6 (kiri atas)
  ];
  for (let i = 0; i < 5; i++) {
    const next = (i + 1) % 5;
    doc.line(
      toX(pentagonPoints[i].x),
      toY(pentagonPoints[i].y),
      toX(pentagonPoints[next].x),
      toY(pentagonPoints[next].y),
    );
  }

  // Gambar garis dari pusat ke setiap sudut
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.2);
  pentagonPoints.forEach((p) => {
    doc.line(centerX, centerY, toX(p.x), toY(p.y));
  });

  // Label gas di setiap sudut
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("H2", toX(0) - 3, toY(40) - 2);
  doc.text("C2H2", toX(38) + 1, toY(12) + 1);
  doc.text("C2H4", toX(24) + 1, toY(-32) + 4);
  doc.text("CH4", toX(-24) - 9, toY(-32) + 4);
  doc.text("C2H6", toX(-38) - 11, toY(12) + 1);

  // Label zona di dalam pentagon
  doc.setFontSize(5);
  doc.setTextColor(50, 50, 50);
  doc.text("PD", toX(2), toY(28));
  doc.text("S", toX(-18), toY(18));
  doc.text("D1", toX(15), toY(15));
  doc.text("D2", toX(12), toY(-8));
  doc.text("T3", toX(5), toY(-22));
  doc.text("T2", toX(-10), toY(-22));
  doc.text("T1", toX(-18), toY(-8));

  // Hitung posisi titik diagnosis (sama seperti di React component)
  const pH2 = (h2 / total) * 100;
  const pC2H6 = (c2h6 / total) * 100;
  const pCH4 = (ch4 / total) * 100;
  const pC2H4 = (c2h4 / total) * 100;
  const pC2H2 = (c2h2 / total) * 100;

  const k = 0.4;
  const points = [
    { x: 0, y: pH2 * k },
    { x: pC2H6 * k * Math.cos(rad(162)), y: pC2H6 * k * Math.sin(rad(162)) },
    { x: pCH4 * k * Math.cos(rad(234)), y: pCH4 * k * Math.sin(rad(234)) },
    { x: pC2H4 * k * Math.cos(rad(306)), y: pC2H4 * k * Math.sin(rad(306)) },
    { x: pC2H2 * k * Math.cos(rad(18)), y: pC2H2 * k * Math.sin(rad(18)) },
  ];

  let Cx = 0,
    Cy = 0;
  points.forEach((p) => {
    Cx += p.x;
    Cy += p.y;
  });

  const dotX = toX(Cx);
  const dotY = toY(Cy);

  // Gambar titik diagnosis (merah)
  doc.setFillColor(255, 0, 0);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(dotX, dotY, 2, "FD");
};

// Fungsi utama untuk generate PDF sesuai template
export const generatePDFFromTemplate = (data, options = { saveFile: true }) => {
  try {
    console.log("Generating PDF for:", data);
    // Set ukuran kertas A4 secara eksplisit
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Hitung TDCG
    const tdcgValue = calculateTDCG(data);

    // Gunakan status_ieee dari hasil AI jika ada, kalau tidak fallback ke perhitungan TDCG
    const ieeeKondisi = parseIEEEStatusFromAI(data.status_ieee, tdcgValue);
    const splnKondisi = getSPLNKondisi(tdcgValue);

    // Gas data untuk pentagon
    const gasData = {
      h2: parseFloat(data.h2) || 0,
      ch4: parseFloat(data.ch4) || 0,
      c2h6: parseFloat(data.c2h6) || 0,
      c2h4: parseFloat(data.c2h4) || 0,
      c2h2: parseFloat(data.c2h2) || 0,
    };

    // Deteksi zona Duval
    const detectedZone = detectDuvalZone(gasData);

    let currentY = 15;

    // ============================================
    // HALAMAN 1: LAPORAN HASIL UJI DGA
    // ============================================

    // Header Judul
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("LAPORAN HASIL UJI DGA", 14, currentY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("(Dissolved Gas Analysis)", 80, currentY);

    currentY += 10;

    // ============================================
    // IDENTITAS TRANSFORMATOR & DATA SAMPLING (side by side)
    // ============================================

    // Judul Identitas Transformator (Kiri)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Identitas Transformator", 14, currentY);

    // Judul Data Sampling (Kanan)
    doc.text("Data Sampling", 120, currentY);

    currentY += 5;

    // Data Identitas Transformator (Kiri)
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const leftLabels = [
      { label: "Gardu Induk", value: data.lokasi_gi || "-" },
      { label: "Trafo", value: data.nama_trafo || "-" },
      { label: "Merk Trafo", value: data.merk_trafo || "-" },
      { label: "No. Seri Trafo", value: data.serial_number || "-" },
      { label: "Tahun", value: data.tahun_pembuatan || "-" },
      { label: "Volt", value: data.level_tegangan || "-" },
    ];

    const rightLabels = [
      { label: "Tanggal Tes", value: data.tanggal_sampling || "-" },
      { label: "Petugas", value: data.diambil_oleh || "-" },
    ];

    // Gambar data kiri
    leftLabels.forEach((item, index) => {
      const y = currentY + index * 5;
      doc.setTextColor(0, 0, 0);
      doc.text(item.label, 14, y);
      doc.text(":", 48, y);
      doc.text(String(item.value), 52, y);
    });

    // Gambar data kanan
    rightLabels.forEach((item, index) => {
      const y = currentY + index * 5;
      doc.setTextColor(0, 0, 0);
      doc.text(item.label, 120, y);
      doc.text(":", 150, y);
      doc.text(String(item.value), 154, y);
    });

    currentY += 45;

    // ============================================
    // DUA TABEL SIDE BY SIDE: IEEE (KIRI) & SPLN (KANAN)
    // ============================================

    const tableStartY = currentY;
    const tableWidth = 88;
    const leftTableX = 14;
    const rightTableX = 108;

    // ----- TABEL IEEE (KIRI) -----
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 139); // Dark blue
    doc.text("Standar (IEEE C57.104-2019)", leftTableX, currentY);

    // ----- TABEL SPLN (KANAN) -----
    doc.setTextColor(139, 0, 0); // Dark red
    doc.text("Standar (SPLN T5.004-4: 2016)", rightTableX, currentY);

    currentY += 3;

    // IEEE Table data dengan warna berdasarkan batas
    const getIEEEValueColor = (gas, value) => {
      const v = parseFloat(value) || 0;
      const limit = IEEE_LIMITS[gas];
      if (v >= limit) return [220, 50, 50]; // Merah jika melebihi
      return [0, 128, 0]; // Hijau jika di bawah
    };

    const ieeeTableBody = [
      [
        "Hidrogen (H2)",
        {
          content: String(data.h2 || 0),
          styles: { textColor: getIEEEValueColor("h2", data.h2) },
        },
        "100 ppm",
      ],
      [
        "Metana (CH4)",
        {
          content: String(data.ch4 || 0),
          styles: { textColor: getIEEEValueColor("ch4", data.ch4) },
        },
        "120 ppm",
      ],
      [
        "Asetilena (C2H2)",
        {
          content: String(data.c2h2 || 0),
          styles: { textColor: getIEEEValueColor("c2h2", data.c2h2) },
        },
        "1 ppm",
      ],
      [
        "Etilen (C2H4)",
        {
          content: String(data.c2h4 || 0),
          styles: { textColor: getIEEEValueColor("c2h4", data.c2h4) },
        },
        "50 ppm",
      ],
      [
        "Etana (C2H6)",
        {
          content: String(data.c2h6 || 0),
          styles: { textColor: getIEEEValueColor("c2h6", data.c2h6) },
        },
        "65 ppm",
      ],
      [
        "Karbon Monoksida (CO)",
        {
          content: String(data.co || 0),
          styles: { textColor: getIEEEValueColor("co", data.co) },
        },
        "350 ppm",
      ],
      [
        "Karbon Dioksida (CO2)",
        {
          content: String(data.co2 || 0),
          styles: { textColor: getIEEEValueColor("co2", data.co2) },
        },
        "2500 ppm",
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["PARAMETER UJI", "HASIL\n(ppm)", "Batas\nAtas"]],
      body: ieeeTableBody,
      theme: "grid",
      headStyles: {
        fillColor: [0, 100, 150],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 8,
        cellPadding: 1.5,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 20, halign: "center", textColor: [220, 50, 50] },
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      tableWidth: tableWidth - 6,
      margin: { left: leftTableX },
    });

    // Tambah TDCG dan Kondisi Status untuk IEEE
    let ieeeTableEndY = doc.lastAutoTable.finalY;

    autoTable(doc, {
      startY: ieeeTableEndY,
      body: [
        [
          { content: "HASIL TDCG", styles: { fontStyle: "bold" } },
          {
            content: String(tdcgValue),
            colSpan: 2,
            styles: {
              halign: "center",
              textColor: ieeeKondisi.color,
              fontStyle: "bold",
            },
          },
        ],
        [
          { content: "KONDISI STATUS", styles: { fontStyle: "bold" } },
          {
            content: `Kondisi ${ieeeKondisi.kondisi}`,
            styles: {
              halign: "center",
              textColor: ieeeKondisi.color,
              fontStyle: "bold",
            },
          },
          {
            content: ieeeKondisi.text,
            styles: {
              halign: "center",
              textColor: ieeeKondisi.color,
              fontStyle: "bold",
            },
          },
        ],
      ],
      theme: "grid",
      bodyStyles: {
        fontSize: 8,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 20, halign: "center" },
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      tableWidth: tableWidth - 6,
      margin: { left: leftTableX },
    });

    // SPLN Table data dengan warna status
    const splnTableBody = [
      [
        "Hidrogen (H2)",
        { content: String(data.h2 || 0), styles: { textColor: [0, 0, 0] } },
        {
          content: getSPLNGasStatus("h2", data.h2).status,
          styles: { textColor: getSPLNGasStatus("h2", data.h2).color },
        },
      ],
      [
        "Metana (CH4)",
        { content: String(data.ch4 || 0), styles: { textColor: [0, 0, 0] } },
        {
          content: getSPLNGasStatus("ch4", data.ch4).status,
          styles: { textColor: getSPLNGasStatus("ch4", data.ch4).color },
        },
      ],
      [
        "Asetilena (C2H2)",
        { content: String(data.c2h2 || 0), styles: { textColor: [0, 0, 0] } },
        {
          content: getSPLNGasStatus("c2h2", data.c2h2).status,
          styles: { textColor: getSPLNGasStatus("c2h2", data.c2h2).color },
        },
      ],
      [
        "Etilen (C2H4)",
        { content: String(data.c2h4 || 0), styles: { textColor: [0, 0, 0] } },
        {
          content: getSPLNGasStatus("c2h4", data.c2h4).status,
          styles: { textColor: getSPLNGasStatus("c2h4", data.c2h4).color },
        },
      ],
      [
        "Etana (C2H6)",
        { content: String(data.c2h6 || 0), styles: { textColor: [0, 0, 0] } },
        {
          content: getSPLNGasStatus("c2h6", data.c2h6).status,
          styles: { textColor: getSPLNGasStatus("c2h6", data.c2h6).color },
        },
      ],
      [
        "Karbon Monoksida (CO)",
        { content: String(data.co || 0), styles: { textColor: [0, 0, 0] } },
        {
          content: getSPLNGasStatus("co", data.co).status,
          styles: { textColor: getSPLNGasStatus("co", data.co).color },
        },
      ],
      [
        "Karbon Dioksida (CO2)",
        { content: String(data.co2 || 0), styles: { textColor: [0, 0, 0] } },
        {
          content: getSPLNGasStatus("co2", data.co2).status,
          styles: { textColor: getSPLNGasStatus("co2", data.co2).color },
        },
      ],
    ];

    autoTable(doc, {
      startY: tableStartY + 3,
      head: [["PARAMETER UJI", "HASIL\n(ppm)", "Status"]],
      body: splnTableBody,
      theme: "grid",
      headStyles: {
        fillColor: [139, 69, 19],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 8,
        cellPadding: 1.5,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 22, halign: "center" },
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      tableWidth: tableWidth - 6,
      margin: { left: rightTableX },
    });

    // Tambah TDCG dan Kondisi Status untuk SPLN
    let splnTableEndY = doc.lastAutoTable.finalY;

    autoTable(doc, {
      startY: splnTableEndY,
      body: [
        [
          {
            content: String(tdcgValue),
            colSpan: 3,
            styles: {
              halign: "center",
              textColor: splnKondisi.color,
              fontStyle: "bold",
            },
          },
        ],
        [
          {
            content: `Kondisi ${splnKondisi.kondisi} - ${splnKondisi.text}`,
            colSpan: 3,
            styles: {
              halign: "center",
              textColor: splnKondisi.color,
              fontStyle: "bold",
            },
          },
        ],
      ],
      theme: "grid",
      bodyStyles: {
        fontSize: 8,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 22, halign: "center" },
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      tableWidth: tableWidth - 6,
      margin: { left: rightTableX },
    });

    currentY = Math.max(doc.lastAutoTable.finalY, ieeeTableEndY + 20) + 8;

    // ============================================
    // KONDISI STATUS IEEE (KIRI) & KONDISI STATUS SPLN (KANAN ATAS)
    // ============================================

    const kondisiStartY = currentY;

    // ----- KONDISI STATUS IEEE (KIRI) -----
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 139);
    doc.text("Kondisi Status (IEEE C57.104-2019)", leftTableX, currentY);

    currentY += 6;

    // Kondisi 1 - Normal (Hijau)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("- Kondisi 1 :", leftTableX, currentY);
    doc.setTextColor(
      IEEE_COLORS.kondisi1[0],
      IEEE_COLORS.kondisi1[1],
      IEEE_COLORS.kondisi1[2],
    );
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Normal. Lanjut monitoring.", leftTableX + 22, currentY);

    currentY += 6;

    // Kondisi 2 - Waspada (Kuning tua)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("- Kondisi 2 :", leftTableX, currentY);
    doc.setTextColor(
      IEEE_COLORS.kondisi2[0],
      IEEE_COLORS.kondisi2[1],
      IEEE_COLORS.kondisi2[2],
    );
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Waspada. Cek beban & interval uji.", leftTableX + 22, currentY);

    currentY += 6;

    // Kondisi 3 - Bahaya (Merah darah)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("- Kondisi 3 :", leftTableX, currentY);
    doc.setTextColor(
      IEEE_COLORS.kondisi3[0],
      IEEE_COLORS.kondisi3[1],
      IEEE_COLORS.kondisi3[2],
    );
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Bahaya. Indikasi kerusakan aktif.", leftTableX + 22, currentY);

    // ----- KONDISI STATUS SPLN (KANAN ATAS) -----
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(139, 0, 0);
    doc.text(
      "Kondisi Status (SPLN T5.004-4: 2016)",
      rightTableX,
      kondisiStartY,
    );

    // Tabel kondisi SPLN
    const splnKondisiTableY = kondisiStartY + 3;

    autoTable(doc, {
      startY: splnKondisiTableY,
      head: [["Status", "Limit TDCG", "Tindakan"]],
      body: [
        [
          { content: "Kondisi 1", styles: { textColor: [0, 0, 0] } },
          { content: "<= 720", styles: { textColor: [139, 0, 0] } },
          {
            content: "Normal",
            styles: { textColor: SPLN_COLORS.kondisi1, fontStyle: "bold" },
          },
        ],
        [
          { content: "Kondisi 2", styles: { textColor: [0, 0, 0] } },
          { content: "<=1920", styles: { textColor: [139, 0, 0] } },
          {
            content: "Waspada",
            styles: { textColor: SPLN_COLORS.kondisi2, fontStyle: "bold" },
          },
        ],
        [
          { content: "Kondisi 3", styles: { textColor: [0, 0, 0] } },
          { content: "<=4630", styles: { textColor: [139, 0, 0] } },
          {
            content: "Peringatan",
            styles: { textColor: SPLN_COLORS.kondisi3, fontStyle: "bold" },
          },
        ],
        [
          { content: "Kondisi 4", styles: { textColor: [0, 0, 0] } },
          { content: ">=4631", styles: { textColor: [139, 0, 0] } },
          {
            content: "Bahaya",
            styles: { textColor: SPLN_COLORS.kondisi4, fontStyle: "bold" },
          },
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22, halign: "center" },
        2: { cellWidth: 22, halign: "center" },
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
      },
      tableWidth: 76,
      margin: { left: rightTableX },
    });

    currentY = Math.max(currentY + 14, doc.lastAutoTable.finalY + 24);

    // ============================================
    // KODE DIAGNOSA (KIRI) & DUVAL PENTAGON (KANAN)
    // ============================================

    const diagStartY = currentY;

    // ----- KODE DIAGNOSA (KIRI) -----
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Duval Pentagon - Kode Diagnosa:", leftTableX, currentY);

    currentY += 5;

    // Daftar kode diagnosa dengan highlight berdasarkan zona terdeteksi
    const faultTypes = [
      { code: "PD", desc: "Partial Discharge (Peluasan Parsial)" },
      { code: "D1", desc: "Discharge Low Energy (Percikan kecil)" },
      { code: "D2", desc: "Discharge High Energy (Arcing kuat)" },
      { code: "S", desc: "Stray Gassing (Stray Gassing)" },
      { code: "T1", desc: "Thermal Fault < 300°C" },
      { code: "T2", desc: "Thermal Fault 300°C - 700°C" },
      { code: "T3", desc: "Thermal Fault > 700°C" },
    ];

    faultTypes.forEach((fault, index) => {
      const y = currentY + index * 5;
      const isDetected = detectedZone === fault.code;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`${fault.code}:`, leftTableX, y);

      if (isDetected) {
        // Highlight dengan warna merah jika terdeteksi
        doc.setTextColor(220, 50, 50);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
      }
      doc.text(fault.desc, leftTableX + 10, y);
    });

    // ----- DUVAL PENTAGON (KANAN) -----
    const pentagonCenterX = 155;
    const pentagonCenterY = diagStartY + 22;
    const pentagonSize = 48;

    // Gambar Duval Pentagon
    drawDuvalPentagon(
      doc,
      pentagonCenterX,
      pentagonCenterY,
      pentagonSize,
      gasData,
    );

    // Footer halaman 1
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Generated: ${new Date().toLocaleString("id-ID")} | Smart-Trafo PLN UPT Manado`,
      105,
      287,
      { align: "center" },
    );

    // ============================================
    // HALAMAN 2: KESIMPULAN ANALISIS AI
    // ============================================
    doc.addPage();

    currentY = 15;

    // Header halaman 2
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Standar: IEEE C57.104-2019", 14, currentY);

    currentY += 10;

    // Judul Kesimpulan
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 139, 139);
    doc.text("Kesimpulan Analisis DGA berdasarkan AI", 14, currentY);

    currentY += 6;

    // Info Transformator
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const infoLabels = [
      { label: "Gardu Induk", value: data.lokasi_gi || "-" },
      { label: "Trafo", value: data.nama_trafo || "-" },
      { label: "Tanggal Pengujian", value: data.tanggal_sampling || "-" },
    ];

    infoLabels.forEach((item, index) => {
      const y = currentY + index * 5;
      doc.setTextColor(0, 139, 139);
      doc.text(item.label, 14, y);
      doc.setTextColor(0, 0, 0);
      doc.text(":", 55, y);
      doc.text(String(item.value), 60, y);
    });

    currentY += 20;

    // Tentukan apakah ada hasil AI
    const hasAIResult =
      data.hasil_ai &&
      data.hasil_ai.trim() !== "" &&
      data.hasil_ai !== "AI sedang menganalisis...";

    // Debug
    console.log("PDF Page 2 - hasil_ai:", data.hasil_ai);
    console.log("PDF Page 2 - hasAIResult:", hasAIResult);

    // Tabel Kesimpulan
    const kesimpulanContent = hasAIResult
      ? data.hasil_ai
          .replace(/\\n/g, "\n")
          .replace(/\*\*/g, "")
          .replace(/\*/g, "•")
          .trim()
      : generateAutoKesimpulan(data);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          {
            content: "KESIMPULAN & REKOMENDASI by VOLTY AI",
            styles: { halign: "left" },
          },
        ],
      ],
      body: [[kesimpulanContent]],
      theme: "grid",
      headStyles: {
        fillColor: [0, 139, 139],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 6,
        textColor: [50, 50, 50],
        lineHeight: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 175 },
      },
      styles: {
        cellPadding: 4,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        overflow: "linebreak",
      },
      tableWidth: 175,
      margin: { left: 14 },
    });

    // Footer halaman 2
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text(
      hasAIResult
        ? "Analisis dihasilkan oleh VOLTY AI Assistant - PLN UPT Manado"
        : "Rekomendasi otomatis berdasarkan IEEE C57.104-2019",
      105,
      285,
      { align: "center" },
    );
    doc.text(`Generated: ${new Date().toLocaleString("id-ID")}`, 105, 290, {
      align: "center",
    });

    // ============================================
    // HALAMAN 3: PANDUAN STANDAR
    // ============================================
    doc.addPage();

    currentY = 15;

    // Header halaman 3
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("PANDUAN STANDAR", 14, currentY);

    currentY += 10;

    // ----- STANDAR IEEE C57.104-2019 -----
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Standar: IEEE Std C57.104-2019", 14, currentY);

    currentY += 5;

    const ieeeGuideData = [
      [
        { content: "Hidrogen (H2)", styles: { textColor: [0, 139, 139] } },
        { content: "100 ppm", styles: { textColor: [220, 50, 50] } },
        "Partial Discharge / Stray Gassing",
      ],
      [
        { content: "Metana (CH4)", styles: { textColor: [0, 139, 139] } },
        { content: "120 ppm", styles: { textColor: [220, 50, 50] } },
        "Overheating Minyak",
      ],
      [
        { content: "Asetilen (C2H2)", styles: { textColor: [0, 139, 139] } },
        { content: "1 ppm", styles: { textColor: [220, 50, 50] } },
        "Arcing (Busur Api) - SANGAT KRITIS",
      ],
      [
        { content: "Etilen (C2H4)", styles: { textColor: [0, 139, 139] } },
        { content: "50 ppm", styles: { textColor: [220, 50, 50] } },
        "Overheating Suhu Tinggi (>700°C)",
      ],
      [
        { content: "Etana (C2H6)", styles: { textColor: [0, 139, 139] } },
        { content: "65 ppm", styles: { textColor: [220, 50, 50] } },
        "Overheating Suhu Menengah",
      ],
      [
        {
          content: "Karbon Monoksida (CO)",
          styles: { textColor: [0, 139, 139] },
        },
        { content: "350 ppm", styles: { textColor: [220, 50, 50] } },
        "Degradasi Kertas Isolasi",
      ],
      [
        {
          content: "Karbon Dioksida (CO2)",
          styles: { textColor: [0, 139, 139] },
        },
        { content: "2500 ppm", styles: { textColor: [220, 50, 50] } },
        "Penuaan Kertas / Oksidasi",
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Gas", "Limit (ppm)", "Indikasi"]],
      body: ieeeGuideData,
      theme: "grid",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30, halign: "center" },
        2: { cellWidth: 90 },
      },
      styles: {
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      tableWidth: 170,
      margin: { left: 14 },
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // ----- STANDAR SPLN T5.004-4: 2016 -----
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Standar: SPLN T5.004-4: 2016", 14, currentY);

    currentY += 5;

    // Helper function to create colored limit rows
    const createSPLNLimitRows = (gasName, limits) => {
      // limits format: [[limit, status], ...]
      // status: "Very Good", "Good", "Fair", "Poor", "Critical"
      const statusColors = {
        "Very Good": SPLN_STATUS_COLORS.veryGood,
        Good: SPLN_STATUS_COLORS.good,
        Fair: SPLN_STATUS_COLORS.fair,
        Poor: SPLN_STATUS_COLORS.poor,
        Critical: SPLN_STATUS_COLORS.critical,
      };

      return limits.map((item, index) => {
        const isFirst = index === 0;
        return [
          {
            content: isFirst ? gasName : "",
            styles: {
              textColor: [0, 139, 139],
              fontStyle: isFirst ? "bold" : "normal",
            },
          },
          {
            content: `${item[0]} = ${item[1]}`,
            styles: { textColor: statusColors[item[1]] },
          },
        ];
      });
    };

    // Data SPLN dengan limit terpisah
    const splnDataLeft = [
      {
        gas: "Hidrogen (H2)",
        limits: [
          ["<30", "Very Good"],
          ["<=99", "Good"],
          ["<=699", "Fair"],
          ["<=1800", "Poor"],
          [">1800", "Critical"],
        ],
      },
      {
        gas: "Metana (CH4)",
        limits: [
          ["<121", "Very Good"],
          ["<=400", "Good"],
          ["<=1200", "Fair"],
          ["<=1500", "Poor"],
          [">1500", "Critical"],
        ],
      },
      {
        gas: "Asetilena (C2H2)",
        limits: [
          ["=0", "Very Good"],
          ["<=1", "Good"],
          ["<=10", "Fair"],
          ["<=35", "Poor"],
          [">35", "Critical"],
        ],
      },
    ];

    const splnDataRight = [
      {
        gas: "Etana (C2H6)",
        limits: [
          ["<65", "Very Good"],
          ["<=100", "Good"],
          ["<=200", "Fair"],
          ["<=500", "Poor"],
          [">500", "Critical"],
        ],
      },
      {
        gas: "Karbon Monoksida (CO)",
        limits: [
          ["<=350", "Very Good"],
          ["<=570", "Good"],
          ["<=2500", "Fair"],
          ["<=5000", "Poor"],
          [">5000", "Critical"],
        ],
      },
      {
        gas: "Karbon Dioksida (CO2)",
        limits: [
          ["<=2500", "Very Good"],
          ["<=4000", "Good"],
          ["<=10000", "Fair"],
          ["<=17500", "Poor"],
          [">17500", "Critical"],
        ],
      },
    ];

    // Build table body for left table
    const leftTableBody = [];
    splnDataLeft.forEach((item) => {
      const rows = createSPLNLimitRows(item.gas, item.limits);
      leftTableBody.push(...rows);
    });

    // Build table body for right table
    const rightTableBody = [];
    splnDataRight.forEach((item) => {
      const rows = createSPLNLimitRows(item.gas, item.limits);
      rightTableBody.push(...rows);
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Senyawa", "Limit"]],
      body: leftTableBody,
      theme: "grid",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 45 },
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
      },
      tableWidth: 80,
      margin: { left: 14 },
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Senyawa", "Limit"]],
      body: rightTableBody,
      theme: "grid",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 50 },
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
      },
      tableWidth: 90,
      margin: { left: 105 },
    });

    // Footer halaman 3
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Generated: ${new Date().toLocaleString("id-ID")} | Smart-Trafo PLN UPT Manado`,
      105,
      287,
      { align: "center" },
    );

    // ============================================
    // SAVE PDF atau RETURN BLOB
    // ============================================

    if (options.saveFile === false) {
      // Kembalikan blob untuk batch download
      return doc.output("blob");
    }

    const filename = `Laporan_DGA_${(data.nama_trafo || "Trafo").replace(/\s+/g, "_")}_${data.tanggal_sampling || "nodate"}.pdf`;
    doc.save(filename);

    console.log("PDF berhasil di-generate!", filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    if (options.saveFile === false) {
      throw error;
    }
    alert("Gagal membuat PDF: " + error.message);
  }
};

// Export fungsi legacy untuk backward compatibility
export const generatePDF = (data, result) => {
  const combinedData = {
    ...data,
    status_ieee: result?.ieee_status || data.status_ieee,
    status_ai: result?.ai_status || data.status_ai,
    diagnosis: result?.diagnosis || data.diagnosis,
    tdcg: data.tdcg || 0,
  };
  generatePDFFromTemplate(combinedData);
};

// Fungsi untuk generate PDF sebagai blob (untuk ZIP download)
// Menggunakan template yang sama persis dengan generatePDFFromTemplate
export const generatePDFBlob = (data) => {
  // Gunakan generatePDFFromTemplate dengan opsi saveFile: false untuk mendapatkan blob
  return generatePDFFromTemplate(data, { saveFile: false });
};
