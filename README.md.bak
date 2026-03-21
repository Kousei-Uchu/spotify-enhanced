# Spotify Enhanced for Home Assistant

[![HACS][hacs-badge]][hacs-url]
[![GitHub Release][release-badge]][release-url]
[![License][license-badge]](LICENSE)

A full-featured Spotify integration for Home Assistant. Provides complete playback control, library browsing, Spotify DJ support, device switching, and a polished Lovelace card suite — all configured entirely through the UI with no YAML required.

---

## Features

| Feature | Detail |
|---------|--------|
| 🎵 Playback control | Play, pause, skip, seek, volume, shuffle, repeat |
| 🎨 Album art | Full-bleed art with track info overlay |
| 📚 Library browser | Playlists, liked songs, recently played, top tracks, artists, new releases |
| 🔍 Search | Tracks, albums, artists, playlists — inline in the card |
| 📡 Device switching | All Spotify Connect devices with one-tap transfer |
| 🎙 Spotify DJ | Start DJ, skip sections (tap), make requests (hold) |
| ❤️ Like / queue | Save tracks and add to queue from the card |
| ⚙️ Automations | 14 services for full programmatic control |
| 🔔 Sensors | `now_playing` and `devices` sensors with rich attributes |
| 🔐 Persistent auth | HA-managed OAuth2 with automatic token refresh |
| 🎨 Theme-aware | Cards use HA CSS variables — matches your dashboard theme |
| 🖱️ Visual editor | Configure every card option without touching YAML |

---

## Requirements

