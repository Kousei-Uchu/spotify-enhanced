"""Spotify Enhanced integration."""
from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_entry_oauth2_flow

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.MEDIA_PLAYER, Platform.SENSOR]
CARD_JS_URL = "/local/spotify-enhanced-card/spotify-enhanced-card.js"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    from .coordinator import SpotifyDataUpdateCoordinator
    from .api_views import async_register_views
    from .services import async_setup_services

    implementation = await config_entry_oauth2_flow.async_get_implementations(
        hass, DOMAIN
    )
    # Get the OAuth2 session for this entry
    oauth_session = config_entry_oauth2_flow.OAuth2Session(hass, entry, list(implementation.values())[0])

    coordinator = SpotifyDataUpdateCoordinator(hass, entry, oauth_session)
    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN][entry.entry_id] = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await async_setup_services(hass)
    async_register_views(hass)
    await _try_register_lovelace_resource(hass)

    return True


async def _try_register_lovelace_resource(hass: HomeAssistant) -> None:
    """Auto-register the Lovelace JS resource if possible."""
    try:
        lovelace = hass.data.get("lovelace")
        if lovelace and hasattr(lovelace, "resources"):
            resources = lovelace.resources
            await resources.async_get_info()
            existing = [r["url"] for r in resources.async_items()]
            if CARD_JS_URL not in existing:
                await resources.async_create_item({"res_type": "module", "url": CARD_JS_URL})
                _LOGGER.info("Spotify Enhanced: registered Lovelace card resource")
    except Exception as err:
        _LOGGER.debug(
            "Could not auto-register Lovelace resource — add %s manually as a JS Module: %s",
            CARD_JS_URL, err,
        )


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        hass.data[DOMAIN].pop(entry.entry_id)
    return ok
