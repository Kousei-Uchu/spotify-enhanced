"""Data coordinator for Spotify Enhanced."""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_entry_oauth2_flow
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN, UPDATE_INTERVAL
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

        # Token provider: HA's OAuth2Session refreshes automatically
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

    async def _async_update_data(self) -> dict[str, Any]:
        try:
            playback = await self.api.get_current_playback()
            self.devices = await self.api.get_devices()

            if self.current_user is None:
                self.current_user = await self.api.get_current_user()

            return {"playback": playback, "devices": self.devices}
        except Exception as err:
            raise UpdateFailed(f"Spotify API error: {err}") from err
