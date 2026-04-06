"""Spotify API wrapper — uses tokens managed by HA's OAuth2 session."""
from __future__ import annotations

import logging
from typing import Any

import spotipy
from homeassistant.core import HomeAssistant


_LOGGER = logging.getLogger(__name__)


class SpotifyAPI:
    """Thin async wrapper around spotipy.Spotify.

    The access token is provided fresh on every call via a callback so
    HA's OAuth2 session can refresh it transparently.
    """

    def __init__(self, hass: HomeAssistant, token_provider) -> None:
        """
        Args:
            hass: HomeAssistant instance
            token_provider: async callable that returns a fresh access_token str
        """
        self.hass = hass
        self._token_provider = token_provider

    async def _client(self) -> spotipy.Spotify:
        token = await self._token_provider()
        return spotipy.Spotify(auth=token)

    async def _run(self, func, *args, **kwargs) -> Any:
        sp = await self._client()
        return await self.hass.async_add_executor_job(lambda: func(sp, *args, **kwargs))

    # ------------------------------------------------------------------ #
    # Playback
    # ------------------------------------------------------------------ #

    async def get_current_playback(self) -> dict | None:
        try:
            return await self._run(lambda sp: sp.current_playback())
        except Exception as err:
            _LOGGER.debug("get_current_playback error: %s", err)
            return None

    async def get_devices(self) -> list[dict]:
        try:
            result = await self._run(lambda sp: sp.devices())
            return (result or {}).get("devices", [])
        except Exception as err:
            _LOGGER.debug("get_devices error: %s", err)
            return []

    async def play(self, device_id=None, context_uri=None, uris=None, offset=None, position_ms=0):
        kw: dict[str, Any] = {}
        if device_id:
            kw["device_id"] = device_id
        if context_uri:
            kw["context_uri"] = context_uri
        if uris:
            kw["uris"] = uris
        if offset:
            kw["offset"] = offset
        if position_ms:
            kw["position_ms"] = position_ms
        await self._run(lambda sp: sp.start_playback(**kw))

    async def pause(self, device_id=None):
        await self._run(lambda sp: sp.pause_playback(device_id=device_id))

    async def resume(self, device_id=None):
        await self._run(lambda sp: sp.start_playback(device_id=device_id))

    async def next_track(self, device_id=None):
        await self._run(lambda sp: sp.next_track(device_id=device_id))

    async def previous_track(self, device_id=None):
        await self._run(lambda sp: sp.previous_track(device_id=device_id))

    async def seek(self, position_ms: int, device_id=None):
        await self._run(lambda sp: sp.seek_track(position_ms, device_id=device_id))

    async def set_volume(self, volume_percent: int, device_id=None):
        await self._run(lambda sp: sp.volume(volume_percent, device_id=device_id))

    async def set_shuffle(self, state: bool, device_id=None):
        await self._run(lambda sp: sp.shuffle(state, device_id=device_id))

    async def set_repeat(self, state: str, device_id=None):
        await self._run(lambda sp: sp.repeat(state, device_id=device_id))

    async def transfer_playback(self, device_id: str, force_play=True):
        await self._run(lambda sp: sp.transfer_playback(device_id, force_play=force_play))

    async def add_to_queue(self, uri: str, device_id=None):
        await self._run(lambda sp: sp.add_to_queue(uri, device_id=device_id))

    # ------------------------------------------------------------------ #
    # Library
    # ------------------------------------------------------------------ #

    async def get_saved_tracks(self, limit=50, offset=0):
        return await self._run(lambda sp: sp.current_user_saved_tracks(limit=limit, offset=offset))

    async def get_playlists(self, limit=50, offset=0):
        return await self._run(lambda sp: sp.current_user_playlists(limit=limit, offset=offset))

    async def get_playlist_tracks(self, playlist_id, limit=50, offset=0):
        return await self._run(lambda sp: sp.playlist_items(playlist_id, limit=limit, offset=offset))

    async def get_top_tracks(self, limit=20, time_range="medium_term"):
        return await self._run(lambda sp: sp.current_user_top_tracks(limit=limit, time_range=time_range))

    async def get_top_artists(self, limit=20, time_range="medium_term"):
        return await self._run(lambda sp: sp.current_user_top_artists(limit=limit, time_range=time_range))

    async def get_recently_played(self, limit=20):
        return await self._run(lambda sp: sp.current_user_recently_played(limit=limit))

    async def get_new_releases(self, limit=20):
        return await self._run(lambda sp: sp.new_releases(limit=limit))

    async def get_featured_playlists(self, limit=20):
        return await self._run(lambda sp: sp.featured_playlists(limit=limit))

    async def save_tracks(self, track_ids: list[str]):
        await self._run(lambda sp: sp.current_user_saved_tracks_add(track_ids))

    async def remove_tracks(self, track_ids: list[str]):
        await self._run(lambda sp: sp.current_user_saved_tracks_delete(track_ids))

    async def is_track_saved(self, track_ids: list[str]) -> list[bool]:
        return await self._run(lambda sp: sp.current_user_saved_tracks_contains(track_ids))

    async def follow_playlist(self, playlist_id: str):
        await self._run(lambda sp: sp.current_user_follow_playlist(playlist_id))

    async def unfollow_playlist(self, playlist_id: str):
        await self._run(lambda sp: sp.current_user_unfollow_playlist(playlist_id))

    async def get_album(self, album_id: str):
        return await self._run(lambda sp: sp.album(album_id))

    async def get_artist_top_tracks(self, artist_id: str, country="US"):
        return await self._run(lambda sp: sp.artist_top_tracks(artist_id, country=country))

    async def get_artist_albums(self, artist_id: str, limit=20):
        return await self._run(lambda sp: sp.artist_albums(artist_id, limit=limit))

    async def get_current_user(self):
        try:
            return await self._run(lambda sp: sp.current_user())
        except Exception as err:
            _LOGGER.debug("get_current_user error: %s", err)
            return None

    # ------------------------------------------------------------------ #
    # Search
    # ------------------------------------------------------------------ #

    async def search(self, query: str, types: list[str] | None = None, limit=20):
        search_types = ",".join(types) if types else "track,album,artist,playlist"
        return await self._run(lambda sp: sp.search(query, limit=limit, type=search_types))

    # ------------------------------------------------------------------ #
