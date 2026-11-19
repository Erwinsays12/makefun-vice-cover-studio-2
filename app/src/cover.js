// Vice Cover Studio — cover renderer (canvas 2D, deterministic, offline).
// A cover is a set of photo panels over the top 84% of the frame plus a
// caption band over the bottom 16%. Everything here draws from the state
// object only, so the same state always renders the same pixels.

export const SIZES = {
  square: { label: "Square 1080 x 1080", width: 1080, height: 1080 },
  portrait: { label: "Portrait 1080 x 1350", width: 1080, height: 1350 },
  wide: { label: "Wide 1920 x 1080", width: 1920, height: 1080 },
};

// Panel rects are fractions of the cover; the caption band owns y 0.84..1.
export const LAYOUTS = {
  "vice-grid": {
    label: "Vice grid",
    panels: [
      { x: 0.0, y: 0.0, w: 0.6, h: 0.56 },
      { x: 0.6, y: 0.0, w: 0.4, h: 0.28 },
      { x: 0.6, y: 0.28, w: 0.4, h: 0.28 },
      { x: 0.0, y: 0.56, w: 0.3, h: 0.28 },
      { x: 0.3, y: 0.56, w: 0.7, h: 0.28 },
    ],
  },
  "sunset-trio": {
    label: "Sunset trio",
    panels: [
      { x: 0.0, y: 0.0, w: 0.34, h: 0.84 },
      { x: 0.34, y: 0.0, w: 0.33, h: 0.84 },
      { x: 0.67, y: 0.0, w: 0.33, h: 0.84 },
    ],
  },
  "hero-duo": {
    label: "Hero duo",
    panels: [
      { x: 0.0, y: 0.0, w: 0.62, h: 0.84 },
      { x: 0.62, y: 0.0, w: 0.38, h: 0.84 },
    ],
  },
  quad: {
    label: "Quad",
    panels: [
      { x: 0.0, y: 0.0, w: 0.5, h: 0.42 },
      { x: 0.5, y: 0.0, w: 0.5, h: 0.42 },
      { x: 0.0, y: 0.42, w: 0.5, h: 0.42 },
      { x: 0.5, y: 0.42, w: 0.5, h: 0.42 },
    ],
  },
  solo: {
    label: "Solo",
    panels: [{ x: 0.0, y: 0.0, w: 1.0, h: 0.84 }],
  },
};

export const GRADES = {
  sunset: {
    label: "Sunset",
    top: "rgba(255, 122, 26, 0.20)",
    bottom: "rgba(255, 42, 109, 0.20)",
    tint: "rgba(255, 140, 60, 0.10)",
  },
  neon: {
    label: "Neon",
    top: "rgba(255, 0, 170, 0.18)",
    bottom: "rgba(0, 214, 255, 0.18)",
    tint: "rgba(190, 0, 255, 0.10)",
  },
  vice: {
    label: "Vice",
    top: "rgba(124, 58, 237, 0.20)",
    bottom: "rgba(255, 94, 45, 0.14)",
    tint: "rgba(140, 60, 220, 0.10)",
  },
};

export const CAPTION_STYLES = {
  sunset: {
    label: "Sunset",
    stops: ["#ff7a1a", "#ff2a6d", "#b3127a"],
    ink: "#fff7ed",
    kicker: "#ffd9a0",
  },
  neon: {
    label: "Neon",
    stops: ["#ff00aa", "#7b2fff", "#00d6ff"],
    ink: "#f2feff",
    kicker: "#9ff3ff",
  },
  vice: {
    label: "Vice",
    stops: ["#7c3aed", "#ff2a6d", "#ff5e2d"],
    ink: "#fff5f0",
    kicker: "#ffc4d6",
  },
};

export const CAPTION_BAND_TOP = 0.84;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A fixed-seed grain tile, so every render of the same state is identical.
function makeGrainTile() {
  const tile = document.createElement("canvas");
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext("2d");
  const random = mulberry32(20261119);
  const image = tctx.createImageData(140, 140);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.floor(random() * 255);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = Math.floor(random() * 46);
  }
  tctx.putImageData(image, 0, 0);
  return tile;
}

let grainTile = null;

function panelRectInPixels(panel, width, height) {
  const gap = Math.max(2, Math.round(width * 0.004));
  return {
    x: Math.round(panel.x * width) + gap,
    y: Math.round(panel.y * height) + gap,
    w: Math.round(panel.w * width) - gap * 2,
    h: Math.round(panel.h * (height * CAPTION_BAND_TOP)) - gap * 2,
  };
}

function drawPhotoIntoPanel(ctx, rect, photo, zoom, offsetX, offsetY) {
  const scale =
    Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) *
    zoom;
  const dw = photo.naturalWidth * scale;
  const dh = photo.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + offsetX * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + offsetY * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

function drawEmptyPanel(ctx, rect, index) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const gradient = ctx.createLinearGradient(
    rect.x,
    rect.y,
    rect.x + rect.w,
    rect.y + rect.h,
  );
  gradient.addColorStop(0, "#241a33");
  gradient.addColorStop(1, "#120e1c");
  ctx.fillStyle = gradient;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = Math.max(1, rect.w * 0.004);
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(rect.x + 8, rect.y + 8, rect.w - 16, rect.h - 16);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = `600 ${Math.max(13, Math.round(rect.w * 0.045))}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`PANEL ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}

