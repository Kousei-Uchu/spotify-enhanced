"""HTTP API views for the Lovelace card."""
from __future__ import annotations
import logging
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


def async_register_views(hass: HomeAssistant):
    hass.http.register_view(SpotifySearchView)
    hass.http.register_view(SpotifyDevicesView)
    hass.http.register_view(SpotifyPlaybackView)
    hass.http.register_view(SpotifyBrowseView)
    hass.http.register_view(SpotifyQueueView)
    hass.http.register_view(SpotifyLikedView)


def _coord(hass):
    d = hass.data.get(DOMAIN, {})
    return d[next(iter(d))] if d else None


class SpotifySearchView(HomeAssistantView):
    url = "/api/spotify_enhanced/search"
    name = "api:spotify_enhanced:search"

    async def get(self, request):
        hass = request.app["hass"]
        c = _coord(hass)
        if not c:
            return self.json_message("Not configured", 503)
        q = request.query.get("q", "").strip()
        types = [t.strip() for t in request.query.get("types", "track,album,artist,playlist").split(",")]
        if not q:
            return self.json_message("Missing q", 400)
        try:
            return self.json(await c.api.search(query=q, types=types, limit=20))
        except Exception as e:
            return self.json_message(str(e), 500)


class SpotifyDevicesView(HomeAssistantView):
    url = "/api/spotify_enhanced/devices"
    name = "api:spotify_enhanced:devices"

    async def get(self, request):
        hass = request.app["hass"]
        c = _coord(hass)
        if not c:
            return self.json_message("Not configured", 503)
        return self.json({"devices": await c.api.get_devices()})


class SpotifyPlaybackView(HomeAssistantView):
    url = "/api/spotify_enhanced/playback"
    name = "api:spotify_enhanced:playback"

    async def get(self, request):
        hass = request.app["hass"]
        c = _coord(hass)
        if not c:
            return self.json_message("Not configured", 503)
        return self.json(await c.api.get_current_playback() or {})


class SpotifyQueueView(HomeAssistantView):
    """Return the current playback queue."""

    url = "/api/spotify_enhanced/queue"
    name = "api:spotify_enhanced:queue"

    async def get(self, request):
        hass = request.app["hass"]
        c = _coord(hass)
        if not c:
            return self.json_message("Not configured", 503)
        try:
            result = await c.api._run(lambda sp: sp.queue())
            return self.json(result or {})
        except Exception as e:
            return self.json_message(str(e), 500)


class SpotifyLikedView(HomeAssistantView):
    """Check if track IDs are in the user's Liked Songs."""

    url = "/api/spotify_enhanced/liked"
    name = "api:spotify_enhanced:liked"

    async def get(self, request):
        hass = request.app["hass"]
        c = _coord(hass)
        if not c:
            return self.json_message("Not configured", 503)
        ids_raw = request.query.get("ids", "")
        ids = [i.strip() for i in ids_raw.split(",") if i.strip()]
        if not ids:
            return self.json([])
        try:
            result = await c.api._run(lambda sp: sp.current_user_saved_tracks_contains(ids))
            return self.json(result or [False] * len(ids))
        except Exception as e:
            return self.json_message(str(e), 500)


class SpotifyBrowseView(HomeAssistantView):
    url = "/api/spotify_enhanced/browse"
    name = "api:spotify_enhanced:browse"

    async def get(self, request):
        hass = request.app["hass"]
        c = _coord(hass)
        if not c:
            return self.json_message("Not configured", 503)
        category = request.query.get("category", "")
        limit = int(request.query.get("limit", 50))
        offset = int(request.query.get("offset", 0))
        try:
            api = c.api
            if category == "playlists":
                return self.json(await api.get_playlists(limit, offset))
            elif category == "liked_songs":
                return self.json(await api.get_saved_tracks(limit, offset))
            elif category == "recently_played":
                return self.json(await api.get_recently_played(limit))
            elif category == "top_tracks":
                return self.json(await api.get_top_tracks(limit))
            elif category == "top_artists":
                return self.json(await api.get_top_artists(limit))
            elif category == "new_releases":
                return self.json(await api.get_new_releases(limit))
            elif category == "featured":
                return self.json(await api.get_featured_playlists(limit))
            elif category.startswith("playlist:"):
                return self.json(await api.get_playlist_tracks(category.split(":", 1)[1], limit, offset))
            elif category.startswith("album:"):
                return self.json(await api.get_album(category.split(":", 1)[1]))
            else:
                return self.json_message("Unknown category", 400)
        except Exception as e:
            return self.json_message(str(e), 500)
