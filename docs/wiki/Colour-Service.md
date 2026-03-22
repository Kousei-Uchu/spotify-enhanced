# Colour Service

The colour service is a small Node.js HTTP server that extracts dominant colours from album art images. It uses the exact same algorithm as the HA frontend (`node-vibrant` + WCAG contrast via `culori`).

## Why server-side?

The HA frontend uses `node-vibrant` which isn't available in plain browser JavaScript. Running it server-side means:
- Colours match HA's built-in media card exactly
- Results are stored as HA sensor states
- All Lovelace cards read from those sensors — no per-card image processing

## Setup

```bash
cd colour-service
npm install
npm run build   # TypeScript → dist/
npm start       # runs on http://127.0.0.1:5174
```

## API

```
GET /extract?url=<album_art_url>
→ { "background": "#1a2b3c", "foreground": "#ffffff" }

GET /health
→ { "ok": true, "version": "1.0.0" }
```

## Algorithm

1. Fetch the image as a buffer (follows redirects, including HA proxy URLs)
2. Pass buffer to `node-vibrant` with `colorCount: 16`
3. Run `customGenerator` on the resulting palette swatches:
   - Sort swatches by population (most common = background)
   - Find a foreground colour with WCAG contrast ratio > 4.5 vs background
   - Search similar colours (RGB diff < 150) if no direct match
   - Fall back to white/black based on YIQ luminance
4. Return hex strings for both colours

## Sensors updated

- `sensor.spotify_enhanced_background_color`
- `sensor.spotify_enhanced_foreground_color`

The coordinator calls the service whenever the album art URL changes.

## Configuration

The service URL is configurable in the integration options:
**Settings → Devices & Services → Spotify Enhanced → Configure → Colour Service URL**

Default: `http://127.0.0.1:5174`
