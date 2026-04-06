# Troubleshooting

**Maintainer:** Sorren ([@Kousei-Uchu](https://github.com/Kousei-Uchu)) — [sorren.me](https://sorren.me)

---

## Cards not appearing in the picker

1. Check the resource is registered: **Settings → Dashboards → ⋮ → Resources**
   - It should contain `/local/spotify-enhanced-card/spotify-enhanced-card.js` as type **JavaScript Module**
   - If missing, restart HA — the integration registers it automatically on startup

2. Hard refresh your browser: `Ctrl+Shift+R` (or open an incognito window)

3. Check the file exists:
   ```bash
   ls /config/www/spotify-enhanced-card/
   grep "VERSION" /config/www/spotify-enhanced-card/spotify-enhanced-card.js | head -1
   ```

4. Check the browser console (F12) for red errors mentioning `spotify-enhanced-card`

---

## Colours not changing with album art

1. Check the colour service is running:
   ```bash
   curl http://127.0.0.1:5174/health
   # Should return: {"ok":true,"version":"1.0.0"}
   ```

2. Check the colour sensors have values:
   - `sensor.spotify_enhanced_background_color`
   - `sensor.spotify_enhanced_foreground_color`
   - Both should have hex values like `#1a2b3c`

3. Check the colour service logs:
   ```bash
   sudo journalctl -u spotify-colour -n 30 --no-pager
   ```

4. Test extraction manually:
   ```bash
   curl "http://127.0.0.1:5174/extract?url=https://i.scdn.co/image/ab67616d0000b273e8adbe3d32b79bc12e5a1dc9"
   ```

---

## "Invalid state" during OAuth setup

This happens when the browser doesn't return to HA correctly. Make sure:
- The redirect URI in your Spotify app matches your HA URL exactly
- The URI ends with `/auth/external/callback`
- You're accessing HA via the same URL you registered

---

## Playback errors (400 Bad Request)

Some library categories (Recently Played, Top Tracks, Liked Songs) cannot be played as a context URI — Spotify only supports playing them as individual tracks or saving them to a playlist first. This is a Spotify API limitation.

**Workaround:** Browse into the category, then click individual tracks or add them to a playlist.

---

## Lyrics not loading

1. lrclib.net requires an internet connection from your HA instance
2. Not all tracks have lyrics — instrumental tracks will show "Instrumental — no lyrics"
3. The track name and artist must match exactly — try searching lrclib.net directly to verify

---

## Queue unavailable

The queue endpoint requires Spotify Premium. It also requires active playback — start a track first, then open the queue.

---

## Cards not updating when song changes

Check the polling interval. The default is 3 seconds. You can adjust it in:
**Settings → Devices & Services → Spotify Enhanced → Configure**

---

## HA restart loop / integration fails to load

Check HA logs for Python errors:
```bash
grep "spotify_enhanced" /config/home-assistant.log | tail -30
```

Common causes:
- `spotipy` not installed: `pip install spotipy --break-system-packages`
- Missing `aiohttp`: should be bundled with HA
- Token expired: delete the config entry and re-add the integration

---

## Getting help

- Open an issue at [github.com/Kousei-Uchu/spotify-enhanced/issues](https://github.com/Kousei-Uchu/spotify-enhanced/issues)
- Include your HA version, integration version, and any relevant logs
