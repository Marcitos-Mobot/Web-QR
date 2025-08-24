let qr;

// Generate QR Code
function generateQR(url, color, logoFile) {
  document.getElementById("qr-preview").innerHTML = "";
  qr = new QRCode(document.getElementById("qr-preview"), {
    text: url,
    width: 200,
    height: 200,
    colorDark: color,
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  // If logo uploaded
  if (logoFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const qrCanvas = document.querySelector("#qr-preview canvas");
      const ctx = qrCanvas.getContext("2d");
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const size = 50;
        ctx.drawImage(img, (qrCanvas.width - size) / 2, (qrCanvas.height - size) / 2, size, size);
      };
    };
    reader.readAsDataURL(logoFile);
  }
}

// Event Listeners
document.getElementById("qr-url").addEventListener("input", updateQR);
document.getElementById("qr-color").addEventListener("input", updateQR);
document.getElementById("qr-logo").addEventListener("change", updateQR);

function updateQR() {
  const url = document.getElementById("qr-url").value || "https://example.com";
  const color = document.getElementById("qr-color").value;
  const logoFile = document.getElementById("qr-logo").files[0];
  generateQR(url, color, logoFile);
}

// Download
document.getElementById("download-btn").addEventListener("click", () => {
  const canvas = document.querySelector("#qr-preview canvas");
  const link = document.createElement("a");
  link.download = "qr-code.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

// Load QR default
updateQR();