- Home Assistant 2023.6 or newer
- Spotify Premium (required for most playback API features)
- A [Spotify Developer app](https://developer.spotify.com/dashboard) (free)

---

## Installation

### HACS (Recommended)

1. Open HACS → **Integrations** → **⋮** → **Custom repositories**
2. URL: `https://github.com/YOUR_GITHUB_USERNAME/spotify-enhanced` · Category: **Integration**
3. Install **Spotify Enhanced** and restart Home Assistant
4. Open HACS → **Frontend** → search **Spotify Enhanced Card** → Install

### Manual

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/spotify-enhanced.git
cd spotify-enhanced
./install.sh /config          # HAOS / Supervised
./install.sh /homeassistant   # Docker (adjust to your volume path)
```

Then restart Home Assistant.

---

## Spotify Developer App Setup

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. **Create App**
3. In **Redirect URIs**, add the URI shown during the HA setup wizard\
   *(It will look like `http://192.168.x.x:8123/auth/external/callback` or your external URL)*
4. Enable **Web API**
5. Note your **Client ID** and **Client Secret**

> The setup wizard in Home Assistant will display the exact redirect URI to use. You don't need to guess your URL — HA knows it and tells you.

---

## Configuration

1. **Settings → Devices & Services → Add Integration → Spotify Enhanced**
2. Enter your **Client ID** and **Client Secret**
3. The wizard shows you the Redirect URI — add it to your Spotify app if you haven't already
4. Click **Authorise** — log in to Spotify in the popup
5. Done ✅

This creates:
- `media_player.spotify_enhanced`
- `sensor.spotify_enhanced_now_playing`
- `sensor.spotify_enhanced_spotify_devices`

---

## Lovelace Cards

Three cards — all configurable via the **Visual Editor** (pencil icon on the card).

### Full Deck (`spotify-enhanced-card`)

```yaml
type: custom:spotify-enhanced-card
entity: media_player.spotify_enhanced
# All options below are optional (all default true):
show_seek: true
show_volume: true
show_shuffle: true
show_repeat: true
show_library: true
show_search: true
show_devices: true
show_dj: true
accent_color: ""   # CSS colour — blank = follow HA theme
```

### Mini Player (`spotify-mini-card`)

```yaml
type: custom:spotify-mini-card
entity: media_player.spotify_enhanced
show_volume: true
accent_color: ""
```

### Device Picker (`spotify-device-card`)

```yaml
type: custom:spotify-device-card
entity: media_player.spotify_enhanced
title: "Spotify Devices"
accent_color: ""
```

### Modular layouts

```yaml
# Mini player + device picker stacked
type: vertical-stack
cards:
  - type: custom:spotify-mini-card
    entity: media_player.spotify_enhanced
  - type: custom:spotify-device-card
    entity: media_player.spotify_enhanced
    title: Switch Device
```

---

## Spotify DJ

The DJ panel is on the **Now Playing** tab of the Full Deck card:

| Gesture | Action |
|---------|--------|
| Tap **Skip Section** | Skip to the next DJ segment |
| **Hold** Skip Section (500 ms) | Opens the request input |
| Type + send request | Searches Spotify and queues the best match |

Via services:
```yaml
action: spotify_enhanced.start_dj
action: spotify_enhanced.dj_next_section
action: spotify_enhanced.dj_request
data:
  request_text: "more upbeat 80s pop"
```

---

## Services

| Service | Description |
|---------|-------------|
| `play_uri` | Play a context URI or track URI(s) |
| `search` | Search Spotify; fires `spotify_enhanced_search_results` event |
| `transfer_playback` | Move playback to a device by ID |
| `start_dj` | Start Spotify DJ mode |
| `dj_next_section` | Skip to next DJ segment |
| `dj_request` | Queue a track matching a text request |
| `add_to_queue` | Add a track URI to the queue |
| `save_track` | Save track(s) to Liked Songs |
| `remove_track` | Remove track(s) from Liked Songs |
| `seek` | Seek to a position in ms |
| `set_repeat` | Set repeat: `off`, `track`, `context` |
| `set_shuffle` | Enable/disable shuffle |
| `follow_playlist` | Follow a playlist |
| `unfollow_playlist` | Unfollow a playlist |

All services are available in **Developer Tools → Actions** with full UI descriptions.

---

## Automation Examples

### Play music when arriving home
```yaml
automation:
  trigger:
    platform: state
    entity_id: person.you
    to: home
  action:
    action: spotify_enhanced.play_uri
    data:
      context_uri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"
```

### Save the current track with a button
```yaml
automation:
  trigger:
    platform: state
    entity_id: input_button.save_track
  action:
    action: spotify_enhanced.save_track
    data:
      track_id:
        - "{{ state_attr('media_player.spotify_enhanced', 'track_id') }}"
```

### Transfer to a device by name
```yaml
action: spotify_enhanced.transfer_playback
data:
  device_id: >
    {{ state_attr('sensor.spotify_enhanced_spotify_devices','devices')
       | selectattr('name','eq','Kitchen Speaker')
       | map(attribute='id') | first }}
```

### Search and immediately play the top result
```yaml
- action: spotify_enhanced.search
  data:
    query: "Daft Punk"
    search_type: [track]
- wait_for_trigger:
    platform: event
    event_type: spotify_enhanced_search_results
  timeout: 10
- action: spotify_enhanced.play_uri
  data:
    track_uri:
      - "{{ wait.trigger.event.data.results.tracks.items[0].uri }}"
```

---

## Sensors

### `sensor.spotify_enhanced_now_playing`

State: `Track Name — Artist` (or `None`)

Attributes: `track_id`, `track_uri`, `artists`, `album`, `album_art_url`, `duration_ms`, `progress_ms`, `is_playing`, `shuffle`, `repeat`, `device`, `device_id`, `context_uri`

### `sensor.spotify_enhanced_spotify_devices`

State: device count

Attributes: `devices` — list of `{id, name, type, is_active, volume_percent}`

---

## Troubleshooting

### Setup wizard doesn't open / auth fails
- Ensure HA's URL is configured: **Settings → System → Network → Home Assistant URL**
- The Redirect URI in your Spotify app must exactly match the one shown in the wizard

### "Premium required" errors
Most Spotify Web API playback features require Spotify Premium.

### Cards not appearing
Add the resource manually: **Settings → Dashboards → Resources** → `/local/spotify-enhanced-card/spotify-enhanced-card.js` (JavaScript Module), then hard-refresh.

### No devices found
Open the Spotify app on any device — it must be running to appear via the Connect API.

### Token expired
Remove and re-add the integration (Settings → Devices & Services → Spotify Enhanced → Delete).

See [`docs/troubleshooting.md`](docs/troubleshooting.md) for the full guide.

---

## Development & Releases

```bash
# Clone and deploy to a new GitHub repo
git clone https://github.com/YOUR_GITHUB_USERNAME/spotify-enhanced.git
cd spotify-enhanced
./deploy.sh

# Tag a new release (triggers GitHub Actions to build + publish)
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

GitHub Actions will:
1. Validate the manifest, JSON files, and JS syntax
2. Run HACS validation
3. Build release ZIPs
4. Create a GitHub Release with the ZIPs attached

HACS users get the update automatically on the next HACS check.

---

## License

MIT — see [LICENSE](LICENSE)

[hacs-badge]: https://img.shields.io/badge/HACS-Custom-orange.svg
[hacs-url]: https://hacs.xyz
[release-badge]: https://img.shields.io/github/release/YOUR_GITHUB_USERNAME/spotify-enhanced.svg
[release-url]: https://github.com/YOUR_GITHUB_USERNAME/spotify-enhanced/releases
[license-badge]: https://img.shields.io/github/license/YOUR_GITHUB_USERNAME/spotify-enhanced.svg
