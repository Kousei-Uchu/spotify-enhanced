# Docker / Container Installation

## Quick install

```bash
# Assuming your HA config is at /path/to/config on the host:
git clone https://github.com/Kousei-Uchu/spotify-enhanced.git
cd spotify-enhanced
./install.sh /path/to/config
docker restart homeassistant
```

## Docker Compose example

```yaml
services:
  homeassistant:
    container_name: homeassistant
    image: ghcr.io/home-assistant/home-assistant:stable
    volumes:
      - /path/to/config:/config
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
    network_mode: host
    environment:
      - TZ=Australia/Sydney
```

After `docker compose up -d` your config is at `/path/to/config`.

## Setting HA's URL (important for OAuth)

In `/path/to/config/configuration.yaml`:
```yaml
homeassistant:
  internal_url: "http://192.168.1.100:8123"
  # If you have external access:
  external_url: "https://ha.yourdomain.com"
```

Or set it in the UI: **Settings → System → Network → Home Assistant URL**.

The OAuth redirect URI is built from this URL. Set it before running the integration setup.

## Python dependency

`spotipy` is auto-installed by HA on startup. If you see `ModuleNotFoundError`:

```bash
docker exec homeassistant pip install spotipy
docker restart homeassistant
```

## Reverse proxy (NGINX / Traefik)

The OAuth callback path `/auth/external/callback` flows through the standard HA reverse proxy config with no extra rules needed.

### NGINX example
```nginx
server {
    listen 443 ssl;
    server_name ha.yourdomain.com;

    location / {
        proxy_pass http://192.168.1.100:8123;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Set `external_url: "https://ha.yourdomain.com"` in HA and use `https://ha.yourdomain.com/auth/external/callback` as the Spotify Redirect URI.

## Checking logs
```bash
docker logs homeassistant 2>&1 | grep -i "spotify"
```
