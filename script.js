/* ================= Configuration & storage ================= */
const PLANS = {
  free: { label: "Free", limit: 5 },
  starter: { label: "Starter", limit: 50 },
  pro: { label: "Pro", limit: 200 },
  business: { label: "Business", limit: 1000 },
  enterprise: { label: "Enterprise", limit: Infinity }
};
const STORAGE_KEY = "qr_app_quota_v1";
const HISTORY_KEY = "qr_app_history_v1";

/* ================= Helpers for month-aware quota ================= */
function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function loadQuota() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let state = raw ? JSON.parse(raw) : null;
  const month = getMonthKey();
  if (!state || state.month !== month) {
    state = { month, plan: "free", used: 0 };
    saveQuota(state);
  }
  return state;
}
function saveQuota(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function remainingFor(state) {
  const limit = PLANS[state.plan].limit;
  if (limit === Infinity) return "∞";
  return Math.max(limit - (state.used || 0), 0);
}

/* =============== History helpers (localStorage) =============== */
function loadHistory() {
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}
function saveHistory(arr) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
}
function addHistory(entry) {
  const arr = loadHistory();
  arr.unshift(entry); // newest first
  // keep last 200 for safety
  if (arr.length > 200) arr.length = 200;
  saveHistory(arr);
  renderHistory();
}

/* ================= DOM refs ================= */
const inputData = document.getElementById("inputData");
const inputQrColor = document.getElementById("inputQrColor");
const inputBgColor = document.getElementById("inputBgColor");
const inputLogo = document.getElementById("inputLogo");
const inputLogoSize = document.getElementById("inputLogoSize");
const btnGenerate = document.getElementById("btnGenerate");
const btnClear = document.getElementById("btnClear");
const previewBox = document.getElementById("previewBox");
const downloadPNG = document.getElementById("downloadPNG");
const downloadSVG = document.getElementById("downloadSVG");
const downloadPDF = document.getElementById("downloadPDF");
const messageEl = document.getElementById("message");
const currentPlanLabel = document.getElementById("currentPlanLabel");
const remainingCount = document.getElementById("remainingCount");

/* Nav */
const navGenerator = document.getElementById("navGenerator");
const navDashboard = document.getElementById("navDashboard");
const viewGenerator = document.getElementById("viewGenerator");
const viewDashboard = document.getElementById("viewDashboard");

/* Plans quick on generator and plan cards */
document.querySelectorAll(".plan-card").forEach(card => {
  const btn = card.querySelector(".plan-select");
  btn.addEventListener("click", () => {
    const plan = card.dataset.plan;
    appQuota.plan = plan;
    appQuota.used = 0; // demo: reset usage when selecting
    appQuota.month = getMonthKey();
    saveQuota(appQuota);
    refreshQuotaUI();
    showMessage(`تم اختيار الخطة: ${PLANS[plan].label}`, false);
    highlightPlanCard(plan);
  });
});
function highlightPlanCard(planKey) {
  document.querySelectorAll(".plan-card").forEach(c => {
    c.style.outline = c.dataset.plan === planKey ? "3px solid rgba(0,168,168,0.12)" : "none";
  });
}

/* ================= State ================= */
let appQuota = loadQuota();
let uploadedLogoDataUrl = null;
let logoImage = null; // Image object
let currentCanvas = null;

/* ================= Init UI ================= */
function updatePlanUI() {
  currentPlanLabel.textContent = PLANS[appQuota.plan].label;
  remainingCount.textContent = remainingFor(appQuota);
}
updatePlanUI();

/* highlight selected at start */
highlightPlanCard(appQuota.plan);

