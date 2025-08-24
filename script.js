let qrCode;
let history = JSON.parse(localStorage.getItem("qrHistory")) || [];

const qrInput = document.getElementById("qrInput");
const qrColor = document.getElementById("qrColor");
const qrLogo = document.getElementById("qrLogo");
const preview = document.getElementById("qrPreview");
const generateBtn = document.getElementById("generateBtn");

if (generateBtn) {
  generateBtn.addEventListener("click", generateQR);
}

function generateQR() {
  preview.innerHTML = "";
  const text = qrInput.value;
  if (!text) return alert("أدخل نص أو رابط");

  const color = qrColor.value;
  const canvas = document.createElement("canvas");
  const qr = new QRious({
    element: canvas,
    value: text,
    size: 200,
    foreground: color
  });

  // إضافة الشعار في منتصف الكود
  if (qrLogo.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = function() {
        const w = 50, h = 50;
        ctx.drawImage(img, (canvas.width-w)/2, (canvas.height-h)/2, w, h);
        preview.appendChild(canvas);
        saveToHistory(canvas.toDataURL());
      }
      img.src = e.target.result;
    }
    reader.readAsDataURL(qrLogo.files[0]);
  } else {
    preview.appendChild(canvas);
    saveToHistory(canvas.toDataURL());
  }
}

function saveToHistory(dataUrl) {
  history.push(dataUrl);
  localStorage.setItem("qrHistory", JSON.stringify(history));
}

const historyContainer = document.getElementById("historyContainer");
if (historyContainer) {
  history.forEach(item => {
    const img = document.createElement("img");
    img.src = item;
    historyContainer.appendChild(img);
  });
}

// تحميل PNG
document.getElementById("downloadPng")?.addEventListener("click", () => {
  download("qr.png", preview.querySelector("canvas").toDataURL("image/png"));
});

// تحميل SVG
document.getElementById("downloadSvg")?.addEventListener("click", () => {
  alert("SVG يحتاج مكتبة إضافية للتحويل");
});

// تحميل PDF
document.getElementById("downloadPdf")?.addEventListener("click", () => {
  alert("PDF يحتاج مكتبة مثل jsPDF");
});

function download(filename, url) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
