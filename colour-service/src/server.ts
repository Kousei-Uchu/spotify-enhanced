/**
 * src/server.ts
 *
 * Spotify Enhanced — Colour Extraction Service
 *
 * Exposes:
 *   GET /extract?url=<album_art_url>
 *   → { background: "#rrggbb", foreground: "#rrggbb" }
 *
 *   GET /health
 *   → { ok: true, version: "1.0.0" }
 *
 * Build:  npm run build
 * Start:  npm start
 * Dev:    npm run dev
 */
import express from "express";
import { extractColors } from "./extract_color";

const PORT = parseInt(process.env.PORT ?? "5174", 10);
const app  = express();

app.get("/health", (_req, res) => {
  res.json({ ok: true, version: "1.0.0" });
});

app.get("/extract", async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }

  try {
    const { background, foreground } = await extractColors(url);
    res.json({
      background: background.hex,
      foreground: foreground.hex,
    });
  } catch (err: any) {
    console.error("Colour extraction error:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Spotify Enhanced colour service → http://127.0.0.1:${PORT}`);
  console.log("Algorithm: node-vibrant + culori (identical to HA frontend)");
});
