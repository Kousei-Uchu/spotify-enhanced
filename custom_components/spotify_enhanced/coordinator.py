"""Data coordinator for Spotify Enhanced."""
from __future__ import annotations

import logging
import time
from datetime import timedelta
from typing import Any

import aiohttp
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_entry_oauth2_flow
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    DOMAIN, UPDATE_INTERVAL, SESSION_CACHE_KEY, SESSION_CACHE_TTL,
    COLOUR_SERVICE_URL_DEFAULT,
)
from .spotify_api import SpotifyAPI

from .colours import get_spotify_colors

_LOGGER = logging.getLogger(__name__)


class SpotifyDataUpdateCoordinator(DataUpdateCoordinator):
    """Manages polling Spotify, colour extraction, and data exposure."""

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

        # Colour state — updated when art URL changes
        self.bg_color: str = ""
        self.fg_color: str = ""
        self.pr_color: list[int, int, int] = [255, 0, 0]
        self.ac_color: list[int, int, int] = [255, 0, 0]
        self._last_art_url: str = ""

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
        try:
            cached = await self._store.async_load()
            if cached and isinstance(cached, dict):
                self._session_cache = cached
        except Exception:
            pass
        await super().async_config_entry_first_refresh()

    @property
    def _colour_service_url(self) -> str:
        return self.entry.options.get("colour_service_url", COLOUR_SERVICE_URL_DEFAULT)

    async def _async_update_data(self) -> dict[str, Any]:
        try:
            playback = await self.api.get_current_playback()
            self.devices = await self.api.get_devices()

            if self.current_user is None:
                self.current_user = await self.api.get_current_user()

            # Extract colours when art changes
            if playback and playback.get("item"):
                await self._save_session(playback)
                imgs = playback["item"].get("album", {}).get("images", [])
                art_url = imgs[0]["url"] if imgs else ""
                if art_url and art_url != self._last_art_url:
                    self._last_art_url = art_url
                    await self._extract_colors(art_url)

            return {"playback": playback, "devices": self.devices}
        except Exception as err:
            raise UpdateFailed(f"Spotify API error: {err}") from err

    async def _extract_colors(self, art_url: str) -> None:
        """Call the Node.js colour service to get background/foreground hex."""
        try:
            svc = self._colour_service_url.rstrip("/")
            url = f"{svc}/extract?url={art_url}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as r:
                    if r.status == 200:
                        data = await r.json()
                        self.bg_color = data.get("background", "")
                        self.fg_color = data.get("foreground", "")
                        _LOGGER.debug(
                            "Colours extracted: bg=%s fg=%s", self.bg_color, self.fg_color
                        )
                    else:
                        _LOGGER.debug("Colour service returned %s", r.status)
            # Instead of: colors = get_spotify_colors(art_url, lights_mode=True)
            # Use the Home Assistant executor:
            colors = await self.hass.async_add_executor_job(
                get_spotify_colors, 
                art_url, 
                None,  # ha_url
                True,  # verify_cert
                True   # lights_mode
            )

            self.pr_color = colors.get("primary", [255, 0, 0])
            self.ac_color = colors.get("accent", [255, 0, 0])

        except Exception as err:
            _LOGGER.debug(
                "Colour service unavailable (%s) — cards will use HA theme colours", err
            )
            # Don't clear existing colours — keep last good value

    async def _save_session(self, playback: dict) -> None:
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
        cache = self._session_cache
        if not cache:
            return None
        if time.time() - cache.get("timestamp", 0) > SESSION_CACHE_TTL:
            return None
        return cache

    async def resume_session(self) -> bool:
        cache = self.get_session_cache()
        if not cache:
            return False
        try:
            device_id = cache.get("device_id")
            context_uri = cache.get("context_uri")
            track_uri = cache.get("track_uri")
            position_ms = cache.get("position_ms", 0)

            if context_uri:
                await self.api.play(device_id=device_id, context_uri=context_uri, position_ms=position_ms)
            elif track_uri:
                await self.api.play(device_id=device_id, uris=[track_uri], position_ms=position_ms)
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
