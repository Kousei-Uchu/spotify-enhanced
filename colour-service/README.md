# Spotify Enhanced — Colour Extraction Service

A TypeScript Node.js service that extracts album art colours using the **exact same
algorithm as the HA frontend** — `culori` for WCAG contrast, `node-vibrant` for
palette extraction, and the same `customGenerator` function from HA's source.

## Files

```
colour-service/
├── src/
│   ├── rgb.ts           ← exact copy of HA's src/common/color/rgb.ts
│   ├── extract_color.ts ← exact copy of HA's src/common/image/extract_color.ts
│   └── server.ts        ← Express HTTP server
├── package.json
├── tsconfig.json
└── spotify-colour.service  ← systemd unit
```

## Setup

```bash
cd colour-service
npm install
npm run build       # compiles TypeScript → dist/
npm start           # runs on http://127.0.0.1:5174
```

### Run as background service (systemd)

```bash
sudo cp spotify-colour.service /etc/systemd/system/
sudo sed -i "s|/path/to/colour-service|$(pwd)|" /etc/systemd/system/spotify-colour.service
sudo systemctl daemon-reload
sudo systemctl enable spotify-colour
sudo systemctl start spotify-colour
```

### Docker Compose

```yaml
spotify-colour:
  image: node:20-alpine
  working_dir: /app
  volumes:
    - ./colour-service:/app
  command: sh -c "npm install && npm run build && npm start"
  restart: unless-stopped
  network_mode: host
  environment:
    - PORT=5174
```

## API

```
GET http://127.0.0.1:5174/extract?url=<album_art_url>
→ { "background": "#1a2b3c", "foreground": "#ffffff" }

GET http://127.0.0.1:5174/health
→ { "ok": true, "version": "1.0.0" }
```

## Sensors created

- `sensor.spotify_enhanced_background_color` — hex background colour
- `sensor.spotify_enhanced_foreground_color` — hex foreground colour