/* render history initially */
function renderHistory() {
  const container = document.getElementById("historyList");
  const arr = loadHistory();
  if (!container) return;
  container.innerHTML = "";
  if (!arr.length) {
    container.innerHTML = `<div class="empty-note">لا توجد عمليات تحميل بعد.</div>`;
    return;
  }

  arr.forEach(item => {
    const el = document.createElement("div");
    el.className = "history-item";
    el.innerHTML = `
      <div>
        <div><strong>${escapeHtml(item.text)}</strong></div>
        <div class="meta">${item.format.toUpperCase()} • ${new Date(item.when).toLocaleString()} • خطة: ${PLANS[item.plan].label}</div>
      </div>
      <div class="actions">
        <a href="${item.dataUrl}" download="${item.filename}" class="btn">تحميل</a>
      </div>
    `;
    container.appendChild(el);
  });
}
renderHistory();

/* ================= Logo upload ================= */
inputLogo.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) {
    uploadedLogoDataUrl = null;
    logoImage = null;
    schedulePreview();
    return;
  }
  const reader = new FileReader();
  reader.onload = function(ev) {
    uploadedLogoDataUrl = ev.target.result;
    const img = new Image();
    img.onload = () => {
      logoImage = img;
      schedulePreview();
    };
    img.onerror = () => {
      uploadedLogoDataUrl = null;
      logoImage = null;
      showMessage("فشل في تحميل الشعار — جرب صورة أخرى.", true);
    };
    img.src = uploadedLogoDataUrl;
  };
  reader.readAsDataURL(file);
});

/* ================ Live preview (debounce) ================ */
let debounceTimer = null;
function schedulePreview() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderPreview, 200);
}
[inputData, inputQrColor, inputBgColor, inputLogoSize].forEach(el => el.addEventListener("input", schedulePreview));
btnGenerate.addEventListener("click", renderPreview);
btnClear.addEventListener("click", () => {
  inputData.value = "";
  inputLogo.value = "";
  uploadedLogoDataUrl = null;
  logoImage = null;
  inputQrColor.value = "#000000";
  inputBgColor.value = "#ffffff";
  inputLogoSize.value = 20;
  renderPreview();
  showMessage("تم المسح.", false);
});

