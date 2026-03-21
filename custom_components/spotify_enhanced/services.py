"""Services for Spotify Enhanced."""
from __future__ import annotations
import logging
import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from .const import *

_LOGGER = logging.getLogger(__name__)


def _coord(hass):
    d = hass.data.get(DOMAIN, {})
    if not d:
        raise ValueError("Spotify Enhanced not configured")
    return d[next(iter(d))]


async def async_setup_services(hass: HomeAssistant):
    svc = hass.services

    svc.async_register(DOMAIN, SERVICE_PLAY_URI, _play_uri, vol.Schema({
        vol.Optional(ATTR_DEVICE_ID): cv.string,
        vol.Optional(ATTR_CONTEXT_URI): cv.string,
        vol.Optional(ATTR_TRACK_URI): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional(ATTR_POSITION_MS, default=0): cv.positive_int,
    }))
    svc.async_register(DOMAIN, SERVICE_SEARCH, _search, vol.Schema({
        vol.Required(ATTR_QUERY): cv.string,
        vol.Optional(ATTR_SEARCH_TYPE, default=["track"]): vol.All(cv.ensure_list, [vol.In(SEARCH_TYPES)]),
    }))
    svc.async_register(DOMAIN, SERVICE_TRANSFER, _transfer, vol.Schema({
        vol.Required(ATTR_DEVICE_ID): cv.string,
    }))
    svc.async_register(DOMAIN, SERVICE_QUEUE_TRACK, _queue, vol.Schema({
        vol.Required(ATTR_TRACK_URI): cv.string,
        vol.Optional(ATTR_DEVICE_ID): cv.string,
    }))
    svc.async_register(DOMAIN, SERVICE_SAVE_TRACK, _save, vol.Schema({
        vol.Required(ATTR_TRACK_ID): vol.All(cv.ensure_list, [cv.string]),
    }))
    svc.async_register(DOMAIN, SERVICE_REMOVE_TRACK, _remove, vol.Schema({
        vol.Required(ATTR_TRACK_ID): vol.All(cv.ensure_list, [cv.string]),
    }))
    svc.async_register(DOMAIN, SERVICE_SEEK, _seek, vol.Schema({
        vol.Required(ATTR_POSITION_MS): cv.positive_int,
        vol.Optional(ATTR_DEVICE_ID): cv.string,
    }))
    svc.async_register(DOMAIN, SERVICE_SET_REPEAT, _set_repeat, vol.Schema({
        vol.Required(ATTR_REPEAT): vol.In([REPEAT_OFF, REPEAT_TRACK, REPEAT_CONTEXT]),
        vol.Optional(ATTR_DEVICE_ID): cv.string,
    }))
    svc.async_register(DOMAIN, SERVICE_SET_SHUFFLE, _set_shuffle, vol.Schema({
        vol.Required(ATTR_SHUFFLE): cv.boolean,
        vol.Optional(ATTR_DEVICE_ID): cv.string,
    }))
    svc.async_register(DOMAIN, SERVICE_FOLLOW_PLAYLIST, _follow, vol.Schema({
        vol.Required(ATTR_PLAYLIST_ID): cv.string,
    }))
    svc.async_register(DOMAIN, SERVICE_UNFOLLOW_PLAYLIST, _unfollow, vol.Schema({
        vol.Required(ATTR_PLAYLIST_ID): cv.string,
    }))
    svc.async_register(DOMAIN, SERVICE_RESUME_SESSION, _resume_session, vol.Schema({}))


async def _play_uri(call: ServiceCall):
    c = _coord(call.hass)
    await c.api.play(
        device_id=call.data.get(ATTR_DEVICE_ID),
        context_uri=call.data.get(ATTR_CONTEXT_URI),
        uris=call.data.get(ATTR_TRACK_URI),
        position_ms=call.data.get(ATTR_POSITION_MS, 0),
    )
    await c.async_request_refresh()


async def _search(call: ServiceCall):
    c = _coord(call.hass)
    results = await c.api.search(
        query=call.data[ATTR_QUERY],
        types=call.data.get(ATTR_SEARCH_TYPE, ["track"]),
    )
    call.hass.bus.async_fire(
        f"{DOMAIN}_search_results",
        {"query": call.data[ATTR_QUERY], "results": results},
    )


async def _transfer(call: ServiceCall):
    c = _coord(call.hass)
    await c.api.transfer_playback(call.data[ATTR_DEVICE_ID])
    await c.async_request_refresh()


async def _queue(call: ServiceCall):
    await _coord(call.hass).api.add_to_queue(
        call.data[ATTR_TRACK_URI], call.data.get(ATTR_DEVICE_ID)
    )


async def _save(call: ServiceCall):
    await _coord(call.hass).api.save_tracks(call.data[ATTR_TRACK_ID])


async def _remove(call: ServiceCall):
    await _coord(call.hass).api.remove_tracks(call.data[ATTR_TRACK_ID])


async def _seek(call: ServiceCall):
    c = _coord(call.hass)
    await c.api.seek(call.data[ATTR_POSITION_MS], call.data.get(ATTR_DEVICE_ID))
    await c.async_request_refresh()


async def _set_repeat(call: ServiceCall):
    c = _coord(call.hass)
    await c.api.set_repeat(call.data[ATTR_REPEAT], call.data.get(ATTR_DEVICE_ID))
    await c.async_request_refresh()


async def _set_shuffle(call: ServiceCall):
    c = _coord(call.hass)
    await c.api.set_shuffle(call.data[ATTR_SHUFFLE], call.data.get(ATTR_DEVICE_ID))
    await c.async_request_refresh()


async def _follow(call: ServiceCall):
    await _coord(call.hass).api.follow_playlist(call.data[ATTR_PLAYLIST_ID])


async def _unfollow(call: ServiceCall):
    await _coord(call.hass).api.unfollow_playlist(call.data[ATTR_PLAYLIST_ID])


async def _resume_session(call: ServiceCall):
    c = _coord(call.hass)
    resumed = await c.resume_session()
    if resumed:
        await c.async_request_refresh()
    else:
        _LOGGER.warning("No session cache available to resume")
