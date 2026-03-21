# Spotify Enhanced — Colour Extraction Service

A small Node.js HTTP service that extracts background and foreground
colours from album art using **node-vibrant** with the exact same
`customGenerator` algorithm used by the HA frontend.

## Why server-side?

- HA's frontend uses `node-vibrant` which isn't available in plain browser JS
- Running it server-side means colours are stored as HA sensor states
- All Lovelace cards read from those sensors — no client-side image processing
- Results are consistent and identical to what HA's own media card shows

## Setup

### On the same machine as Home Assistant (Docker / Pi)

```bash
cd colour-service
npm install
node server.js
# Runs on http://127.0.0.1:5174
```

### Run as a background service (systemd — for HAOS/Supervised/Pi)

```bash
sudo cp spotify-colour.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable spotify-colour
sudo systemctl start spotify-colour
sudo systemctl status spotify-colour
```

### Docker Compose (add alongside your HA container)

```yaml
services:
  homeassistant:
    # ... your existing HA config

  spotify-colour:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./colour-service:/app
    command: sh -c "npm install && node server.js"
    restart: unless-stopped
    network_mode: host   # so HA can reach 127.0.0.1:5174
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

## Configuration in Home Assistant

In the integration options (Settings → Devices & Services → Spotify Enhanced → Configure),
set the **Colour Service URL** to `http://127.0.0.1:5174` (default, no change needed
if running on the same machine).

The integration will call this service whenever the album art changes and store
the results in:
- `sensor.spotify_enhanced_background_color` — hex background colour
- `sensor.spotify_enhanced_foreground_color` — hex foreground colour

All Lovelace cards read from these sensors automatically.
