// Vice Cover Studio — editor wiring: controls, photo loading, live preview,
// export and the ?demo / ?shot / ?selftest modes used for screenshots.
import {
  SIZES,
  LAYOUTS,
  GRADES,
  CAPTION_STYLES,
  CAPTION_BAND_TOP,
  renderCover,
  exportCoverPng,
  blankPanels,
} from "./cover.js";

const params = new URLSearchParams(window.location.search);
const canvas = document.getElementById("coverCanvas");
const ctx = canvas.getContext("2d");

const state = {
  layout: LAYOUTS[params.get("layout")] ? params.get("layout") : "vice-grid",
  size: SIZES[params.get("size")] ? params.get("size") : "wide",
  caption: params.get("caption") || "NEON NIGHTS",
  captionStyle: CAPTION_STYLES[params.get("style")]
    ? params.get("style")
    : "sunset",
  grade: GRADES[params.get("grade")] ? params.get("grade") : "sunset",
  halftone: true,
  grain: true,
  panels: blankPanels(
    LAYOUTS[params.get("layout")] ? params.get("layout") : "vice-grid",
  ),
};

let selectedPanel = 0;
let dragStart = null;

function sizeOfState() {
  return SIZES[state.size] ?? SIZES.wide;
}

function renderPreview() {
  const size = sizeOfState();
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width;
    canvas.height = size.height;
  }
  renderCover(ctx, size.width, size.height, state);
  drawSelectionOutline();
}

