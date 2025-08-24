/* =========================
   Simple localStorage Plan/Quota
   ========================= */
const PLANS = {
  free: { limit: 10, label: "Free" },
  pro: { limit: 200, label: "Pro" },
  business: { limit: Infinity, label: "Business" },
};

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function loadQuota() {
  const stored = JSON.parse(localStorage.getItem("qr_quota") || "{}");
  const monthKey = getMonthKey();

  // if month changed -> reset usage
  if (stored.month !== monthKey) {
    stored.month = monthKey;
    stored.plan = stored.plan || "free";
    stored.used = 0;
  } else {
    stored.plan = stored.plan || "free";
    stored.used = stored.used || 0;
  }
  localStorage.setItem("qr_quota", JSON.stringify(stored));
  return stored;
}

function saveQuota(data) {
  localStorage.setItem("qr_quota", JSON.stringify(data));
}

function remainingDownloads(data) {
  const lim = PLANS[data.plan].limit;
  if (lim === Infinity) return "∞";
  return Math.max(lim - data.used, 0);
}

/* =========================
   DOM Elements
   ========================= */
const els = {};
function $(id){ return document.getElementById(id); }

window.addEventListener("DOMContentLoaded", () => {
  els.text = $("text-input");
  els.qrColor = $("qr-color");
  els.bgColor = $("bg-color");
  els.size = $("qr-size");
  els.format = $("file-format");
  els.logo = $("logo-upload");
  els.logoSize = $("logo-size");
  els.btnGenerate = $("btn-generate");
  els.btnClear = $("btn-clear");
  els.download = $("download-btn");
  els.message = $("message");
  els.preview = $("qr-code");

  // plan
  els.planSelect = $("plan-select");
  els.savePlan = $("save-plan");
  els.quotaInfo = $("quota-info");

  // init quota state
  state.quota = loadQuota();
  els.planSelect.value = state.quota.plan;
  updateQuotaInfo();

  // listeners
  els.btnGenerate.addEventListener("click", generateQR);
  els.btnClear.addEventListener("click", clearAll);
  els.savePlan.addEventListener("click", () => {
    state.quota.plan = els.planSelect.value;
    state.quota.used = 0; // reset usage on plan change (demo behavior)
    state.quota.month = getMonthKey();
    saveQuota(state.quota);
    updateQuotaInfo();
    toast(`Plan saved: ${PLANS[state.quota.plan].label}`);
  });

  // download handler (counts quota)
  els.download.addEventListener("click", handleDownloadClick);
});

function updateQuotaInfo() {
  const rem = remainingDownloads(state.quota);
  const plan = PLANS[state.quota.plan].label;
  els.quotaInfo.textContent = `Current: ${plan} — Remaining downloads this month: ${rem}`;
}

function toast(msg, isError=false) {
  els.message.textContent = msg;
  els.message.style.color = isError ? "#b91c1c" : "#6b7280";
  setTimeout(() => { els.message.textContent = ""; }, 3500);
}

/* =========================
   Generation & Download
   ========================= */
const state = {
  canvas: null,
  svgBlobUrl: null,
  lastFormat: "png",
  quota: null,
};

async function generateQR() {
  clearPreviewArtifacts();

  const text = (els.text.value || "").trim();
  const color = els.qrColor.value || "#000000";
  const bgColor = els.bgColor.value || "#ffffff";
  const size = parseInt(els.size.value, 10) || 300;
  const format = els.format.value;
  const logoFile = els.logo.files && els.logo.files[0] ? els.logo.files[0] : null;
  const logoScale = (parseInt(els.logoSize.value, 10) || 20) / 100; // 0.2 default

  if (!text) {
    toast("Please enter text or URL.", true);
    return;
  }

  // Always render a Canvas preview (with optional logo).
  // We'll use it for PNG/PDF and as fallback for SVG when a logo is present.
  try {
    const canvas = await toCanvas(text, size, color, bgColor);
    if (logoFile) {
      await drawLogoOnCanvas(canvas, logoFile, logoScale);
    }
    state.canvas = canvas;
    els.preview.innerHTML = "";
    els.preview.appendChild(canvas);
    state.lastFormat = format;

    // Prepare download link depending on chosen format & logo presence
    prepareDownloadLink(format, Boolean(logoFile));
    toast("Preview updated.");
  } catch (e) {
    console.error(e);
    toast("Failed to generate QR. Check console.", true);
  }
}

// Convert text -> Canvas QR
function toCanvas(text, size, color, bgColor) {
  return new Promise((resolve, reject) => {
    QRCode.toCanvas(
      text,
      {
        width: size,
        color: { dark: color, light: bgColor },
        errorCorrectionLevel: "H",
        margin: 2
      },
      (err, canvas) => {
        if (err) return reject(err);
        resolve(canvas);
      }
    );
  });
}

