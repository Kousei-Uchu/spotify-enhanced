"""Data coordinator for Spotify Enhanced."""
from __future__ import annotations

import json
import logging
import time
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_entry_oauth2_flow
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN, UPDATE_INTERVAL, SESSION_CACHE_KEY, SESSION_CACHE_TTL
from .spotify_api import SpotifyAPI

_LOGGER = logging.getLogger(__name__)


class SpotifyDataUpdateCoordinator(DataUpdateCoordinator):
    """Manages polling Spotify and exposing data to entities."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        session: config_entry_oauth2_flow.OAuth2Session,
    ) -> None:
        self.entry = entry
        self.session = session
        self.devices: list[dict] = []
        self.current_user: dict | None = None
        self._store = Store(hass, 1, f"{SESSION_CACHE_KEY}_{entry.entry_id}")
        self._session_cache: dict = {}

        async def _token_provider() -> str:
            await session.async_ensure_token_valid()
            return session.token["access_token"]

        self.api = SpotifyAPI(hass=hass, token_provider=_token_provider)

        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=UPDATE_INTERVAL),
        )

    async def async_config_entry_first_refresh(self) -> None:
        """Load session cache before first refresh."""
        try:
            cached = await self._store.async_load()
            if cached and isinstance(cached, dict):
                self._session_cache = cached
                _LOGGER.debug("Loaded session cache for %s", self.entry.entry_id)
        except Exception:
            pass
        await super().async_config_entry_first_refresh()

    async def _async_update_data(self) -> dict[str, Any]:
        try:
            playback = await self.api.get_current_playback()
            self.devices = await self.api.get_devices()

            if self.current_user is None:
                self.current_user = await self.api.get_current_user()

            # Persist session cache when meaningful playback state exists
            if playback and playback.get("item"):
                await self._save_session(playback)

            return {"playback": playback, "devices": self.devices}
        except Exception as err:
            raise UpdateFailed(f"Spotify API error: {err}") from err

    async def _save_session(self, playback: dict) -> None:
        """Save current playback state for session resume."""
        try:
            item = playback.get("item", {})
            device = playback.get("device", {})
            ctx = playback.get("context") or {}
            cache = {
                "timestamp": time.time(),
                "track_uri": item.get("uri"),
                "track_name": item.get("name"),
                "artist": ", ".join(a["name"] for a in item.get("artists", [])),
                "album_art": (item.get("album", {}).get("images") or [{}])[0].get("url"),
                "context_uri": ctx.get("uri"),
                "position_ms": playback.get("progress_ms", 0),
                "device_id": device.get("id"),
                "device_name": device.get("name"),
                "shuffle": playback.get("shuffle_state", False),
                "repeat": playback.get("repeat_state", "off"),
                "volume": device.get("volume_percent", 50),
            }
            self._session_cache = cache
            await self._store.async_save(cache)
        except Exception as err:
            _LOGGER.debug("Session cache save error: %s", err)

    def get_session_cache(self) -> dict | None:
        """Return cached session if within TTL."""
        cache = self._session_cache
        if not cache:
            return None
        age = time.time() - cache.get("timestamp", 0)
        if age > SESSION_CACHE_TTL:
            return None
        return cache

    async def resume_session(self) -> bool:
        """Resume the last cached session. Returns True if resumed."""
        cache = self.get_session_cache()
        if not cache:
            return False
        try:
            device_id = cache.get("device_id")
            context_uri = cache.get("context_uri")
            track_uri = cache.get("track_uri")
            position_ms = cache.get("position_ms", 0)

            if context_uri:
                await self.api.play(
                    device_id=device_id,
                    context_uri=context_uri,
                    position_ms=position_ms,
                )
            elif track_uri:
                await self.api.play(
                    device_id=device_id,
                    uris=[track_uri],
                    position_ms=position_ms,
                )
            else:
                return False

            if cache.get("shuffle") is not None:
                await self.api.set_shuffle(cache["shuffle"], device_id)
            if cache.get("repeat"):
                await self.api.set_repeat(cache["repeat"], device_id)

            return True
        except Exception as err:
            _LOGGER.error("Session resume error: %s", err)
            return False
