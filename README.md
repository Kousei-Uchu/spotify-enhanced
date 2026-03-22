<div align="center">

# Spotify Enhanced

**A full-featured Spotify integration and Lovelace card suite for Home Assistant**

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/release/Kousei-Uchu/spotify-enhanced.svg)](https://github.com/Kousei-Uchu/spotify-enhanced/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

*Maintained by [Sorren](https://sorren.me) ([@Kousei-Uchu](https://github.com/Kousei-Uchu))*

</div>

---

## What is Spotify Enhanced?

Spotify Enhanced replaces the standard Spotify integration with a full-featured custom component and a suite of Lovelace cards that are designed to look and feel like an extension of the built-in HA media control card — with significantly more functionality.

**Key features:**
- Full media player entity with play, pause, seek, volume, shuffle, repeat, and device transfer
- Six Lovelace cards sharing adaptive album-art-extracted colours
- Time-synced lyrics via [lrclib.net](https://lrclib.net)
- Library browser (playlists, liked songs, recently played, top tracks, top artists, discover weekly, new releases)
- Search with inline results and queue-add
- Full queue viewer with swipe-to-delete
- Spotify Connect device switcher
- Session resume — remembers last track for 6 hours
- Colour extraction service (Node.js) using the exact same algorithm as the HA frontend

---

## Prerequisites

- Home Assistant 2023.6 or newer
- A Spotify Premium account
- A Spotify Developer app ([create one here](https://developer.spotify.com/dashboard))
- Node.js 18+ on the same machine as HA (for the colour service)

---

## Installation

### Via HACS (recommended)

1. Open HACS → Integrations → ⋮ → Custom repositories
2. Add `https://github.com/Kousei-Uchu/spotify-enhanced` as an **Integration**
3. Search for **Spotify Enhanced** and install it
4. Restart Home Assistant

### Manual

```bash
cp -r custom_components/spotify_enhanced /config/custom_components/
```

Restart Home Assistant after copying.

---

## Spotify Developer App Setup

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create a new app (any name, any description)
3. In the app settings, add a Redirect URI:
   ```
   https://your-ha-instance/auth/external/callback
   ```
   Replace `your-ha-instance` with your actual HA URL (e.g. `homeassistant.local:8123`)
4. Copy your **Client ID** and **Client Secret**

---

## Integration Setup

1. Go to **Settings → Devices & Services → Add Integration**
2. Search for **Spotify Enhanced**
3. Enter your Client ID and Client Secret when prompted
4. You will be redirected to Spotify to authorise — click **Agree**
5. You will be redirected back to HA — the integration is now set up

---

## Colour Service Setup

The colour service extracts album art colours server-side using the exact same `node-vibrant` algorithm as the HA frontend. This ensures colours match perfectly.

```bash
cd colour-service
npm install
npm run build  # compiles TypeScript → dist/
npm start
```

### Run as a background service

```bash
sudo cp colour-service/spotify-colour.service /etc/systemd/system/
# Edit WorkingDirectory in the service file to your actual path
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

The service runs on `http://127.0.0.1:5174` by default. It exposes:
- `GET /extract?url=<image_url>` → `{"background":"#rrggbb","foreground":"#rrggbb"}`
- `GET /health` → `{"ok":true}`

---

## Lovelace Cards

After installing the integration and restarting HA, the following cards are available in the card picker:

| Card | Description |
|------|-------------|
| **Spotify Enhanced — Media Deck** | Full player: art, controls, seek, volume, shuffle, repeat, library, search, queue, devices, lyrics |
| **Spotify Enhanced — Mini Player** | Compact row player with seek bar |
| **Spotify Enhanced — Device Picker** | Spotify Connect device switcher |
| **Spotify Enhanced — Search** | Standalone search card |
| **Spotify Enhanced — Queue** | Queue viewer with swipe-to-remove |
| **Spotify Enhanced — Lyrics** | Time-synced lyrics display |

All cards adapt their colours to the current album art using colours computed by the colour service.

### Basic YAML

```yaml
type: spotify-enhanced-card
entity: media_player.spotify_enhanced

type: spotify-mini-card
entity: media_player.spotify_enhanced

type: spotify-lyrics-card
entity: media_player.spotify_enhanced
```

### Media Deck options

```yaml
type: spotify-enhanced-card
entity: media_player.spotify_enhanced
show_seek: true       # default: true
show_volume: true     # default: true
show_shuffle: true    # default: true
show_repeat: true     # default: true
```

---

## Sensors

The integration creates the following sensors:

| Entity | Description |
|--------|-------------|
| `sensor.spotify_enhanced_now_playing` | Current track name and artist |
| `sensor.spotify_enhanced_spotify_devices` | Number of available Spotify Connect devices |
| `sensor.spotify_enhanced_background_color` | Extracted background colour hex (e.g. `#1a2b3c`) |
| `sensor.spotify_enhanced_foreground_color` | Extracted foreground colour hex (e.g. `#ffffff`) |

Cards read the colour sensors directly — no manual template configuration needed.

---

## Services

| Service | Description |
|---------|-------------|
| `spotify_enhanced.play_uri` | Play a Spotify URI (track, album, playlist, artist) |
| `spotify_enhanced.search` | Search Spotify and fire an event with results |
| `spotify_enhanced.transfer_playback` | Transfer playback to a device by ID |
| `spotify_enhanced.add_to_queue` | Add a track URI to the queue |
| `spotify_enhanced.save_track` | Save a track to Liked Songs |
| `spotify_enhanced.remove_track` | Remove a track from Liked Songs |
| `spotify_enhanced.seek` | Seek to a position in milliseconds |
| `spotify_enhanced.set_repeat` | Set repeat mode (`off`, `track`, `context`) |
| `spotify_enhanced.set_shuffle` | Set shuffle on/off |
| `spotify_enhanced.follow_playlist` | Follow a playlist |
| `spotify_enhanced.unfollow_playlist` | Unfollow a playlist |
| `spotify_enhanced.resume_session` | Resume the last cached playback session |

---

## Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md) for common issues.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute.

---

## License

[MIT](LICENSE) — © 2025 [Sorren](https://sorren.me)
