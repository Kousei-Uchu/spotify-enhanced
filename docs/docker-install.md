# Docker Installation Guide

This guide covers installing Spotify Enhanced alongside a Dockerised Home Assistant instance.

**Maintainer:** Sorren ([@Kousei-Uchu](https://github.com/Kousei-Uchu)) — [sorren.me](https://sorren.me)

---

## Home Assistant Docker setup

If you're running HA in Docker, your config directory is mounted as a volume. Typically:

```bash
docker run -d \
  --name homeassistant \
  -v /path/to/ha-config:/config \
  -p 8123:8123 \
  ghcr.io/home-assistant/home-assistant:stable
```

Your config directory is at `/path/to/ha-config`.

---

## Installing the integration

```bash
# Copy the custom component
cp -r custom_components/spotify_enhanced /path/to/ha-config/custom_components/

# Restart HA
docker restart homeassistant
```

---

## Colour service with Docker Compose

The easiest way to run both HA and the colour service together:

```yaml
version: "3.8"

services:
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    container_name: homeassistant
    volumes:
      - ./ha-config:/config
    ports:
      - "8123:8123"
    restart: unless-stopped
    network_mode: host

  spotify-colour:
    image: node:20-alpine
    container_name: spotify-colour
    working_dir: /app
    volumes:
      - ./colour-service:/app
    command: sh -c "npm install && npm run build && node dist/server.js"
    restart: unless-stopped
    network_mode: host   # shares host network so HA can reach 127.0.0.1:5174
    environment:
      - PORT=5174
```

With `network_mode: host`, both containers share the host network, so the coordinator can reach the colour service at `http://127.0.0.1:5174`.

---

## Verifying the setup

```bash
# Check colour service is accessible from inside the HA container
docker exec homeassistant wget -qO- http://127.0.0.1:5174/health
# Should return: {"ok":true,"version":"1.0.0"}

# Check integration loaded
docker exec homeassistant grep -r "spotify_enhanced" /config/home-assistant.log | tail -5
```
