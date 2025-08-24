let selectedPlan = "Free";
let qrCount = 0;
let planLimits = { Free: 5, Starter: 20, Pro: 100, Business: 500, Unlimited: Infinity };

function selectPlan(plan) {
  selectedPlan = plan;
  document.getElementById("selectedPlan").innerText = "Selected Plan: " + plan;
  qrCount = 0; // reset count on plan change
}

function generateQR() {
  let text = document.getElementById("qrText").value;
  let color = document.getElementById("qrColor").value;
  let bgColor = document.getElementById("qrBgColor").value;
  let logoFile = document.getElementById("qrLogo").files[0];

  if (!text) {
    alert("Please enter text or URL!");
    return;
  }

  if (qrCount >= planLimits[selectedPlan]) {
    alert("Plan limit reached! Upgrade your plan.");
    return;
  }

  let canvas = document.getElementById("qrCanvas");

  QRCode.toCanvas(canvas, text, {
    color: {
      dark: color,
      light: bgColor
    },
    width: 250
  }, async function (error) {
    if (error) console.error(error);
    if (logoFile) {
      let ctx = canvas.getContext("2d");
      let logo = new Image();
      logo.src = URL.createObjectURL(logoFile);
      logo.onload = function () {
        let size = 60;
        ctx.drawImage(logo, (canvas.width - size) / 2, (canvas.height - size) / 2, size, size);
      }
    }
  });

  // save to history
  qrCount++;
  let history = document.getElementById("qrHistory");
  let img = document.createElement("img");
  img.src = canvas.toDataURL();
  history.appendChild(img);
}

function downloadQR(format) {
  let canvas = document.getElementById("qrCanvas");
  let link = document.createElement("a");

  if (format === "png") {
    link.href = canvas.toDataURL("image/png");
    link.download = "qrcode.png";
  } else if (format === "svg") {
    QRCode.toString(document.getElementById("qrText").value, { type: "svg" }, function (err, string) {
      let blob = new Blob([string], { type: "image/svg+xml" });
      link.href = URL.createObjectURL(blob);
      link.download = "qrcode.svg";
      link.click();
    });
    return;
  } else if (format === "pdf") {
    const { jsPDF } = window.jspdf;
    let pdf = new jsPDF();
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 20, 20, 100, 100);
    pdf.save("qrcode.pdf");
    return;
  }
  link.click();
}
