(() => {
  "use strict";

  const CHARSETS = {
    standard: " .:-=+*#%@",
    detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    blocks: " ░▒▓█",
    binary: " 01",
    dots: " ·∶∷⁘⁙",
    "ascii-art": " .,:;i1tfLCG08@",
  };

  const fileInput = document.getElementById("fileInput");
  const dropzone = document.getElementById("dropzone");
  const widthRange = document.getElementById("widthRange");
  const widthValue = document.getElementById("widthValue");
  const charsetSelect = document.getElementById("charsetSelect");
  const customCharsetWrap = document.getElementById("customCharsetWrap");
  const customCharset = document.getElementById("customCharset");
  const contrastRange = document.getElementById("contrastRange");
  const contrastValue = document.getElementById("contrastValue");
  const brightnessRange = document.getElementById("brightnessRange");
  const brightnessValue = document.getElementById("brightnessValue");
  const invertToggle = document.getElementById("invertToggle");
  const colorToggle = document.getElementById("colorToggle");
  const copyBtn = document.getElementById("copyBtn");
  const downloadTxtBtn = document.getElementById("downloadTxtBtn");
  const downloadPngBtn = document.getElementById("downloadPngBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const asciiOutput = document.getElementById("asciiOutput");
  const dimInfo = document.getElementById("dimInfo");
  const canvas = document.getElementById("hiddenCanvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const themeToggle = document.getElementById("themeToggle");
  const toast = document.getElementById("toast");
  const repoLink = document.getElementById("repoLink");
  const yearEl = document.getElementById("year");

  let currentImage = null;
  let asciiText = "";
  let asciiColorRows = null;

  const CHAR_ASPECT = 0.5;

  yearEl.textContent = new Date().getFullYear();

  const storedTheme = localStorage.getItem("theme");
  if (storedTheme) document.body.dataset.theme = storedTheme;
  themeToggle.addEventListener("click", () => {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = next;
    localStorage.setItem("theme", next);
  });

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function getCharset() {
    const key = charsetSelect.value;
    if (key === "custom") {
      const c = customCharset.value || " .:-=+*#%@";
      return c;
    }
    return CHARSETS[key] || CHARSETS.standard;
  }

  function loadImageFromFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        currentImage = img;
        render();
      };
      img.onerror = () => showToast("Could not load image.");
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function render() {
    if (!currentImage) return;

    const targetCols = parseInt(widthRange.value, 10);
    const srcRatio = currentImage.height / currentImage.width;
    const targetRows = Math.max(1, Math.round(targetCols * srcRatio * CHAR_ASPECT));

    canvas.width = targetCols;
    canvas.height = targetRows;
    ctx.clearRect(0, 0, targetCols, targetRows);
    ctx.drawImage(currentImage, 0, 0, targetCols, targetRows);

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, targetCols, targetRows);
    } catch (err) {
      asciiOutput.textContent = "Could not process image (possibly a CORS issue).";
      return;
    }
    const data = imageData.data;
    const charset = getCharset();
    const charsetLen = charset.length;
    const contrast = parseFloat(contrastRange.value);
    const brightness = parseInt(brightnessRange.value, 10);
    const invert = invertToggle.checked;
    const useColor = colorToggle.checked;

    const lines = [];
    const colorRows = useColor ? [] : null;

    for (let y = 0; y < targetRows; y++) {
      let line = "";
      const colorRow = useColor ? [] : null;
      for (let x = 0; x < targetCols; x++) {
        const i = (y * targetCols + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        let gray = (0.299 * r + 0.587 * g + 0.114 * b);
        gray = (gray - 128) * contrast + 128 + brightness;
        gray = Math.max(0, Math.min(255, gray));

        let norm = gray / 255;
        if (invert) norm = 1 - norm;
        if (a < 16) {
          line += " ";
          if (colorRow) colorRow.push(null);
          continue;
        }
        const idx = Math.min(charsetLen - 1, Math.floor(norm * charsetLen));
        line += charset[idx];
        if (colorRow) colorRow.push([r, g, b]);
      }
      lines.push(line);
      if (colorRow) colorRows.push(colorRow);
    }

    asciiText = lines.join("\n");
    asciiColorRows = colorRows;
    paintOutput();
    dimInfo.textContent = `${targetCols} × ${targetRows} chars`;
  }

  function paintOutput() {
    asciiOutput.classList.remove("is-empty");

    autoSizeFont();

    if (!colorToggle.checked || !asciiColorRows) {
      asciiOutput.textContent = asciiText;
      return;
    }

    const lines = asciiText.split("\n");
    let html = "";
    for (let y = 0; y < lines.length; y++) {
      const row = asciiColorRows[y];
      const chars = lines[y];
      for (let x = 0; x < chars.length; x++) {
        const ch = chars[x];
        const c = row[x];
        const safe = ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === "&" ? "&amp;" : ch;
        if (c) {
          html += `<span style="color:rgb(${c[0]},${c[1]},${c[2]})">${safe}</span>`;
        } else {
          html += safe;
        }
      }
      html += "\n";
    }
    asciiOutput.innerHTML = html;
  }

  function autoSizeFont() {
    const cols = parseInt(widthRange.value, 10);
    const containerWidth = asciiOutput.clientWidth - 32;
    const approxCharWidth = 0.6;
    let fontSize = containerWidth / (cols * approxCharWidth);
    fontSize = Math.max(4, Math.min(14, fontSize));
    asciiOutput.style.fontSize = fontSize.toFixed(2) + "px";
    asciiOutput.style.lineHeight = "1";
  }

  /* Inputs */
  fileInput.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) loadImageFromFile(f);
  });

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("drag");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadImageFromFile(f);
  });
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  window.addEventListener("paste", (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const it of items) {
      if (it.type && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) {
          loadImageFromFile(f);
          showToast("Pasted image loaded.");
        }
        break;
      }
    }
  });

  widthRange.addEventListener("input", () => {
    widthValue.textContent = widthRange.value;
    if (currentImage) render();
  });
  contrastRange.addEventListener("input", () => {
    contrastValue.textContent = parseFloat(contrastRange.value).toFixed(2);
    if (currentImage) render();
  });
  brightnessRange.addEventListener("input", () => {
    brightnessValue.textContent = brightnessRange.value;
    if (currentImage) render();
  });
  charsetSelect.addEventListener("change", () => {
    customCharsetWrap.hidden = charsetSelect.value !== "custom";
    if (currentImage) render();
  });
  customCharset.addEventListener("input", () => {
    if (charsetSelect.value === "custom" && currentImage) render();
  });
  invertToggle.addEventListener("change", () => currentImage && render());
  colorToggle.addEventListener("change", () => currentImage && render());

  window.addEventListener("resize", () => {
    if (currentImage) autoSizeFont();
  });

  /* Actions */
  copyBtn.addEventListener("click", async () => {
    if (!asciiText) return showToast("Nothing to copy yet.");
    try {
      await navigator.clipboard.writeText(asciiText);
      showToast("Copied to clipboard.");
    } catch {
      showToast("Copy failed.");
    }
  });

  downloadTxtBtn.addEventListener("click", () => {
    if (!asciiText) return showToast("Convert an image first.");
    const blob = new Blob([asciiText], { type: "text/plain;charset=utf-8" });
    triggerDownload(blob, "ascii-art.txt");
  });

  downloadPngBtn.addEventListener("click", () => {
    if (!asciiText) return showToast("Convert an image first.");
    renderToPng();
  });

  function renderToPng() {
    const lines = asciiText.split("\n");
    if (!lines.length) return;
    const fontSize = 14;
    const lineHeight = fontSize;
    const charWidth = fontSize * 0.6;
    const padding = 20;
    const useColor = colorToggle.checked && asciiColorRows;

    const offCanvas = document.createElement("canvas");
    const octx = offCanvas.getContext("2d");
    const cols = lines[0].length;
    offCanvas.width = Math.ceil(cols * charWidth + padding * 2);
    offCanvas.height = Math.ceil(lines.length * lineHeight + padding * 2);

    const bg = getComputedStyle(document.body).getPropertyValue("--bg").trim() || "#0d0f12";
    const fg = getComputedStyle(document.body).getPropertyValue("--text").trim() || "#e6e8eb";
    octx.fillStyle = bg;
    octx.fillRect(0, 0, offCanvas.width, offCanvas.height);
    octx.font = `${fontSize}px JetBrains Mono, ui-monospace, monospace`;
    octx.textBaseline = "top";

    for (let y = 0; y < lines.length; y++) {
      const line = lines[y];
      const row = useColor ? asciiColorRows[y] : null;
      for (let x = 0; x < line.length; x++) {
        const c = row && row[x];
        octx.fillStyle = c ? `rgb(${c[0]},${c[1]},${c[2]})` : fg;
        octx.fillText(line[x], padding + x * charWidth, padding + y * lineHeight);
      }
    }

    offCanvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, "ascii-art.png");
    }, "image/png");
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      asciiOutput.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  /* Samples – generate procedural images then run through pipeline */
  document.querySelectorAll(".sample").forEach((btn) => {
    btn.addEventListener("click", () => loadSample(btn.dataset.sample));
  });

  function loadSample(kind) {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 320;
    const g = c.getContext("2d");
    g.fillStyle = "#000";
    g.fillRect(0, 0, c.width, c.height);

    if (kind === "cat") {
      drawCat(g);
    } else if (kind === "mountain") {
      drawMountain(g);
    } else if (kind === "skull") {
      drawSkull(g);
    } else if (kind === "rocket") {
      drawRocket(g);
    }

    const img = new Image();
    img.onload = () => {
      currentImage = img;
      render();
    };
    img.src = c.toDataURL("image/png");
  }

  function drawCat(g) {
    const grd = g.createRadialGradient(160, 160, 30, 160, 160, 180);
    grd.addColorStop(0, "#fff");
    grd.addColorStop(1, "#222");
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(160, 170, 110, 100, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#000";
    g.beginPath();
    g.moveTo(70, 90); g.lineTo(110, 60); g.lineTo(120, 130); g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(250, 90); g.lineTo(210, 60); g.lineTo(200, 130); g.closePath(); g.fill();
    g.fillStyle = "#fff";
    g.beginPath(); g.arc(130, 160, 14, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(190, 160, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#000";
    g.beginPath(); g.arc(130, 160, 6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(190, 160, 6, 0, Math.PI * 2); g.fill();
  }

  function drawMountain(g) {
    const sky = g.createLinearGradient(0, 0, 0, 200);
    sky.addColorStop(0, "#1e3a8a");
    sky.addColorStop(1, "#fde68a");
    g.fillStyle = sky;
    g.fillRect(0, 0, 320, 200);
    g.fillStyle = "#fbbf24";
    g.beginPath(); g.arc(240, 80, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#0f172a";
    g.beginPath();
    g.moveTo(0, 320); g.lineTo(120, 110); g.lineTo(200, 200); g.lineTo(260, 140); g.lineTo(320, 320);
    g.closePath(); g.fill();
    g.fillStyle = "#fff";
    g.beginPath(); g.moveTo(110, 130); g.lineTo(120, 110); g.lineTo(130, 130); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(250, 155); g.lineTo(260, 140); g.lineTo(270, 155); g.closePath(); g.fill();
  }

  function drawSkull(g) {
    g.fillStyle = "#0a0a0a";
    g.fillRect(0, 0, 320, 320);
    g.fillStyle = "#f5f5f4";
    g.beginPath(); g.ellipse(160, 140, 100, 110, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(110, 220, 100, 60);
    g.fillStyle = "#0a0a0a";
    g.beginPath(); g.ellipse(125, 150, 25, 30, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(195, 150, 25, 30, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(150, 200, 20, 25);
    for (let i = 0; i < 5; i++) g.fillRect(115 + i * 18, 250, 12, 30);
  }

  function drawRocket(g) {
    const sky = g.createLinearGradient(0, 0, 0, 320);
    sky.addColorStop(0, "#020617");
    sky.addColorStop(1, "#1e293b");
    g.fillStyle = sky; g.fillRect(0, 0, 320, 320);
    g.fillStyle = "#fff";
    for (let i = 0; i < 80; i++) {
      g.fillRect(Math.random() * 320, Math.random() * 200, 1, 1);
    }
    g.fillStyle = "#e5e7eb";
    g.beginPath();
    g.moveTo(160, 50); g.lineTo(200, 200); g.lineTo(120, 200); g.closePath(); g.fill();
    g.fillStyle = "#9ca3af";
    g.fillRect(120, 200, 80, 60);
    g.fillStyle = "#ef4444";
    g.beginPath(); g.moveTo(120, 200); g.lineTo(90, 260); g.lineTo(120, 260); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(200, 200); g.lineTo(230, 260); g.lineTo(200, 260); g.closePath(); g.fill();
    g.fillStyle = "#fbbf24";
    g.beginPath(); g.arc(160, 140, 14, 0, Math.PI * 2); g.fill();
    const flame = g.createLinearGradient(0, 260, 0, 320);
    flame.addColorStop(0, "#fbbf24");
    flame.addColorStop(1, "#dc2626");
    g.fillStyle = flame;
    g.beginPath(); g.moveTo(130, 260); g.lineTo(160, 320); g.lineTo(190, 260); g.closePath(); g.fill();
  }

  /* Repo link – populated after deploy if injected; keep placeholder */
  if (repoLink) repoLink.href = "https://github.com/";

  asciiOutput.classList.add("is-empty");
})();
