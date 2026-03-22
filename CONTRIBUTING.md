# Contributing to Spotify Enhanced

Thank you for your interest in contributing! This document explains how to get involved.

**Maintainer:** Sorren ([@Kousei-Uchu](https://github.com/Kousei-Uchu)) — [sorren.me](https://sorren.me)

---

## Ways to contribute

- **Bug reports** — open an issue with reproduction steps and HA/integration version
- **Feature requests** — open an issue describing the feature and why it's useful
- **Pull requests** — see the development setup below
- **Documentation** — improvements to docs, wiki, or code comments are always welcome

---

## Development setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Home Assistant development instance
- A Spotify Developer app

### Repository structure

```
spotify-enhanced/
├── custom_components/spotify_enhanced/   Python integration
│   ├── __init__.py          Entry point, auto-installs card JS
│   ├── api_views.py         REST endpoints for Lovelace cards
│   ├── browse_media.py      HA media browser integration
│   ├── config_flow.py       OAuth2 config flow
│   ├── coordinator.py       Data polling + colour service calls
│   ├── media_player.py      MediaPlayerEntity
│   ├── sensor.py            Sensor entities (now playing, colours)
│   ├── services.py          HA services
│   ├── spotify_api.py       spotipy wrapper
│   └── frontend/            Bundled card JS (auto-copied on startup)
├── www/spotify-enhanced-card/
│   └── spotify-enhanced-card.js    Lovelace card source
├── colour-service/
│   ├── src/
│   │   ├── rgb.ts           WCAG contrast (mirrors HA source)
│   │   ├── extract_color.ts node-vibrant palette extraction (mirrors HA source)
│   │   └── server.ts        Express HTTP server
│   └── server.js            Plain JS fallback (no TypeScript required)
├── docs/                    Documentation
└── examples/                Example automations and card configs
```

### Running locally

1. Copy `custom_components/spotify_enhanced` to your HA config directory
2. Restart HA and set up the integration
3. Edit `www/spotify-enhanced-card/spotify-enhanced-card.js` directly and hard-refresh

### Colour service

```bash
cd colour-service
npm install
npm run dev   # ts-node for development
```

### Code style

- Python: follow HA conventions, type hints where practical
- JavaScript: vanilla ES2020+, no bundler, no framework
- Keep the card JS as a single file — it is auto-copied into HA's www directory

---

## Pull request process

1. Fork the repository
2. Create a branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Test against a real HA instance
5. Open a pull request with a clear description of what changed and why

---

## Release process

Releases are created by the maintainer. Version numbers follow [semver](https://semver.org/).

```bash
# Bump version in manifest.json
git tag -a v1.x.x -m "Release v1.x.x"
git push origin v1.x.x
gh release create v1.x.x --title "Spotify Enhanced v1.x.x" --notes "..."
```

---

## Code of conduct

Be respectful. This is a hobby project maintained in spare time.