function applyGrade(ctx, rect, grade) {
  const gradient = ctx.createLinearGradient(
    rect.x,
    rect.y,
    rect.x,
    rect.y + rect.h,
  );
  gradient.addColorStop(0, grade.top);
  gradient.addColorStop(1, grade.bottom);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = "source-over";
  const vignette = ctx.createRadialGradient(
    rect.x + rect.w / 2,
    rect.y + rect.h / 2,
    Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2,
    rect.y + rect.h / 2,
    Math.max(rect.w, rect.h) * 0.75,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.30)");
  ctx.fillStyle = vignette;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawPanelFrame(ctx, rect, width) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = Math.max(2, Math.round(width * 0.002));
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function fitCaptionFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, "Arial Narrow", sans-serif`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size = Math.floor(size * 0.92);
    ctx.font = `${size}px Anton, "Arial Narrow", sans-serif`;
  }
  return size;
}

function drawCaptionBand(ctx, width, height, state) {
  const style = CAPTION_STYLES[state.captionStyle] ?? CAPTION_STYLES.sunset;
  const bandY = height * CAPTION_BAND_TOP;
  const bandH = height - bandY;
  const gradient = ctx.createLinearGradient(0, bandY, width, bandY + bandH);
  style.stops.forEach((color, i) => {
    gradient.addColorStop(i / (style.stops.length - 1), color);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, bandY, width, bandH);

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillRect(0, bandY, width, Math.max(2, Math.round(height * 0.003)));

  if (state.halftone) {
    const spacing = Math.max(7, Math.round(width * 0.007));
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.20)";
    for (let y = bandY + spacing; y < height - spacing / 2; y += spacing) {
      const row = Math.floor((y - bandY) / spacing);
      for (let x = spacing / 2 + (row % 2 ? spacing / 2 : 0); x < width; x += spacing) {
        const depth = (y - bandY) / bandH;
        const r = Math.max(0.6, spacing * 0.16 * (0.5 + depth));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  const caption = (state.caption || "").trim().toUpperCase() || "NEON NIGHTS";
  const kicker = "VICE COVER STUDIO";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const kickerSize = Math.max(11, Math.round(bandH * 0.16));
  ctx.font = `600 ${kickerSize}px system-ui, sans-serif`;
  try {
    ctx.letterSpacing = `${Math.max(2, Math.round(width * 0.004))}px`;
  } catch {
    // Older canvas implementations ignore letterSpacing.
  }
  ctx.fillStyle = style.kicker;
  ctx.fillText(kicker, width / 2, bandY + bandH * 0.26);
  try {
    ctx.letterSpacing = "0px";
  } catch {
    // Ignore.
  }
  const captionSize = fitCaptionFont(
    ctx,
    caption,
    width * 0.92,
    Math.floor(bandH * 0.58),
  );
  ctx.font = `${captionSize}px Anton, "Arial Narrow", sans-serif`;
  ctx.fillStyle = style.ink;
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = Math.max(2, Math.round(width * 0.004));
  ctx.shadowOffsetY = Math.max(1, Math.round(height * 0.002));
  ctx.fillText(caption, width / 2, bandY + bandH * 0.88);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function applyGrain(ctx, width, height) {
  if (!grainTile) grainTile = makeGrainTile();
  const pattern = ctx.createPattern(grainTile, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// Draws the whole cover for `state` onto `ctx` at `width` x `height`.
// `state.panels` must hold one entry per panel of `state.layout`.
export function renderCover(ctx, width, height, state) {
  const layout = LAYOUTS[state.layout] ?? LAYOUTS["vice-grid"];
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0d0b14";
  ctx.fillRect(0, 0, width, height);
  layout.panels.forEach((panel, index) => {
    const rect = panelRectInPixels(panel, width, height);
    const slot = state.panels[index] ?? { img: null, zoom: 1, ox: 0, oy: 0 };
    if (slot.img) {
      drawPhotoIntoPanel(ctx, rect, slot.img, slot.zoom, slot.ox, slot.oy);
    } else {
      drawEmptyPanel(ctx, rect, index);
    }
    applyGrade(ctx, rect, grade);
    drawPanelFrame(ctx, rect, width);
  });
  drawCaptionBand(ctx, width, height, state);
  if (state.grain) applyGrain(ctx, width, height);
}

// Renders the cover at a post size and returns the PNG as a Blob.
export function exportCoverPng(state, sizeName) {
  const size = SIZES[sizeName] ?? SIZES.wide;
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  renderCover(canvas.getContext("2d"), size.width, size.height, state);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("export failed"))),
      "image/png",
    );
  });
}

export function blankPanels(layoutName) {
  const layout = LAYOUTS[layoutName] ?? LAYOUTS["vice-grid"];
  return layout.panels.map(() => ({ img: null, zoom: 1, ox: 0, oy: 0 }));
}
