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
    
    let currentY = 10;
    
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
        [{ content: "HASIL TDCG", styles: { textColor: [220, 50, 50], fontStyle: "bold" } }, tdcgValue],
        [{ content: "STATUS KONDISI", styles: { textColor: [0, 139, 139], fontStyle: "bold" } }, 
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
    
    currentY = doc.lastAutoTable.finalY + 10;
    
    // ============================================
    // 4. KONDISI STATUS
    // ============================================
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Kondisi Status", 14, currentY);
    
    currentY += 8;
    
    // Kondisi 1 - Normal (Hijau)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 20, currentY);
    doc.text("Kondisi 1", 25, currentY);
    doc.setTextColor(0, 128, 0); // Hijau
    doc.setFont("helvetica", "bold");
    doc.text(": Normal. Lanjut monitoring.", 50, currentY);
    
    currentY += 6;
    
    // Kondisi 2 - Waspada (Orange)
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 20, currentY);
    doc.text("Kondisi 2", 25, currentY);
    doc.setTextColor(255, 165, 0); // Orange
    doc.setFont("helvetica", "bold");
    doc.text(": Waspada. Cek beban & interval uji.", 50, currentY);
    
    currentY += 6;
    
    // Kondisi 3 - Bahaya (Merah)
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 20, currentY);
    doc.text("Kondisi 3", 25, currentY);
    doc.setTextColor(220, 50, 50); // Merah
    doc.setFont("helvetica", "bold");
    doc.text(": Bahaya. Indikasi kerusakan aktif.", 50, currentY);
    
    currentY += 10;
    
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
export const generatePDFBlob = (data) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    const kondisiInfo = getKondisi(data.status_ieee, data);
    let currentY = 10;
    
    // HEADER
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Standar: IEEE C57.104-2019", 14, currentY);
    currentY += 10;
    
    // IDENTITAS TRANSFORMATOR & DATA SAMPLING
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 139, 139);
    doc.text("Identitas Transformator", 14, currentY);
    doc.text("Data Sampling", 120, currentY);
    currentY += 6;
    
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
    
    leftLabels.forEach((item, index) => {
      const y = currentY + (index * 5);
      doc.setTextColor(0, 139, 139);
      doc.text(item.label, 14, y);
      doc.setTextColor(0, 0, 0);
      doc.text(":", 55, y);
      doc.text(String(item.value), 60, y);
    });
    
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
        [{ content: "HASIL TDCG", styles: { textColor: [220, 50, 50], fontStyle: "bold" } }, tdcgValue],
        [{ content: "STATUS KONDISI", styles: { textColor: [0, 139, 139], fontStyle: "bold" } }, 
         { content: `Kondisi ${kondisiInfo.kondisi}`, styles: { textColor: kondisiInfo.color, fontStyle: "bold" } }],
      ],
      theme: "grid",
      bodyStyles: { halign: "center", fontSize: 10 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } },
      styles: { cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2 },
      tableWidth: 160,
      margin: { left: 14 },
    });
    
    currentY = doc.lastAutoTable.finalY + 10;
    
    // KONDISI STATUS
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Kondisi Status", 14, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 20, currentY);
    doc.text("Kondisi 1", 25, currentY);
    doc.setTextColor(0, 128, 0);
    doc.setFont("helvetica", "bold");
    doc.text(": Normal. Lanjut monitoring.", 50, currentY);
    currentY += 6;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 20, currentY);
    doc.text("Kondisi 2", 25, currentY);
    doc.setTextColor(255, 165, 0);
    doc.setFont("helvetica", "bold");
    doc.text(": Waspada. Cek beban & interval uji.", 50, currentY);
    currentY += 6;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("\u2022", 20, currentY);
    doc.text("Kondisi 3", 25, currentY);
    doc.setTextColor(220, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text(": Bahaya. Indikasi kerusakan aktif.", 50, currentY);
    currentY += 10;
    
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
    
    return doc.output('blob');
  } catch (error) {
    console.error("Error generating PDF blob:", error);
    throw error;
  }
};
