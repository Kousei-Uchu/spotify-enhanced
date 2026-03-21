# Troubleshooting

## Auth / Setup

### "Invalid state" on the callback page
This was a bug in earlier versions that used `my.home-assistant.io` as the redirect relay. The current version uses HA's native `AbstractOAuth2FlowHandler`, which handles the `/auth/external/callback` path internally and never has this issue.

If you're seeing this on the current version, the flow timed out or was opened twice. Delete the in-progress entry in Integrations and start again.

---

### Setup wizard doesn't show a redirect URI / errors on submit
HA needs to know its own URL. Go to **Settings → System → Network** and set the Internal or External URL. After saving, restart the integration setup.

---

### "oauth_unauthorized" error
The Client ID or Client Secret is wrong. Double-check them in your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

---

### Redirect URI mismatch
The URI in your Spotify app must exactly match what HA generates. The setup wizard displays the exact value. Common mistakes:
- Trailing slash (`http://x:8123/auth/external/callback/` vs without)
- `http` vs `https`
- Wrong port
- Using an IP address in HA's URL but a hostname in Spotify (or vice versa)

---

### Integration disappears after restart
HA couldn't load the component. Check **Settings → System → Logs** and filter for `spotify_enhanced`. Usually a missing Python dependency (`spotipy`).

Fix for Docker:
```bash
docker exec homeassistant pip install spotipy
docker restart homeassistant
```

---

## Cards

### Cards not in the picker
The JS resource isn't registered. Go to **Settings → Dashboards → ⋮ → Resources** and add:
- URL: `/local/spotify-enhanced-card/spotify-enhanced-card.js`
- Type: **JavaScript Module**

Then hard-refresh: `Ctrl+Shift+R` / `Cmd+Shift+R`.

---

### Visual Editor is blank / doesn't work
This can happen if the `ha-entity-picker` or `ha-switch` components aren't available yet (usually on older HA versions). The YAML editor always works. Minimum HA version: 2023.6.

---

### Card shows "Nothing playing" even when music is playing
- Confirm the `entity` in the card config is `media_player.spotify_enhanced`
- Spotify must be playing on a device that exposes itself via the Connect API (some web player modes and private sessions don't)
- Check `sensor.spotify_enhanced_now_playing` in Developer Tools — if it has data, the card config is wrong; if it doesn't, the API isn't returning playback

---

## Playback

### "Premium required" errors
Spotify's Web API requires Premium for starting playback, seeking, transferring devices, etc. The sensors and device list work on free accounts; controls do not.

---

### Commands work manually but not in automations
Check that the `entity_id` is correct. The standard HA media player services (`media_player.media_play`, etc.) all need `entity_id`. Spotify-specific services don't need it but need a valid token (i.e. the integration must be authenticated).

---

### No devices found
Open the official Spotify app on at least one device — the Connect API only lists devices that are currently running Spotify. Background/minimised works; closed does not.

---

## Spotify DJ

### DJ won't start
- Requires Spotify Premium
- DJ may not be available in all regions (currently US, UK, Australia, and more — check Spotify's support page)
- Try starting DJ manually in the official app first to confirm your account has access

### DJ request queues a song but nothing happens
Expected: the DJ decides when to play queued content. It usually plays it within the next transition. You can force a transition by tapping "Skip Section".

---

## Performance

### High CPU / slow HA
The default poll interval is 3 seconds. Increase it: **Settings → Devices & Services → Spotify Enhanced → Configure** → set Poll Interval to 5–10 seconds.

---

## Logs

Enable debug logging:
```yaml
# configuration.yaml
logger:
  default: info
  logs:
    custom_components.spotify_enhanced: debug
    spotipy: debug
```

Restart HA, reproduce the issue, then check **Settings → System → Logs**.
