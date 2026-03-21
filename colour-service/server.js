/**
 * Spotify Enhanced — Colour Extraction Service
 *
 * Uses node-vibrant with the exact same customGenerator algorithm
 * as the HA frontend (src/common/image/extract_color.ts).
 *
 * Exposes:
 *   GET /extract?url=<image_url>
 *   → { background: "#rrggbb", foreground: "#rrggbb" }
 *
 * Run: node server.js
 * Default port: 5174 (configurable via PORT env var)
 */

"use strict";

const express  = require("express");
const Vibrant  = require("node-vibrant");

const PORT = parseInt(process.env.PORT || "5174", 10);
const app  = express();

// ── WCAG luminance & contrast (mirrors HA's src/common/color/rgb.ts) ──────────

function wcagLuminance(r, g, b) {
  // r, g, b are 0-1
  const lin = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function wcagContrast(rgb1, rgb2) {
  const l1 = wcagLuminance(rgb1[0]/255, rgb1[1]/255, rgb1[2]/255);
  const l2 = wcagLuminance(rgb2[0]/255, rgb2[1]/255, rgb2[2]/255);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function getRGBContrastRatio(rgb1, rgb2) {
  return Math.round((wcagContrast(rgb1, rgb2) + Number.EPSILON) * 100) / 100;
}

// ── YIQ (for fallback white/black decision) ───────────────────────────────────

function getYiq(rgb) {
  return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
}

// ── customGenerator — exact copy of HA's algorithm ───────────────────────────

const CONTRAST_RATIO            = 4.5;
const COLOR_SIMILARITY_THRESHOLD = 150;

function customGenerator(swatches) {
  // swatches is an object {Vibrant, Muted, ...}, convert to array
  const colors = Object.values(swatches).filter(Boolean);

  // Sort by population descending (same as HA)
  colors.sort((a, b) => b.population - a.population);

  const backgroundColor = colors[0];
  let foregroundColor;

  const contrastRatios = new Map();
  const approvedContrastRatio = (hex, rgb) => {
    if (!contrastRatios.has(hex)) {
      contrastRatios.set(hex, getRGBContrastRatio(backgroundColor.rgb, rgb));
    }
    return contrastRatios.get(hex) > CONTRAST_RATIO;
  };

  for (let i = 1; i < colors.length && foregroundColor === undefined; i++) {
    if (approvedContrastRatio(colors[i].hex, colors[i].rgb)) {
      foregroundColor = colors[i].rgb;
      break;
    }
    const currentColor = colors[i];
    for (let j = i + 1; j < colors.length; j++) {
      const compareColor = colors[j];
      const diffScore =
        Math.abs(currentColor.rgb[0] - compareColor.rgb[0]) +
        Math.abs(currentColor.rgb[1] - compareColor.rgb[1]) +
        Math.abs(currentColor.rgb[2] - compareColor.rgb[2]);
      if (diffScore > COLOR_SIMILARITY_THRESHOLD) continue;
      if (approvedContrastRatio(compareColor.hex, compareColor.rgb)) {
        foregroundColor = compareColor.rgb;
        break;
      }
    }
  }

  // Fallback: YIQ < 200 → white, else black (same as HA)
  if (foregroundColor === undefined) {
    foregroundColor = getYiq(backgroundColor.rgb) < 200
      ? [255, 255, 255]
      : [0, 0, 0];
  }

  return {
    background: backgroundColor,
    foreground: { rgb: foregroundColor, hex: rgbToHex(foregroundColor) },
  };
}

function rgbToHex(rgb) {
  return "#" + rgb.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
}

// ── HTTP endpoint ─────────────────────────────────────────────────────────────

app.get("/health", (req, res) => res.json({ ok: true, version: "1.0.0" }));

app.get("/extract", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing url parameter" });

  try {
    // node-vibrant v3: Vibrant.from(url).getPalette()
    const palette = await Vibrant.from(url)
      .maxColorCount(16)
      .getPalette();

    const { background, foreground } = customGenerator(palette);

    res.json({
      background: background.hex,
      foreground: foreground.hex,
    });
  } catch (err) {
    console.error("Colour extraction error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Spotify Enhanced colour service running on http://127.0.0.1:${PORT}`);
  console.log("Using node-vibrant with HA-identical customGenerator algorithm");
});