/* ================ Core: create QR data URL ================ */
function createQrDataUrl(text, size, colorDark, colorLight) {
  return new Promise((resolve, reject) => {
    const tmp = document.createElement("div");
    try {
      new QRCode(tmp, {
        text: text || " ",
        width: size,
        height: size,
        colorDark: colorDark,
        colorLight: colorLight,
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (err) {
      return reject(err);
    }
    setTimeout(() => {
      const img = tmp.querySelector("img");
      const canv = tmp.querySelector("canvas");
      if (img && img.src) return resolve(img.src);
      if (canv) return resolve(canv.toDataURL("image/png"));
      // poll fallback
      let tries = 0;
      const interval = setInterval(() => {
        tries++;
        const img2 = tmp.querySelector("img");
        const canv2 = tmp.querySelector("canvas");
        if (img2 && img2.src) { clearInterval(interval); return resolve(img2.src); }
        if (canv2) { clearInterval(interval); return resolve(canv2.toDataURL("image/png")); }
        if (tries > 12) { clearInterval(interval); return reject(new Error("تعذر توليد QR")); }
      }, 80);
    }, 40);
  });
}

/* ================= Render preview (canvas) ================= */
async function renderPreview() {
  clearMessage();
  const text = inputData.value.trim();
  if (!text) {
    previewBox.innerHTML = `<div class="empty-note">اكتب رابط أو نص للمعاينة المباشرة</div>`;
    disableDownloads();
    return;
  }

  try {
    const size = 1024; // high-res render for quality
    const qrColor = inputQrColor.value || "#000000";
    const bgColor = inputBgColor.value || "#ffffff";
    const logoPct = parseInt(inputLogoSize.value || "20", 10) / 100;

    const qrDataUrl = await createQrDataUrl(text, size, qrColor, bgColor);
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await imageLoaded(qrImg);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw QR
    ctx.drawImage(qrImg, 0, 0, canvas.width, canvas.height);

    // draw logo if exists
    if (logoImage) {
      const logoSize = Math.floor(canvas.width * logoPct);
      const x = (canvas.width - logoSize) / 2;
      const y = (canvas.height - logoSize) / 2;

      // optional white box behind logo for contrast
      ctx.fillStyle = "#ffffff";
      const pad = Math.max(6, Math.floor(logoSize * 0.06));
      roundRect(ctx, x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, 12);
      ctx.fill();

      ctx.drawImage(logoImage, x, y, logoSize, logoSize);
    }

    // store current canvas and show scaled preview
    currentCanvas = canvas;
    previewBox.innerHTML = "";
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = 320;
    previewCanvas.height = 320;
    const pCtx = previewCanvas.getContext("2d");
    pCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    previewBox.appendChild(previewCanvas);

    enableDownloads();
    refreshQuotaUI();
  } catch (err) {
    console.error(err);
    previewBox.innerHTML = `<div class="empty-note">خطأ أثناء التوليد — جرّب نصًا أبسط أو صورة أصغر.</div>`;
    disableDownloads();
    showMessage("حدث خطأ في المعاينة.", true);
  }
}

/* ================= Utilities ================= */
function imageLoaded(img) {
  return new Promise((res, rej) => {
    if (img.complete && img.naturalWidth !== 0) return res();
    img.onload = () => res();
    img.onerror = () => rej(new Error("Image load error"));
  });
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function slugify(s) {
  return String(s).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "").toLowerCase().slice(0,40);
}
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

/* ================= Download handlers (PNG / SVG / PDF) ================= */
function disableDownloads() {
  [downloadPNG, downloadSVG, downloadPDF].forEach(el => el.classList.add("disabled"));
  [downloadPNG, downloadSVG].forEach(el => el.removeAttribute("href"));
}
function enableDownloads() {
  [downloadPNG, downloadSVG, downloadPDF].forEach(el => el.classList.remove("disabled"));
}

/* check quota and update UI */
function refreshQuotaUI() {
  updatePlanUI();
  const rem = remainingFor(appQuota);
  remainingCount.textContent = rem;
  if (PLANS[appQuota.plan].limit !== Infinity && (appQuota.used || 0) >= PLANS[appQuota.plan].limit) {
    [downloadPNG, downloadSVG, downloadPDF].forEach(el => el.classList.add("disabled"));
    showMessage("نفدت تنزيلات باقتك لهذا الشهر. اختر باقة أعلى.", true);
  }
}

/* PNG download */
downloadPNG.addEventListener("click", (ev) => {
  if (downloadPNG.classList.contains("disabled") || !currentCanvas) { ev.preventDefault(); return; }
  // quota check
  if (!canDownload()) { ev.preventDefault(); return; }

  const dataUrl = currentCanvas.toDataURL("image/png");
  const filename = `qr-${slugify(inputData.value || 'qr')}.png`;
  triggerDownload(dataUrl, filename);

  onDownloaded('png', dataUrl, filename);
});

/* SVG download (embed PNG as image inside svg) */
downloadSVG.addEventListener("click", async (ev) => {
  if (downloadSVG.classList.contains("disabled") || !currentCanvas) { ev.preventDefault(); return; }
  if (!canDownload()) { ev.preventDefault(); return; }

  // create PNG data
  const pngData = currentCanvas.toDataURL("image/png");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${currentCanvas.width}" height="${currentCanvas.height}" viewBox="0 0 ${currentCanvas.width} ${currentCanvas.height}">
    <image href="${pngData}" width="${currentCanvas.width}" height="${currentCanvas.height}" />
  </svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const filename = `qr-${slugify(inputData.value || 'qr')}.svg`;
  triggerDownload(url, filename);
  // Revoke after short time
  setTimeout(()=>URL.revokeObjectURL(url), 2000);

  // For history store dataUrl as pngData (because svg contains png)
  onDownloaded('svg', pngData, filename);
});

/* PDF download */
downloadPDF.addEventListener("click", (ev) => {
  if (downloadPDF.classList.contains("disabled") || !currentCanvas) { ev.preventDefault(); return; }
  if (!canDownload()) { ev.preventDefault(); return; }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 36;
  const maxW = pageW - margin * 2;
  const ratio = currentCanvas.height / currentCanvas.width;
  const drawW = maxW;
  const drawH = drawW * ratio;

  const dataUrl = currentCanvas.toDataURL("image/png");
  pdf.addImage(dataUrl, "PNG", margin, margin, drawW, drawH);
  const filename = `qr-${slugify(inputData.value || 'qr')}.pdf`;
  pdf.save(filename);

  onDownloaded('pdf', dataUrl, filename);
});

/* helper: trigger download via link */
function triggerDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* after a download - update quota + history */
function onDownloaded(format, dataUrl, filename) {
  // increment quota
  appQuota.used = (appQuota.used || 0) + 1;
  appQuota.month = getMonthKey();
  saveQuota(appQuota);
  refreshQuotaUI();

  // add history entry
  const entry = {
    text: inputData.value || "",
    when: new Date().toISOString(),
    format,
    filename,
    plan: appQuota.plan,
    dataUrl
  };
  addHistory(entry);
  showMessage("تم التحميل وتحديث رصيد الباقة.", false);
}

/* check if allowed to download */
function canDownload() {
  const limit = PLANS[appQuota.plan].limit;
  if (limit === Infinity) return true;
  if ((appQuota.used || 0) >= limit) {
    showMessage("انتهى رصيد باقتك لهذا الشهر. اختر باقة أعلى.", true);
    return false;
  }
  return true;
}

/* ================ Misc UI & events ================ */
/* Dashboard nav */
navGenerator.addEventListener("click", () => {
  showView("generator");
});
navDashboard.addEventListener("click", () => {
  showView("dashboard");
  renderHistory();
});

function showView(key) {
  if (key === "generator") {
    viewGenerator.classList.add("active");
    viewDashboard.classList.remove("active");
    navGenerator.classList.add("active");
    navDashboard.classList.remove("active");
  } else {
    viewDashboard.classList.add("active");
    viewGenerator.classList.remove("active");
    navDashboard.classList.add("active");
    navGenerator.classList.remove("active");
  }
}

/* clear history & export CSV */
document.getElementById("clearHistory").addEventListener("click", () => {
  if (!confirm("هل أنت متأكد أنك تريد مسح سجل التحميلات؟")) return;
  saveHistory([]);
  renderHistory();
  showMessage("تم مسح السجل.", false);
});
document.getElementById("exportHistory").addEventListener("click", () => {
  const arr = loadHistory();
  if (!arr.length) { showMessage("لا توجد سجلات للتصدير.", true); return; }
  const csvRows = [["text","format","filename","plan","when"]];
  arr.forEach(r => csvRows.push([`"${r.text.replace(/"/g,'""')}"`, r.format, r.filename, r.plan, r.when]));
  const csv = csvRows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, "qr-history.csv");
  setTimeout(()=>URL.revokeObjectURL(url),2000);
});

/* render history list (used earlier) is defined above */

/* ================= init & helpers ================= */
function updatePlanUI() {
  currentPlanLabel.textContent = PLANS[appQuota.plan].label;
  remainingCount.textContent = remainingFor(appQuota);
}
updatePlanUI();

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? "#b91c1c" : "#0b6b5a";
  setTimeout(()=>{ messageEl.textContent = ""; }, 4500);
}

/* Escape HTML helper already defined above as escapeHtml */

/* initial preview state */
(function init(){
  // listeners for live preview
  inputData.addEventListener("input", schedulePreview);
  inputQrColor.addEventListener("input", schedulePreview);
  inputBgColor.addEventListener("input", schedulePreview);
  inputLogoSize.addEventListener("input", schedulePreview);

  // init view
  showView("generator");
  renderPreview(); // will show empty note
})();
