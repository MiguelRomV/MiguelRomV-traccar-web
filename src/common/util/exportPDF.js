import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "../../resources/images/logo-vigilateh.png";

const loadLogo = () =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 180;
      canvas.height = 60;
      const context = canvas.getContext("2d");
      const ratio = Math.min(
        canvas.width / image.width,
        canvas.height / image.height,
      );
      const width = image.width * ratio;
      const height = image.height * ratio;
      context.drawImage(
        image,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height,
      );
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => resolve(null);
    image.src = logoUrl;
  });

const exportPDF = async (title, filename, sheets) => {
  const document = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const logo = await loadLogo();
  const generated = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  let firstSheet = true;

  sheets.forEach((rows, sheetName) => {
    if (!rows.length) return;
    if (!firstSheet) document.addPage();
    firstSheet = false;
    if (logo) document.addImage(logo, "PNG", 12, 7, 36, 12);
    document.setTextColor("#1F2937");
    document.setFontSize(16);
    document.text(title, 54, 13);
    document.setFontSize(9);
    document.setTextColor("#6B7280");
    document.text(sheetName, 54, 18);

    const headers = Object.keys(rows[0]);
    autoTable(document, {
      startY: 24,
      head: [headers],
      body: rows.map((row) => headers.map((header) => row[header] ?? "")),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: {
        fillColor: [10, 118, 196],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 246, 248] },
      margin: { top: 24, right: 12, bottom: 14, left: 12 },
    });
  });

  if (firstSheet) return;
  const pages = document.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    document.setPage(page);
    document.setFontSize(8);
    document.setTextColor("#8A8F98");
    document.text(`VigilaTeh · ${generated}`, 12, 203);
    document.text(`${page} / ${pages}`, 285, 203, { align: "right" });
  }
  document.save(filename);
};

export default exportPDF;
