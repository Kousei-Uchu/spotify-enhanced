"use strict";

const express = require("express");
const Vibrant = require("node-vibrant");
const https   = require("https");
const http    = require("http");

const PORT = parseInt(process.env.PORT || "5174", 10);
const app  = express();

// ── WCAG contrast (same math as culori wcagLuminance/wcagContrast) ────────────

function linearise(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(r, g, b) {
  return 0.2126 * linearise(r/255) + 0.7152 * linearise(g/255) + 0.0722 * linearise(b/255);
}
function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(...rgb1), l2 = luminance(...rgb2);
  return (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
}
function getRGBContrastRatio(rgb1, rgb2) {
  return Math.round((contrastRatio(rgb1, rgb2) + Number.EPSILON) * 100) / 100;
}

// ── Fetch image as buffer ─────────────────────────────────────────────────────

function fetchBuffer(url, redirects) {
  redirects = redirects || 0;
  if (redirects > 5) return Promise.reject(new Error("Too many redirects"));
  return new Promise((resolve, reject) => {
    const get = url.startsWith("https") ? https.get : http.get;
    get(url, { headers: { "User-Agent": "SpotifyEnhancedHA/1.1.6" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchBuffer(res.headers.location, redirects + 1));
        return;
      }
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end",  () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// ── customGenerator — exact HA algorithm ─────────────────────────────────────

const CONTRAST_RATIO            = 4.5;
const COLOR_SIMILARITY_THRESHOLD = 150;

function customGenerator(palette) {
  // palette is object {Vibrant, Muted, DarkVibrant, ...} — convert to array
  const swatches = Object.values(palette).filter(Boolean);
  swatches.sort((a, b) => b.population - a.population);

  const bg = swatches[0];
  let fg;

  const cache = new Map();
  const ok = (hex, rgb) => {
    if (!cache.has(hex)) cache.set(hex, getRGBContrastRatio(bg.rgb, rgb));
    return cache.get(hex) > CONTRAST_RATIO;
  };

  for (let i = 1; i < swatches.length && !fg; i++) {
    if (ok(swatches[i].hex, swatches[i].rgb)) { fg = swatches[i].rgb; break; }
    const cur = swatches[i];
    for (let j = i + 1; j < swatches.length; j++) {
      const cmp = swatches[j];
      const d = Math.abs(cur.rgb[0]-cmp.rgb[0])
              + Math.abs(cur.rgb[1]-cmp.rgb[1])
              + Math.abs(cur.rgb[2]-cmp.rgb[2]);
      if (d > COLOR_SIMILARITY_THRESHOLD) continue;
      if (ok(cmp.hex, cmp.rgb)) { fg = cmp.rgb; break; }
    }
  }

  // Fallback: YIQ < 200 → white, else black
  if (!fg) fg = bg.getYiq() < 200 ? [255,255,255] : [0,0,0];

  const toHex = rgb => "#" + rgb.map(v => Math.round(v).toString(16).padStart(2,"0")).join("");

  return {
    background: bg.hex,
    foreground: Array.isArray(fg) ? toHex(fg) : fg.hex,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ ok: true, version: "1.0.0" }));

app.get("/extract", async (req, res) => {
  const url = req.query.url;
  if (!url) { res.status(400).json({ error: "Missing url" }); return; }
  try {
    const buf     = await fetchBuffer(url);
    const palette = await Vibrant.from(buf).maxColorCount(16).getPalette();
    res.json(customGenerator(palette));
  } catch (err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Spotify Enhanced colour service → http://127.0.0.1:${PORT}`);
});
