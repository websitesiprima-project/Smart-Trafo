import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Fungsi untuk menentukan kondisi dari status IEEE
const getKondisi = (status, data) => {
  if (!status) return { kondisi: "1", text: "Normal", color: [0, 128, 0] };
  if (status.includes("KRITIS") || status.includes("Kritis") || status.includes("Cond 3") || status.includes("Condition 3") || (data?.c2h2 && data.c2h2 > 1)) {
    return { kondisi: "3", text: "Bahaya", color: [220, 50, 50] };
  }
  if (status.includes("Waspada") || status.includes("Cond 2") || status.includes("Condition 2")) {
    return { kondisi: "2", text: "Waspada", color: [255, 165, 0] };
  }
  return { kondisi: "1", text: "Normal", color: [0, 128, 0] };
};

// Fungsi untuk generate kesimpulan otomatis berdasarkan data DGA
const generateAutoKesimpulan = (data) => {
  const kondisi = getKondisi(data.status_ieee, data);
  
  let kesimpulan = `Berdasarkan hasil pengujian Dissolved Gas Analysis (DGA) pada transformator ${data.nama_trafo || '-'} di ${data.lokasi_gi || '-'} tanggal ${data.tanggal_sampling || '-'}, berikut adalah kesimpulan dan rekomendasi:\n\n`;
  
  // Rekomendasi berdasarkan kondisi
  if (kondisi.kondisi === "1") {
    kesimpulan += `Kondisi transformator dalam keadaan NORMAL. Tidak ditemukan indikasi gangguan yang signifikan. Rekomendasi tindak lanjut:\n\n`;
    kesimpulan += `• Lanjutkan monitoring rutin sesuai jadwal pemeliharaan\n`;
    kesimpulan += `• Interval pengujian DGA berikutnya: 12 bulan\n`;
    kesimpulan += `• Pertahankan kondisi operasi transformator seperti saat ini\n`;
  } else if (kondisi.kondisi === "2") {
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
    S: [120, 230, 160]
  };
  
  // Helper untuk menggambar polygon dengan outline
  const drawZone = (points, color, strokeColor = [80, 80, 80], strokeWidth = 0.1) => {
    if (points.length < 3) return;
    
    // Konversi semua points
    const coords = points.map(p => [toX(p[0]), toY(p[1])]);
    
    // Set fill color
    doc.setFillColor(color[0], color[1], color[2]);
    
    // Gambar polygon dengan triangulation
    for (let i = 1; i < coords.length - 1; i++) {
      doc.triangle(coords[0][0], coords[0][1], coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1], 'F');
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
  drawZone([
    [-6, -4], [1, -32.4], [-22.5, -32.4]
  ], colors.T2, [70, 70, 70], 0.15);
  
  // T3 - Orange (bawah kanan)
  drawZone([
    [0, -3], [24.3, -30], [23.5, -32.4], [1, -32.4], [-6, -4]
  ], colors.T3, [70, 70, 70], 0.15);
  
  // T1 - Kuning muda (kiri besar) - DIPERBAIKI tanpa overlap dengan T2/T3
  drawZone([
    [-35, 3.1], [-23.5, -32.4], [-22.5, -32.4], [-6, -4], [0, -3], [0, 1.5]
  ], colors.T1, [70, 70, 70], 0.15);
  
  // D2 - Merah (kanan tengah ke bawah)
  drawZone([
    [4, 16], [32, -6.1], [24.3, -30], [0, -3], [0, 1.5]
  ], colors.D2, [70, 70, 70], 0.15);
  
  // D1 - Biru (kanan atas ke tengah) - tanpa overlap dengan S
  drawZone([
    [1, 24.5], [1, 33], [0, 40], [38, 12], [32, -6.1], [4, 16], [0, 1.5]
  ], colors.D1, [70, 70, 70], 0.15);
  
  // S - Hijau (kiri atas ke atas) - tanpa overlap dengan D1
  drawZone([
    [0, 1.5], [-35, 3.1], [-38, 12.4], [0, 40], [0, 33], [-1, 33], [-1, 24.5], [0, 24.5]
  ], colors.S, [70, 70, 70], 0.15);
  
  // PD - Ungu (kotak kecil di tengah atas) - paling depan
  drawZone([
    [-1, 24.5], [-1, 33], [1, 33], [1, 24.5]
  ], colors.PD, [60, 60, 60], 0.2);
  
  // Gambar outline pentagon (5 sudut)
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.4);
  const pentagonPoints = [
    { x: 0, y: 40 },      // H2 (atas)
    { x: 38, y: 12 },     // C2H2 (kanan atas)
    { x: 24, y: -32 },    // C2H4 (kanan bawah)
    { x: -24, y: -32 },   // CH4 (kiri bawah)
    { x: -38, y: 12 }     // C2H6 (kiri atas)
  ];
  for (let i = 0; i < 5; i++) {
    const next = (i + 1) % 5;
    doc.line(toX(pentagonPoints[i].x), toY(pentagonPoints[i].y), 
            toX(pentagonPoints[next].x), toY(pentagonPoints[next].y));
  }
  
  // Gambar garis dari pusat ke setiap sudut
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.2);
  pentagonPoints.forEach(p => {
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
    { x: pC2H2 * k * Math.cos(rad(18)), y: pC2H2 * k * Math.sin(rad(18)) }
  ];
  
  let Cx = 0, Cy = 0;
  points.forEach(p => {
    Cx += p.x;
    Cy += p.y;
  });
  
  const dotX = toX(Cx);
  const dotY = toY(Cy);
  
  // Gambar titik diagnosis (merah)
  doc.setFillColor(255, 0, 0);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(dotX, dotY, 2, 'FD');
};

