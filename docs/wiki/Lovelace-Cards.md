# Lovelace Cards

Spotify Enhanced provides six Lovelace cards. All cards share adaptive colours extracted from the current album art by the colour service.

---

## spotify-enhanced-card (Media Deck)

The main card. Displays album art background, track info, playback controls, seek bar, volume, and provides access to all panel menus via buttons in the top bar.

**Top bar (left):** Search · Library · Devices  
**Top bar (right):** Like · Lyrics · Queue · ⋮

**Panels:**
- **Search** — search Spotify across tracks, albums, artists, and playlists
- **Library** — browse playlists, liked songs, recently played, top tracks, top artists, discover weekly, new releases
- **Devices** — switch Spotify Connect devices
- **Queue** — view and manage the playback queue (swipe left to remove)
- **Lyrics** — time-synced lyrics via lrclib.net (click any line to seek)

```yaml
type: spotify-enhanced-card
entity: media_player.spotify_enhanced
show_seek: true       # default: true
show_volume: true     # default: true
show_shuffle: true    # default: true
show_repeat: true     # default: true
```

---

## spotify-mini-card (Mini Player)

Compact single-row player. Shows album art, track name, artist, seek bar, and prev/play/next controls.

```yaml
type: spotify-mini-card
entity: media_player.spotify_enhanced
show_seek: true   # default: true
```

---

## spotify-device-card (Device Picker)

Shows all available Spotify Connect devices. Click to transfer playback.

```yaml
type: spotify-device-card
entity: media_player.spotify_enhanced
title: Spotify Devices   # optional
```

---

## spotify-search-card (Search)

Standalone search card. Results are grouped by tracks, albums, artists, and playlists with "Show more" expansion. Click a track to play; use the queue button to add to queue.

```yaml
type: spotify-search-card
entity: media_player.spotify_enhanced
```

---

## spotify-queue-card (Queue)

Shows the current playback queue. Swipe left on any item to reveal a delete button. Click an item to skip to it (the card mutes audio, skips, then unmutes). Auto-refreshes on track change.

```yaml
type: spotify-queue-card
entity: media_player.spotify_enhanced
```

---

## spotify-lyrics-card (Lyrics)

Shows time-synced lyrics from lrclib.net. The active line is highlighted and the card auto-scrolls within itself. Click any line to seek to that position.

Plain (unsynced) lyrics are shown when synced lyrics aren't available. Instrumental tracks show a message instead.

```yaml
type: spotify-lyrics-card
entity: media_player.spotify_enhanced
```

---

## Colour system

All cards read from two sensors:
- `sensor.spotify_enhanced_background_color` — background hex
- `sensor.spotify_enhanced_foreground_color` — foreground hex

These are set by the colour service when the album art changes. The algorithm is identical to the one used by HA's built-in media control card (`node-vibrant` with the same `customGenerator`).

If the colour service isn't running, cards fall back to HA theme colours.
