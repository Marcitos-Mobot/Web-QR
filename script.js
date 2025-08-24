let usage = 0;
const qrCanvas = document.getElementById("qrCanvas");
const ctx = qrCanvas.getContext("2d");

document.getElementById("generateBtn").addEventListener("click", () => {
  const text = document.getElementById("qrText").value;
  const color = document.getElementById("qrColor").value;
  const bg = document.getElementById("bgColor").value;

  if (!text) {
    alert("من فضلك اكتب نص أو رابط");
    return;
  }

  QRCode.toCanvas(qrCanvas, text, {
    color: {
      dark: color,
      light: bg
    }
  }, (err) => {
    if (err) console.error(err);
    saveHistory();
    usage++;
    document.getElementById("usageCount").innerText = `مرات الاستخدام: ${usage}`;
  });
});

function saveHistory() {
  const dataUrl = qrCanvas.toDataURL();
  let history = JSON.parse(localStorage.getItem("qrHistory")) || [];
  history.push(dataUrl);
  localStorage.setItem("qrHistory", JSON.stringify(history));
}

// تحميل PNG
document.getElementById("downloadPNG").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "qr.png";
  link.href = qrCanvas.toDataURL();
  link.click();
});

// تحميل SVG
document.getElementById("downloadSVG").addEventListener("click", () => {
  const text = document.getElementById("qrText").value;
  const color = document.getElementById("qrColor").value;
  const bg = document.getElementById("bgColor").value;

  QRCode.toString(text, { type: "svg", color: { dark: color, light: bg } }, (err, svg) => {
    if (err) throw err;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.download = "qr.svg";
    link.href = URL.createObjectURL(blob);
    link.click();
  });
});

// تحميل PDF
document.getElementById("downloadPDF").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdf.addImage(qrCanvas.toDataURL(), "PNG", 20, 20, 100, 100);
  pdf.save("qr.pdf");
});
