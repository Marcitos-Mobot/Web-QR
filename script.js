let usageCount = localStorage.getItem("usageCount") || 0;
document.getElementById("usageCount").innerText = usageCount;

const qrText = document.getElementById("qrText");
const qrColor = document.getElementById("qrColor");
const qrPreview = document.getElementById("qrPreview");

function generateQR() {
  qrPreview.innerHTML = "";
  if(qrText.value.trim() === "") return;

  const qr = new QRCode(qrPreview, {
    text: qrText.value,
    width: 200,
    height: 200,
    colorDark: qrColor.value,
    colorLight: "#ffffff"
  });
}

qrText.addEventListener("input", generateQR);
qrColor.addEventListener("input", generateQR);

function downloadQR(type) {
  const img = qrPreview.querySelector("img") || qrPreview.querySelector("canvas");
  if (!img) return;

  const dataUrl = img.src || img.toDataURL();

  if(type === "png"){
    saveFile(dataUrl, "qrcode.png");
  } else if(type === "svg"){
    saveFile(dataUrl, "qrcode.svg");
  } else if(type === "pdf"){
    const pdf = new jsPDF();
    pdf.addImage(dataUrl, "PNG", 10, 10, 100, 100);
    pdf.save("qrcode.pdf");
  }

  usageCount++;
  localStorage.setItem("usageCount", usageCount);
  document.getElementById("usageCount").innerText = usageCount;

  // حفظ في history
  const history = JSON.parse(localStorage.getItem("qrHistory")) || [];
  history.push(dataUrl);
  localStorage.setItem("qrHistory", JSON.stringify(history));
}

function saveFile(data, filename){
  const a = document.createElement("a");
  a.href = data;
  a.download = filename;
  a.click();
}
