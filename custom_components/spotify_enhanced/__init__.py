"""Spotify Enhanced integration."""
from __future__ import annotations

import logging
import os
import shutil

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

    implementation = await config_entry_oauth2_flow.async_get_implementations(hass, DOMAIN)
    oauth_session = config_entry_oauth2_flow.OAuth2Session(
        hass, entry, list(implementation.values())[0]
    )

    coordinator = SpotifyDataUpdateCoordinator(hass, entry, oauth_session)
    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN][entry.entry_id] = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await async_setup_services(hass)
    async_register_views(hass)

    await hass.async_add_executor_job(_copy_card_js, hass)
    await _async_register_resource(hass)

    return True


def _copy_card_js(hass: HomeAssistant) -> None:
    src = os.path.join(os.path.dirname(__file__), "frontend", "spotify-enhanced-card.js")
    if not os.path.isfile(src):
        _LOGGER.warning("Spotify Enhanced: card JS not found at %s", src)
        return
    dest_dir = os.path.join(hass.config.config_dir, "www", "spotify-enhanced-card")
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, "spotify-enhanced-card.js")
    shutil.copy2(src, dest)
    _LOGGER.info("Spotify Enhanced: card JS copied to %s", dest)


async def _async_register_resource(hass: HomeAssistant) -> None:
    try:
        lovelace = hass.data.get("lovelace")
        if lovelace and hasattr(lovelace, "resources"):
            resources = lovelace.resources
            await resources.async_get_info()
            existing = [r["url"] for r in resources.async_items()]
            if CARD_JS_URL not in existing:
                await resources.async_create_item({"res_type": "module", "url": CARD_JS_URL})
                _LOGGER.info("Spotify Enhanced: registered Lovelace resource")
    except Exception as err:
        _LOGGER.debug("Could not auto-register Lovelace resource: %s", err)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        hass.data[DOMAIN].pop(entry.entry_id)
    return ok