// Draw centered logo on the canvas
function drawLogoOnCanvas(canvas, file, scale) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        const logoSize = Math.floor(canvas.width * scale);
        const x = (canvas.width - logoSize) / 2;
        const y = (canvas.height - logoSize) / 2;

        // Optional: white background behind logo to improve contrast
        ctx.fillStyle = "#ffffff";
        const pad = Math.round(logoSize * 0.08);
        ctx.fillRect(x - pad, y - pad, logoSize + 2*pad, logoSize + 2*pad);

        ctx.drawImage(img, x, y, logoSize, logoSize);
        resolve();
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Prepare download link depending on format + whether logo exists
function prepareDownloadLink(format, hasLogo) {
  // Revoke old SVG blob (if any)
  if (state.svgBlobUrl) {
    URL.revokeObjectURL(state.svgBlobUrl);
    state.svgBlobUrl = null;
  }

  if (format === "png") {
    const data = state.canvas.toDataURL("image/png");
    els.download.href = data;
    els.download.download = "qrcode.png";
    els.download.removeAttribute("disabled");
  } else if (format === "pdf") {
    // We'll generate PDF when user clicks download (needs jsPDF instance)
    els.download.removeAttribute("href");
    els.download.removeAttribute("download");
    els.download.setAttribute("data-format", "pdf");
    els.download.removeAttribute("disabled");
  } else if (format === "svg") {
    if (hasLogo) {
      // Pure vector with embedded raster logo is complex; fallback to PNG
      const data = state.canvas.toDataURL("image/png");
      els.download.href = data;
      els.download.download = "qrcode.png";
      els.download.removeAttribute("disabled");
      toast("SVG with logo not supported. Provided PNG instead.", true);
    } else {
      // Generate true SVG from library
      QRCode.toString(
        els.text.value.trim(),
        {
          type: "svg",
          color: { dark: els.qrColor.value, light: els.bgColor.value },
          errorCorrectionLevel: "H",
          margin: 2,
          width: parseInt(els.size.value,10)
        },
        (err, svgString) => {
          if (err) {
            console.error(err);
            toast("SVG generation failed. Using PNG fallback.", true);
            const data = state.canvas.toDataURL("image/png");
            els.download.href = data;
            els.download.download = "qrcode.png";
            els.download.removeAttribute("disabled");
            return;
          }
          const blob = new Blob([svgString], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          state.svgBlobUrl = url;
          els.download.href = url;
          els.download.download = "qrcode.svg";
          els.download.removeAttribute("disabled");
        }
      );
    }
  }

  // Store last requested format (used in click handler)
  state.lastFormat = format;
  els.download.textContent = `Download ${state.lastFormat.toUpperCase()}`;
  els.download.classList.remove("hidden");
}

// Count quota on download click, and generate on-demand (for PDF)
function handleDownloadClick(ev) {
  ev.preventDefault();

  // Check quota BEFORE triggering the file
  const plan = state.quota.plan;
  const limit = PLANS[plan].limit;
  if (limit !== Infinity && state.quota.used >= limit) {
    toast("You reached this month's download limit for your plan.", true);
    return;
  }

  const format = state.lastFormat;

  // If PDF, build and save immediately
  if (format === "pdf") {
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      // Fit within page with margins
      const margin = 36;
      const maxW = pageW - margin * 2;
      const imgData = state.canvas.toDataURL("image/png");
      const ratio = state.canvas.height / state.canvas.width;
      const drawW = maxW;
      const drawH = drawW * ratio;
      pdf.addImage(imgData, "PNG", margin, margin, drawW, drawH);
      pdf.save("qrcode.pdf");
      incrementUsageAndNotify();
    } catch (e) {
      console.error(e);
      toast("PDF export failed.", true);
    }
    return;
  }

  // For PNG/SVG we already prepared href+download (except when SVG failed -> PNG fallback).
  // Manually trigger the link's default behavior after quota passes.
  const a = els.download;
  const href = a.getAttribute("href");
  const downloadName = a.getAttribute("download");

  if (!href) {
    toast("Nothing to download yet. Generate a preview first.", true);
    return;
  }

  // Create a temporary anchor to trigger save cleanly
  const tmp = document.createElement("a");
  tmp.href = href;
  tmp.download = downloadName || `qrcode.${format}`;
  document.body.appendChild(tmp);
  tmp.click();
  document.body.removeChild(tmp);

  incrementUsageAndNotify();
}

function incrementUsageAndNotify() {
  state.quota = loadQuota(); // ensure month rollover
  state.quota.used = (state.quota.used || 0) + 1;
  saveQuota(state.quota);
  updateQuotaInfo();
  toast("Downloaded. Quota updated.");
}

function clearPreviewArtifacts() {
  els.preview.innerHTML = "";
  els.download.setAttribute("disabled", "true");
  els.download.removeAttribute("href");
  els.download.removeAttribute("download");
  els.download.removeAttribute("data-format");
}

/* =========================
   Utilities
   ========================= */
function clearAll() {
  els.text.value = "";
  els.logo.value = "";
  els.logoSize.value = 20;
  clearPreviewArtifacts();
  toast("Cleared.");
}