function drawSelectionOutline() {
  if (document.body.classList.contains("cover-only")) return;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS["vice-grid"];
  const panel = layout.panels[selectedPanel];
  if (!panel) return;
  const size = sizeOfState();
  const gap = Math.max(2, Math.round(size.width * 0.004));
  const x = Math.round(panel.x * size.width) + gap;
  const y = Math.round(panel.y * size.height) + gap;
  const w = Math.round(panel.w * size.width) - gap * 2;
  const h =
    Math.round(panel.h * (size.height * CAPTION_BAND_TOP)) - gap * 2;
  ctx.save();
  ctx.strokeStyle = "#ff2a6d";
  ctx.lineWidth = Math.max(3, Math.round(size.width * 0.004));
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function panelAtPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  if (fy >= CAPTION_BAND_TOP) return -1;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS["vice-grid"];
  return layout.panels.findIndex(
    (panel) =>
      fx >= panel.x &&
      fx < panel.x + panel.w &&
      fy >= panel.y &&
      fy < panel.y + panel.h * CAPTION_BAND_TOP,
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${src}`));
    img.src = src;
  });
}

function syncPanelControls() {
  const slot = state.panels[selectedPanel] ?? {
    img: null,
    zoom: 1,
    ox: 0,
    oy: 0,
  };
  document.getElementById("panelNumber").textContent = String(
    selectedPanel + 1,
  );
  document.getElementById("zoomRange").value = String(slot.zoom);
  document.getElementById("panXRange").value = String(slot.ox);
  document.getElementById("panYRange").value = String(slot.oy);
}

function buildButtons(containerId, entries, current, onPick) {
  const container = document.getElementById(containerId);
  Object.entries(entries).forEach(([key, value]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = value.label;
    button.dataset.key = key;
    if (key === current) button.classList.add("active");
    button.addEventListener("click", () => {
      container
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      onPick(key);
    });
    container.appendChild(button);
  });
}

function setLayout(layoutName) {
  const oldPanels = state.panels;
  state.layout = layoutName;
  const fresh = blankPanels(layoutName);
  fresh.forEach((slot, i) => {
    if (oldPanels[i]) {
      slot.img = oldPanels[i].img;
      slot.zoom = oldPanels[i].zoom;
      slot.ox = oldPanels[i].ox;
      slot.oy = oldPanels[i].oy;
    }
  });
  state.panels = fresh;
  if (selectedPanel >= fresh.length) selectedPanel = 0;
  syncPanelControls();
  renderPreview();
}

async function loadDemoPhotos() {
  const samples = ["samples/boulevard.jpg", "samples/pier.jpg"];
  for (let i = 0; i < state.panels.length; i++) {
    try {
      state.panels[i].img = await loadImage(samples[i % samples.length]);
    } catch {
      // A missing sample leaves the panel empty; the editor still works.
    }
  }
  // Nudge the hero panel down so the demo portrait's face stays in frame;
  // the wide panels crop hardest, so they get the biggest nudge.
  if (state.panels[0]?.img) {
    state.panels[0].oy =
      state.size === "wide" ? 0.3 : state.size === "square" ? 0.1 : 0.06;
  }
  renderPreview();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function exportCurrentSize() {
  const status = document.getElementById("exportStatus");
  const button = document.getElementById("exportButton");
  button.disabled = true;
  status.textContent = "Rendering PNG…";
  try {
    const blob = await exportCoverPng(state, state.size);
    const size = sizeOfState();
    downloadBlob(blob, `vice-cover-${size.width}x${size.height}.png`);
    status.textContent = `Exported ${size.width} x ${size.height} PNG (${Math.round(blob.size / 1024)} KiB).`;
  } catch (error) {
    status.textContent = `Export failed: ${error.message}`;
  } finally {
    button.disabled = false;
  }
}

async function runSelfTest() {
  const box = document.getElementById("selftest");
  box.hidden = false;
  const lines = [];
  for (const sizeName of Object.keys(SIZES)) {
    try {
      const blob = await exportCoverPng(state, sizeName);
      const size = SIZES[sizeName];
      lines.push(
        `selftest ${sizeName} ${size.width}x${size.height} bytes=${blob.size} ok`,
      );
    } catch (error) {
      lines.push(`selftest ${sizeName} FAILED ${error.message}`);
    }
  }
  box.textContent = lines.join("\n");
  document.title = `selftest ${lines.every((l) => l.endsWith("ok")) ? "ok" : "FAILED"}`;
}

function wireControls() {
  buildButtons("layoutButtons", LAYOUTS, state.layout, setLayout);
  buildButtons("sizeButtons", SIZES, state.size, (key) => {
    state.size = key;
    renderPreview();
  });
  buildButtons(
    "captionStyleButtons",
    CAPTION_STYLES,
    state.captionStyle,
    (key) => {
      state.captionStyle = key;
      renderPreview();
    },
  );
  buildButtons("gradeButtons", GRADES, state.grade, (key) => {
    state.grade = key;
    renderPreview();
  });

  const captionInput = document.getElementById("captionInput");
  captionInput.value = state.caption;
  captionInput.addEventListener("input", () => {
    state.caption = captionInput.value;
    renderPreview();
  });

  document
    .getElementById("photoInput")
    .addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const img = await loadImage(URL.createObjectURL(file));
        state.panels[selectedPanel].img = img;
        renderPreview();
      } catch {
        document.getElementById("exportStatus").textContent =
          "That photo could not be loaded.";
      }
      event.target.value = "";
    });

  document
    .getElementById("sampleButton")
    .addEventListener("click", async () => {
      const samples = ["samples/boulevard.jpg", "samples/pier.jpg"];
      try {
        state.panels[selectedPanel].img = await loadImage(
          samples[selectedPanel % samples.length],
        );
        renderPreview();
      } catch {
        // Leave the panel empty when the sample cannot load.
      }
    });

  document
    .getElementById("fillAllButton")
    .addEventListener("click", async () => {
      let photo = state.panels[selectedPanel].img;
      if (!photo) {
        try {
          photo = await loadImage("samples/boulevard.jpg");
        } catch {
          return;
        }
      }
      state.panels.forEach((slot) => {
        slot.img = photo;
      });
      renderPreview();
    });

  document.getElementById("zoomRange").addEventListener("input", (event) => {
    state.panels[selectedPanel].zoom = Number(event.target.value);
    renderPreview();
  });
  document.getElementById("panXRange").addEventListener("input", (event) => {
    state.panels[selectedPanel].ox = Number(event.target.value);
    renderPreview();
  });
  document.getElementById("panYRange").addEventListener("input", (event) => {
    state.panels[selectedPanel].oy = Number(event.target.value);
    renderPreview();
  });

  document.getElementById("halftoneCheck").addEventListener("change", (e) => {
    state.halftone = e.target.checked;
    renderPreview();
  });
  document.getElementById("grainCheck").addEventListener("change", (e) => {
    state.grain = e.target.checked;
    renderPreview();
  });
  document
    .getElementById("exportButton")
    .addEventListener("click", exportCurrentSize);

  canvas.addEventListener("pointerdown", (event) => {
    const index = panelAtPoint(event.clientX, event.clientY);
    if (index >= 0) {
      selectedPanel = index;
      syncPanelControls();
      renderPreview();
    }
    dragStart = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragStart) return;
    const rect = canvas.getBoundingClientRect();
    const layout = LAYOUTS[state.layout] ?? LAYOUTS["vice-grid"];
    const panel = layout.panels[selectedPanel];
    if (!panel) return;
    const slot = state.panels[selectedPanel];
    slot.ox +=
      ((event.clientX - dragStart.x) / rect.width / panel.w) * 0.5;
    slot.oy +=
      ((event.clientY - dragStart.y) / rect.height / panel.h) * 0.5;
    slot.ox = Math.max(-0.5, Math.min(0.5, slot.ox));
    slot.oy = Math.max(-0.5, Math.min(0.5, slot.oy));
    dragStart = { x: event.clientX, y: event.clientY };
    syncPanelControls();
    renderPreview();
  });
  const endDrag = () => {
    dragStart = null;
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
}

async function main() {
  const shot = params.get("shot");
  if (shot === "cover") {
    document.body.classList.add("cover-only");
    document.title = "Vice Cover Studio — cover";
  }
  wireControls();
  syncPanelControls();
  try {
    await document.fonts.load('40px Anton');
    await document.fonts.ready;
  } catch {
    // Fall back to the system sans-serif when the font cannot load.
  }
  if (params.get("demo") === "1") {
    await loadDemoPhotos();
  }
  renderPreview();
  if (params.get("selftest") === "1") {
    await runSelfTest();
  }
}

main();