// Fungsi utama untuk generate PDF sesuai template
export const generatePDFFromTemplate = (data) => {
  try {
    console.log("Generating PDF for:", data);
    // Set ukuran kertas A4 secara eksplisit
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    // Ambil kondisi
    const kondisiInfo = getKondisi(data.status_ieee, data);
    
    let currentY = 15;
    
    // ============================================
    // 1. HEADER - Standar IEEE
    // ============================================
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Standar: IEEE C57.104-2019", 14, currentY);
    
    currentY += 10;
    
    // ============================================
    // 2. IDENTITAS TRANSFORMATOR & DATA SAMPLING
    // ============================================
    
    // Judul Identitas Transformator (Kiri)
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 139, 139); // Teal color
    doc.text("Identitas Transformator", 14, currentY);
    
    // Judul Data Sampling (Kanan)
    doc.text("Data Sampling", 120, currentY);
    
    currentY += 6;
    
    // Data Identitas Transformator (Kiri)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    const leftLabels = [
      { label: "Gardu Induk", value: data.lokasi_gi || "" },
      { label: "Trafo", value: data.nama_trafo || "" },
      { label: "Merk Trafo", value: data.merk_trafo || "" },
      { label: "No. Seri Trafo", value: data.serial_number || "" },
      { label: "Tahun", value: data.tahun_pembuatan || "" },
      { label: "Volt", value: data.level_tegangan || "" },
    ];
    
    const rightLabels = [
      { label: "Tanggal Tes", value: data.tanggal_sampling || "" },
      { label: "Petugas", value: data.diambil_oleh || "" },
    ];
    
    // Gambar data kiri
    leftLabels.forEach((item, index) => {
      const y = currentY + (index * 5);
      doc.setTextColor(0, 139, 139);
      doc.text(item.label, 14, y);
      doc.setTextColor(0, 0, 0);
      doc.text(":", 55, y);
      doc.text(String(item.value), 60, y);
    });
    
    // Gambar data kanan
    rightLabels.forEach((item, index) => {
      const y = currentY + (index * 5);
      doc.setTextColor(0, 139, 139);
      doc.text(item.label, 120, y);
      doc.setTextColor(0, 0, 0);
      doc.text(":", 155, y);
      doc.text(String(item.value), 160, y);
    });
    
    currentY += 35;
    
    // ============================================
    // 3. DGA (Dissolved Gas Analysis)
    // ============================================
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("DGA (Dissolved Gas Anaylsis)", 14, currentY);
    
    currentY += 5;
    
    // Hitung TDCG
    const tdcgValue = Math.round(
      (parseFloat(data.h2) || 0) + 
      (parseFloat(data.ch4) || 0) + 
      (parseFloat(data.c2h2) || 0) + 
      (parseFloat(data.c2h4) || 0) + 
      (parseFloat(data.c2h6) || 0) + 
      (parseFloat(data.co) || 0)
    );
    
    // Data untuk tabel DGA
    const dgaTableData = [
      ["Hidrogen (H2)", data.h2 || 0],
      ["Metana (CH4)", data.ch4 || 0],
      ["Asetilena (C2H2)", data.c2h2 || 0],
      ["Etilen (C2H4)", data.c2h4 || 0],
      ["Etana (C2H6)", data.c2h6 || 0],
      ["Karbon Monoksida (CO)", data.co || 0],
      ["Karbon Dioksida (CO2)", data.co2 || 0],
    ];
    
    autoTable(doc, {
      startY: currentY,
      head: [["PARAMETER UJI", "HASIL (ppmv)"]],
      body: dgaTableData,
      theme: "grid",
      headStyles: {
        fillColor: [0, 139, 139],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 10,
      },
      bodyStyles: {
        halign: "center",
        fontSize: 10,
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 80 },
      },
      styles: {
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      tableWidth: 160,
      margin: { left: 14 },
    });
    
    // Tambah baris HASIL TDCG dan STATUS KONDISI
    let tdcgY = doc.lastAutoTable.finalY;
    
    autoTable(doc, {
      startY: tdcgY,
      body: [
        [{ content: "HASIL TDCG", styles: { textColor: [0, 0, 0], fontStyle: "bold" } }, 
         { content: tdcgValue, styles: { textColor: kondisiInfo.color, fontStyle: "bold" } }],
        [{ content: "STATUS KONDISI", styles: { textColor: [0, 0, 0], fontStyle: "bold" } }, 
         { content: `Kondisi ${kondisiInfo.kondisi}`, styles: { textColor: kondisiInfo.color, fontStyle: "bold" } }],
      ],
      theme: "grid",
      bodyStyles: {
        halign: "center",
        fontSize: 10,
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 80 },
      },
      styles: {
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      tableWidth: 160,
      margin: { left: 14 },
    });
    
    currentY = doc.lastAutoTable.finalY + 8;
    
    // ============================================
    // 4. KONDISI STATUS (Kiri) & DUVAL PENTAGON (Kanan)
    // ============================================
    
    const kondisiStartY = currentY;
    
    // Kondisi Status (Kiri)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Kondisi Status", 14, currentY);
    
    currentY += 6;
    
    // Kondisi 1 - Normal (Hijau)
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 16, currentY);
    doc.text("Kondisi 1", 20, currentY);
    doc.setTextColor(0, 128, 0);
    doc.setFont("helvetica", "bold");
    doc.text(": Normal. Lanjut monitoring.", 42, currentY);
    
    currentY += 5;
    
    // Kondisi 2 - Waspada (Orange)
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 16, currentY);
    doc.text("Kondisi 2", 20, currentY);
    doc.setTextColor(255, 165, 0);
    doc.setFont("helvetica", "bold");
    doc.text(": Waspada. Cek beban & interval uji.", 42, currentY);
    
    currentY += 5;
    
    // Kondisi 3 - Bahaya (Merah)
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 16, currentY);
    doc.text("Kondisi 3", 20, currentY);
    doc.setTextColor(220, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text(": Bahaya. Indikasi kerusakan aktif.", 42, currentY);
    
    
    // Duval Pentagon (Kanan) - Gambar di sebelah kanan kondisi status
    const pentagonCenterX = 150;
    const pentagonCenterY = kondisiStartY + 22;
    const pentagonSize = 42;
    
    // Data gas untuk pentagon
    const gasData = {
      h2: parseFloat(data.h2) || 0,
      ch4: parseFloat(data.ch4) || 0,
      c2h6: parseFloat(data.c2h6) || 0,
      c2h4: parseFloat(data.c2h4) || 0,
      c2h2: parseFloat(data.c2h2) || 0
    };
    
    // Gambar Duval Pentagon
    drawDuvalPentagon(doc, pentagonCenterX, pentagonCenterY, pentagonSize, gasData);
    
    // Tabel dimulai setelah pentagon selesai tapi dengan margin minimal
    const pentagonBottomY = pentagonCenterY + (pentagonSize * 0.95);
    currentY = pentagonBottomY + -14;
    
    // ============================================
    // 5. IEEE Std C57.104™-2019 Reference Table
    // ============================================
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Standar: IEEE Std C57.104-2019", 14, currentY);
    
    currentY += 5;
    
    // Tabel referensi IEEE
    const ieeeReferenceData = [
      [{ content: "Hidrogen (H2)", styles: { textColor: [0, 139, 139] } }, { content: "100 ppm", styles: { textColor: [220, 50, 50] } }, "Partial Discharge / Stray Gassing"],
      [{ content: "Metana (CH4)", styles: { textColor: [0, 139, 139] } }, { content: "120 ppm", styles: { textColor: [220, 50, 50] } }, "Overheating Minyak"],
      [{ content: "Asetilen (C2H2)", styles: { textColor: [0, 139, 139] } }, { content: "1 ppm", styles: { textColor: [220, 50, 50] } }, "Arcing (Busur Api) - SANGAT KRITIS"],
      [{ content: "Etilen (C2H4)", styles: { textColor: [0, 139, 139] } }, { content: "50 ppm", styles: { textColor: [220, 50, 50] } }, "Overheating Suhu Tinggi (>700\u00B0C)"],
      [{ content: "Etana (C2H6)", styles: { textColor: [0, 139, 139] } }, { content: "65 ppm", styles: { textColor: [220, 50, 50] } }, "Overheating Suhu Menengah"],
      [{ content: "Karbon Monoksida (CO)", styles: { textColor: [0, 139, 139] } }, { content: "350 ppm", styles: { textColor: [220, 50, 50] } }, "Degradasi Kertas Isolasi"],
      [{ content: "Karbon Dioksida (CO2)", styles: { textColor: [0, 139, 139] } }, { content: "2500 ppm", styles: { textColor: [220, 50, 50] } }, "Penuaan Kertas / Oksidasi"],
    ];
    
    autoTable(doc, {
      startY: currentY,
      head: [["Gas", "Limit (ppm)", "Indikasi"]],
      body: ieeeReferenceData,
      theme: "grid",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30, halign: "center" },
        2: { cellWidth: 80 },
      },
      styles: {
        cellPadding: 2.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      tableWidth: 160,
      margin: { left: 14 },
    });

    // ============================================
    // HALAMAN KEDUA: KESIMPULAN ANALISIS
    // ============================================
    doc.addPage();
    
    currentY = 15;
    
    // Header halaman 2 - Standar IEEE (sama seperti halaman 1)
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
    doc.setTextColor(0, 0, 0);
    
    const infoLabels = [
      { label: "Gardu Induk", value: data.lokasi_gi || "-" },
      { label: "Trafo", value: data.nama_trafo || "-" },
      { label: "Tanggal Pengujian", value: data.tanggal_sampling || "-" },
    ];
    
    infoLabels.forEach((item, index) => {
      const y = currentY + (index * 5);
      doc.setTextColor(0, 139, 139);
      doc.text(item.label, 14, y);
      doc.setTextColor(0, 0, 0);
      doc.text(":", 55, y);
      doc.text(String(item.value), 60, y);
    });
    
    currentY += 20;
    
    // Tentukan apakah ada hasil AI
    const hasAIResult = data.hasil_ai && data.hasil_ai.trim() !== "" && data.hasil_ai !== "AI sedang menganalisis...";
    
    // Debug: Log untuk memastikan hasil_ai terambil
    console.log("PDF Page 2 - hasil_ai:", data.hasil_ai);
    console.log("PDF Page 2 - hasAIResult:", hasAIResult);
    
    // Tabel Kesimpulan
    const kesimpulanContent = hasAIResult 
      ? data.hasil_ai.replace(/\\n/g, '\n').replace(/\*\*/g, '').replace(/\*/g, '•').trim()
      : generateAutoKesimpulan(data);
    
    autoTable(doc, {
      startY: currentY,
      head: [[{ 
        content: hasAIResult ? "KESIMPULAN & REKOMENDASI by VOLTY AI" : "KESIMPULAN & REKOMENDASI by VOLTY AI", 
        styles: { halign: "left" } 
      }]],
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
        overflow: 'linebreak',
      },
      tableWidth: 175,
      margin: { left: 14 },
    });
    
    // Footer halaman kedua
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text(
      hasAIResult ? "Analisis dihasilkan oleh VOLTY AI Assistant - PLN UPT Manado" : "Rekomendasi otomatis berdasarkan IEEE C57.104-2019",
      105,
      285,
      { align: "center" }
    );
    doc.text(
      `Generated: ${new Date().toLocaleString('id-ID')}`,
      105,
      290,
      { align: "center" }
    );

    // ============================================
    // SAVE PDF
    // ============================================
    
    const filename = `Laporan_DGA_${(data.nama_trafo || "Trafo").replace(/\s+/g, "_")}_${data.tanggal_sampling || "nodate"}.pdf`;
    doc.save(filename);
    
    console.log("PDF berhasil di-generate!", filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
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
  try {
    console.log("Generating PDF Blob for:", data);
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    const kondisiInfo = getKondisi(data.status_ieee, data);
    let currentY = 15;
    
    // ============================================
    // 1. HEADER - Standar IEEE
    // ============================================
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Standar: IEEE C57.104-2019", 14, currentY);
    
    currentY += 10;
    
    // ============================================
    // 2. IDENTITAS TRANSFORMATOR & DATA SAMPLING
    // ============================================
    
    // Judul Identitas Transformator (Kiri)
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 139, 139); // Teal color
    doc.text("Identitas Transformator", 14, currentY);
    
    // Judul Data Sampling (Kanan)
    doc.text("Data Sampling", 120, currentY);
    
    currentY += 6;
    
    // Data Identitas Transformator (Kiri)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    const leftLabels = [
      { label: "Gardu Induk", value: data.lokasi_gi || "" },
      { label: "Trafo", value: data.nama_trafo || "" },
      { label: "Merk Trafo", value: data.merk_trafo || "" },
      { label: "No. Seri Trafo", value: data.serial_number || "" },
      { label: "Tahun", value: data.tahun_pembuatan || "" },
      { label: "Volt", value: data.level_tegangan || "" },
    ];
    
    const rightLabels = [
      { label: "Tanggal Tes", value: data.tanggal_sampling || "" },
      { label: "Petugas", value: data.diambil_oleh || "" },
    ];
    
    // Gambar data kiri
    leftLabels.forEach((item, index) => {
      const y = currentY + (index * 5);
      doc.setTextColor(0, 139, 139);
      doc.text(item.label, 14, y);
      doc.setTextColor(0, 0, 0);
      doc.text(":", 55, y);
      doc.text(String(item.value), 60, y);
    });
    
    // Gambar data kanan
    rightLabels.forEach((item, index) => {
      const y = currentY + (index * 5);
      doc.setTextColor(0, 139, 139);
      doc.text(item.label, 120, y);
      doc.setTextColor(0, 0, 0);
      doc.text(":", 155, y);
      doc.text(String(item.value), 160, y);
    });
    
    currentY += 35;
    
    // DGA TABLE
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("DGA (Dissolved Gas Anaylsis)", 14, currentY);
    currentY += 5;
    
    const tdcgValue = Math.round(
      (parseFloat(data.h2) || 0) + 
      (parseFloat(data.ch4) || 0) + 
      (parseFloat(data.c2h2) || 0) + 
      (parseFloat(data.c2h4) || 0) + 
      (parseFloat(data.c2h6) || 0) + 
      (parseFloat(data.co) || 0)
    );
    
    const dgaTableData = [
      ["Hidrogen (H2)", data.h2 || 0],
      ["Metana (CH4)", data.ch4 || 0],
      ["Asetilena (C2H2)", data.c2h2 || 0],
      ["Etilen (C2H4)", data.c2h4 || 0],
      ["Etana (C2H6)", data.c2h6 || 0],
      ["Karbon Monoksida (CO)", data.co || 0],
      ["Karbon Dioksida (CO2)", data.co2 || 0],
    ];
    
    autoTable(doc, {
      startY: currentY,
      head: [["PARAMETER UJI", "HASIL (ppmv)"]],
      body: dgaTableData,
      theme: "grid",
      headStyles: { fillColor: [0, 139, 139], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 10 },
      bodyStyles: { halign: "center", fontSize: 10 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } },
      styles: { cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2 },
      tableWidth: 160,
      margin: { left: 14 },
    });
    
    let tdcgY = doc.lastAutoTable.finalY;
    
    autoTable(doc, {
      startY: tdcgY,
      body: [
        [{ content: "HASIL TDCG", styles: { textColor: [0, 0, 0], fontStyle: "bold" } }, 
         { content: tdcgValue, styles: { textColor: kondisiInfo.color, fontStyle: "bold" } }],
        [{ content: "STATUS KONDISI", styles: { textColor: [0, 0, 0], fontStyle: "bold" } }, 
         { content: `Kondisi ${kondisiInfo.kondisi}`, styles: { textColor: kondisiInfo.color, fontStyle: "bold" } }],
      ],
      theme: "grid",
      bodyStyles: { halign: "center", fontSize: 10 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } },
      styles: { cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2 },
      tableWidth: 160,
      margin: { left: 14 },
    });
    
    currentY = doc.lastAutoTable.finalY + 8;
    
    // KONDISI STATUS (Kiri) & DUVAL PENTAGON (Kanan)
    const kondisiStartY = currentY;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Kondisi Status", 14, currentY);
    currentY += 6;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 16, currentY);
    doc.text("Kondisi 1", 20, currentY);
    doc.setTextColor(0, 128, 0);
    doc.setFont("helvetica", "bold");
    doc.text(": Normal. Lanjut monitoring.", 42, currentY);
    currentY += 5;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 16, currentY);
    doc.text("Kondisi 2", 20, currentY);
    doc.setTextColor(255, 165, 0);
    doc.setFont("helvetica", "bold");
    doc.text(": Waspada. Cek beban & interval uji.", 42, currentY);
    currentY += 5;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 16, currentY);
    doc.text("Kondisi 3", 20, currentY);
    doc.setTextColor(220, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text(": Bahaya. Indikasi kerusakan aktif.", 42, currentY);
    
    // Duval Pentagon (Kanan)
    const pentagonCenterX = 150;
    const pentagonCenterY = kondisiStartY + 22;
    const pentagonSize = 42;
    
    const gasData = {
      h2: parseFloat(data.h2) || 0,
      ch4: parseFloat(data.ch4) || 0,
      c2h6: parseFloat(data.c2h6) || 0,
      c2h4: parseFloat(data.c2h4) || 0,
      c2h2: parseFloat(data.c2h2) || 0
    };
    
    drawDuvalPentagon(doc, pentagonCenterX, pentagonCenterY, pentagonSize, gasData);
    
    // Tabel dimulai setelah pentagon selesai tapi dengan margin minimal
    const pentagonBottomY = pentagonCenterY + (pentagonSize * 0.95);
    currentY = pentagonBottomY + -14;
    
    // IEEE REFERENCE TABLE
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Standar: IEEE Std C57.104-2019", 14, currentY);
    currentY += 5;
    
    const ieeeReferenceData = [
      [{ content: "Hidrogen (H2)", styles: { textColor: [0, 139, 139] } }, { content: "100 ppm", styles: { textColor: [220, 50, 50] } }, "Partial Discharge / Stray Gassing"],
      [{ content: "Metana (CH4)", styles: { textColor: [0, 139, 139] } }, { content: "120 ppm", styles: { textColor: [220, 50, 50] } }, "Overheating Minyak"],
      [{ content: "Asetilen (C2H2)", styles: { textColor: [0, 139, 139] } }, { content: "1 ppm", styles: { textColor: [220, 50, 50] } }, "Arcing (Busur Api) - SANGAT KRITIS"],
      [{ content: "Etilen (C2H4)", styles: { textColor: [0, 139, 139] } }, { content: "50 ppm", styles: { textColor: [220, 50, 50] } }, "Overheating Suhu Tinggi (>700\u00B0C)"],
      [{ content: "Etana (C2H6)", styles: { textColor: [0, 139, 139] } }, { content: "65 ppm", styles: { textColor: [220, 50, 50] } }, "Overheating Suhu Menengah"],
      [{ content: "Karbon Monoksida (CO)", styles: { textColor: [0, 139, 139] } }, { content: "350 ppm", styles: { textColor: [220, 50, 50] } }, "Degradasi Kertas Isolasi"],
      [{ content: "Karbon Dioksida (CO2)", styles: { textColor: [0, 139, 139] } }, { content: "2500 ppm", styles: { textColor: [220, 50, 50] } }, "Penuaan Kertas / Oksidasi"],
    ];
    
    autoTable(doc, {
      startY: currentY,
      head: [["Gas", "Limit (ppm)", "Indikasi"]],
      body: ieeeReferenceData,
      theme: "grid",
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 30, halign: "center" }, 2: { cellWidth: 80 } },
      styles: { cellPadding: 2.5, lineColor: [0, 0, 0], lineWidth: 0.2 },
      tableWidth: 160,
      margin: { left: 14 },
    });
    
    // ============================================
    // HALAMAN KEDUA: KESIMPULAN ANALISIS
    // ============================================
    doc.addPage();
    
    currentY = 15;
    
    // Header halaman 2 - Standar IEEE (sama seperti halaman 1)
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
    doc.setTextColor(0, 0, 0);
    
    const infoLabelsBlob = [
      { label: "Gardu Induk", value: data.lokasi_gi || "-" },
      { label: "Trafo", value: data.nama_trafo || "-" },
      { label: "Tanggal Pengujian", value: data.tanggal_sampling || "-" },
    ];
    
    infoLabelsBlob.forEach((item, index) => {
      const y = currentY + (index * 5);
      doc.setTextColor(0, 139, 139);
      doc.text(item.label, 14, y);
      doc.setTextColor(0, 0, 0);
      doc.text(":", 55, y);
      doc.text(String(item.value), 60, y);
    });
    
    currentY += 20;
    
    // Tentukan apakah ada hasil AI
    const hasAIResult = data.hasil_ai && data.hasil_ai.trim() !== "" && data.hasil_ai !== "AI sedang menganalisis...";
    
    // Tabel Kesimpulan
    const kesimpulanContent = hasAIResult 
      ? data.hasil_ai.replace(/\\n/g, '\n').replace(/\*\*/g, '').replace(/\*/g, '•').trim()
      : generateAutoKesimpulan(data);
    
    autoTable(doc, {
      startY: currentY,
      head: [[{ 
        content: hasAIResult ? "KESIMPULAN & REKOMENDASI by VOLTY AI" : "KESIMPULAN & REKOMENDASI by VOLTY AI", 
        styles: { halign: "left" } 
      }]],
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
        overflow: 'linebreak',
      },
      tableWidth: 175,
      margin: { left: 14 },
    });
    
    // Footer halaman kedua
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text(
      hasAIResult ? "Analisis dihasilkan oleh VOLTY AI Assistant - PLN UPT Manado" : "Rekomendasi otomatis berdasarkan IEEE C57.104-2019",
      105,
      285,
      { align: "center" }
    );
    doc.text(
      `Generated: ${new Date().toLocaleString('id-ID')}`,
      105,
      290,
      { align: "center" }
    );
    
    return doc.output('blob');
  } catch (error) {
    console.error("Error generating PDF blob:", error);
    throw error;
  }
};
