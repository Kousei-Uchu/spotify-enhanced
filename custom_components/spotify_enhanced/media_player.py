"""Media player entity for Spotify Enhanced."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.media_player import (
    MediaPlayerEntity,
    MediaPlayerEntityFeature,
    MediaPlayerState,
    MediaType,
    RepeatMode,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, MANUFACTURER, REPEAT_OFF, REPEAT_TRACK, REPEAT_CONTEXT
from .coordinator import SpotifyDataUpdateCoordinator

_LOGGER = logging.getLogger(__name__)

SUPPORTED = (
    MediaPlayerEntityFeature.PAUSE
    | MediaPlayerEntityFeature.PLAY
    | MediaPlayerEntityFeature.PLAY_MEDIA
    | MediaPlayerEntityFeature.NEXT_TRACK
    | MediaPlayerEntityFeature.PREVIOUS_TRACK
    | MediaPlayerEntityFeature.SEEK
    | MediaPlayerEntityFeature.VOLUME_SET
    | MediaPlayerEntityFeature.VOLUME_MUTE
    | MediaPlayerEntityFeature.SELECT_SOURCE
    | MediaPlayerEntityFeature.SHUFFLE_SET
    | MediaPlayerEntityFeature.REPEAT_SET
    | MediaPlayerEntityFeature.BROWSE_MEDIA
)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback):
    coordinator: SpotifyDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([SpotifyMediaPlayer(coordinator, entry)])


class SpotifyMediaPlayer(CoordinatorEntity, MediaPlayerEntity):
    _attr_has_entity_name = True
    _attr_name = "Spotify Enhanced"
    _attr_media_content_type = MediaType.MUSIC
    _attr_supported_features = SUPPORTED

    def __init__(self, coordinator: SpotifyDataUpdateCoordinator, entry: ConfigEntry):
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_player"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            manufacturer=MANUFACTURER,
            name="Spotify Enhanced",
            entry_type=DeviceEntryType.SERVICE,
        )
        self._muted_volume: float | None = None

    @property
    def _pb(self) -> dict | None:
        return (self.coordinator.data or {}).get("playback")

    @property
    def state(self):
        if not self._pb:
            return MediaPlayerState.IDLE
        return MediaPlayerState.PLAYING if self._pb.get("is_playing") else MediaPlayerState.PAUSED

    @property
    def media_title(self):
        return (self._pb or {}).get("item", {}).get("name") if self._pb else None

    @property
    def media_artist(self):
        if self._pb and self._pb.get("item"):
            return ", ".join(a["name"] for a in self._pb["item"].get("artists", []))
        return None

    @property
    def media_album_name(self):
        if self._pb and self._pb.get("item"):
            return self._pb["item"].get("album", {}).get("name")
        return None

    @property
    def media_image_url(self):
        if self._pb and self._pb.get("item"):
            imgs = self._pb["item"].get("album", {}).get("images", [])
            return imgs[0]["url"] if imgs else None
        return None

    @property
    def media_duration(self):
        if self._pb and self._pb.get("item"):
            return self._pb["item"].get("duration_ms", 0) // 1000
        return None

    @property
    def media_position(self):
        return self._pb.get("progress_ms", 0) // 1000 if self._pb else None

    @property
    def media_position_updated_at(self):
        from homeassistant.util import dt as dt_util
        return dt_util.utcnow()

    @property
    def volume_level(self):
        if self._pb and self._pb.get("device"):
            return self._pb["device"].get("volume_percent", 0) / 100
        return None

    @property
    def is_volume_muted(self):
        return self._muted_volume is not None

    @property
    def shuffle(self):
        return (self._pb or {}).get("shuffle_state", False)

    @property
    def repeat(self):
        mode = (self._pb or {}).get("repeat_state", REPEAT_OFF)
        return {REPEAT_TRACK: RepeatMode.ONE, REPEAT_CONTEXT: RepeatMode.ALL}.get(mode, RepeatMode.OFF)

    @property
    def source(self):
        if self._pb and self._pb.get("device"):
            return self._pb["device"].get("name")
        return None

    @property
    def source_list(self):
        return [d["name"] for d in self.coordinator.devices]

    @property
    def extra_state_attributes(self):
        attrs: dict[str, Any] = {"spotify_devices": self.coordinator.devices}
        if self._pb:
            dev = self._pb.get("device", {})
            item = self._pb.get("item", {})
            ctx = self._pb.get("context") or {}
            attrs.update({
                "device_id": dev.get("id"),
                "device_name": dev.get("name"),
                "device_type": dev.get("type"),
                "track_id": item.get("id"),
                "track_uri": item.get("uri"),
                "context_uri": ctx.get("uri"),
            })
        return attrs

    def _active_device(self):
        if self._pb and self._pb.get("device"):
            return self._pb["device"].get("id")
        return None

    async def async_media_play(self):
        await self.coordinator.api.resume(self._active_device())
        await self.coordinator.async_request_refresh()

    async def async_media_pause(self):
        await self.coordinator.api.pause(self._active_device())
        await self.coordinator.async_request_refresh()

    async def async_media_next_track(self):
        await self.coordinator.api.next_track(self._active_device())
        await self.coordinator.async_request_refresh()

    async def async_media_previous_track(self):
        await self.coordinator.api.previous_track(self._active_device())
        await self.coordinator.async_request_refresh()

    async def async_media_seek(self, position: float):
        await self.coordinator.api.seek(int(position * 1000), self._active_device())
        await self.coordinator.async_request_refresh()

    async def async_set_volume_level(self, volume: float):
        await self.coordinator.api.set_volume(int(volume * 100), self._active_device())
        await self.coordinator.async_request_refresh()

    async def async_mute_volume(self, mute: bool):
        if mute and not self.is_volume_muted:
            self._muted_volume = self.volume_level
            await self.async_set_volume_level(0)
        elif not mute and self.is_volume_muted:
            vol = self._muted_volume or 0.5
            self._muted_volume = None
            await self.async_set_volume_level(vol)

    async def async_set_shuffle(self, shuffle: bool):
        await self.coordinator.api.set_shuffle(shuffle, self._active_device())
        await self.coordinator.async_request_refresh()

    async def async_set_repeat(self, repeat: RepeatMode):
        m = {RepeatMode.OFF: REPEAT_OFF, RepeatMode.ONE: REPEAT_TRACK, RepeatMode.ALL: REPEAT_CONTEXT}
        await self.coordinator.api.set_repeat(m[repeat], self._active_device())
        await self.coordinator.async_request_refresh()

    async def async_select_source(self, source: str):
        device = next((d for d in self.coordinator.devices if d["name"] == source), None)
        if device:
            await self.coordinator.api.transfer_playback(device["id"])
            await self.coordinator.async_request_refresh()

    async def async_play_media(self, media_type: str, media_id: str, **kwargs):
        if media_id.startswith(("spotify:track:", "spotify:episode:")):
            await self.coordinator.api.play(device_id=self._active_device(), uris=[media_id])
        else:
            await self.coordinator.api.play(device_id=self._active_device(), context_uri=media_id)
        await self.coordinator.async_request_refresh()

    async def async_browse_media(self, media_content_type=None, media_content_id=None):
        from .browse_media import async_browse_media as _browse
        return await _browse(self.hass, self.coordinator, media_content_type, media_content_id)
