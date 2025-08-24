function generateQR() {
  let qrText = document.getElementById("qrText").value;
  let qrColor = document.getElementById("qrColor").value;

  if (qrText.trim() === "") {
    alert("Please enter text or URL");
    return;
  }

  // Generate QR with color
  let qrResult = document.getElementById("qrResult");
  qrResult.innerHTML = "";
  
  let qr = new QRCode(qrResult, {
    text: qrText,
    width: 200,
    height: 200,
    colorDark: qrColor,
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  // Show download button
  document.getElementById("downloadSection").style.display = "block";
}

function downloadQR() {
  let qrCanvas = document.querySelector("#qrResult canvas");
  let qrImage = qrCanvas.toDataURL("image/png");
  
  let link = document.createElement("a");
  link.href = qrImage;
  link.download = "qr_code.png";
  link.click();
}
