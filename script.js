let qrCode;

function generateQR() {
  let qrText = document.getElementById("qrText").value;
  let qrColor = document.getElementById("qrColor").value;
  let qrBg = document.getElementById("qrBg").value;
  let qrSize = document.getElementById("qrSize").value;

  if (qrCode) {
    qrCode.clear();
    document.getElementById("qrcode").innerHTML = "";
  }

  qrCode = new QRCode(document.getElementById("qrcode"), {
    text: qrText,
    width: parseInt(qrSize),
    height: parseInt(qrSize),
    colorDark: qrColor,
    colorLight: qrBg
  });

  document.getElementById("downloadBtn").style.display = "inline-block";
}

document.getElementById("downloadBtn").addEventListener("click", function() {
  let img = document.querySelector("#qrcode img");
  if (img) {
    let link = document.createElement("a");
    link.href = img.src;
    link.download = "qrcode.png";
    link.click();
  }
});

function setText(plan) {
  document.getElementById("qrText").value = plan;
}
