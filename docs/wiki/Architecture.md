# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Home Assistant                        │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │  Integration          │  │  Lovelace Cards           │ │
│  │                      │  │                          │ │
│  │  coordinator.py      │  │  spotify-enhanced-card   │ │
│  │  ├── polls Spotify   │  │  spotify-mini-card       │ │
│  │  │   every 3s        │  │  spotify-device-card     │ │
│  │  ├── calls colour    │  │  spotify-search-card     │ │
│  │  │   service on art  │  │  spotify-queue-card      │ │
│  │  │   change          │  │  spotify-lyrics-card     │ │
│  │  └── saves session   │  │                          │ │
│  │       cache          │  │  Read from:              │ │
│  │                      │  │  - media_player entity   │ │
│  │  media_player.py     │  │  - colour sensors        │ │
│  │  sensor.py           │  │  - REST API endpoints    │ │
│  │  api_views.py        │  │                          │ │
│  │  services.py         │  │  Lyrics from:            │ │
│  └──────────────────────┘  │  - lrclib.net (direct)  │ │
│                            └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         │ http://127.0.0.1:5174
                         ▼
              ┌─────────────────────┐
              │   Colour Service    │
              │   (Node.js)         │
              │                     │
              │  node-vibrant +     │
              │  culori (WCAG)      │
              │                     │
              │  Same algorithm as  │
              │  HA frontend        │
              └─────────────────────┘
                         │
                         │
                         ▼
              ┌─────────────────────┐
              │   Spotify API       │
              │   (via spotipy)     │
              └─────────────────────┘
```

## OAuth2 flow

The integration uses HA's `AbstractOAuth2FlowHandler` which:
- Builds the redirect URI automatically from HA's known URL
- Handles the callback at `/auth/external/callback` (standard HA path)
- Stores and refreshes tokens via HA's token storage
- Works on every install type (HAOS, Supervised, Docker, Core)

## Polling

The coordinator polls the Spotify API every 3 seconds (configurable) for:
- Current playback state
- Available devices
- User profile (once on startup)

## Colour extraction

1. Coordinator detects art URL change
2. Calls `http://127.0.0.1:5174/extract?url=<art_url>`
3. Colour service fetches the image, runs node-vibrant customGenerator
4. Returns `{background, foreground}` hex strings
5. Coordinator stores them in `bg_color` and `fg_color`
6. Sensor entities expose them to Lovelace

## Session cache

On every playback state update, the coordinator saves:
- Track URI, context URI, position
- Device ID, shuffle/repeat state, volume

Stored in HA's `.storage/` directory with a 6-hour TTL.
`spotify_enhanced.resume_session` replays this state.

## Card–backend communication

Cards use two channels:
1. **HA WebSocket** — entity state updates, `media_player/browse_media` calls
2. **REST API** — `/api/spotify_enhanced/*` endpoints for search, queue, liked status, lyrics proxy, devices

All REST calls include a Bearer token from `hass.auth.data.access_token`.
