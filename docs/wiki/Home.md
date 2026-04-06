# Spotify Enhanced Wiki

Welcome to the Spotify Enhanced wiki.

**Maintainer:** Sorren ([@Kousei-Uchu](https://github.com/Kousei-Uchu)) — [sorren.me](https://sorren.me)

## Contents

- [Installation](Installation)
- [Lovelace Cards](Lovelace-Cards)
- [Colour Service](Colour-Service)
- [Services Reference](Services-Reference)
- [Sensors Reference](Sensors-Reference)
- [Library Browser](Library-Browser)
- [Lyrics](Lyrics)
- [Architecture](Architecture)
- [Troubleshooting](../troubleshooting.md)

---

## Quick start

1. Install via HACS or manually
2. Add the integration: **Settings → Devices & Services → Add Integration → Spotify Enhanced**
3. Set up the colour service (optional but recommended)
4. Add a card to your dashboard

```yaml
type: spotify-enhanced-card
entity: media_player.spotify_enhanced
```
