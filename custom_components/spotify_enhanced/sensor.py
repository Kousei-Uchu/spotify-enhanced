"""Sensor entities for Spotify Enhanced."""
from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN, MANUFACTURER
from .coordinator import SpotifyDataUpdateCoordinator


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback):
    coord: SpotifyDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([SpotifyNowPlayingSensor(coord, entry), SpotifyDevicesSensor(coord, entry)])


class _Base(CoordinatorEntity, SensorEntity):
    def __init__(self, coord, entry):
        super().__init__(coord)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            manufacturer=MANUFACTURER,
            name="Spotify Enhanced",
            entry_type=DeviceEntryType.SERVICE,
        )


class SpotifyNowPlayingSensor(_Base):
    _attr_name = "Now Playing"
    _attr_icon = "mdi:music-note"

    def __init__(self, coord, entry):
        super().__init__(coord, entry)
        self._attr_unique_id = f"{entry.entry_id}_now_playing"

    @property
    def native_value(self):
        pb = (self.coordinator.data or {}).get("playback")
        if pb and pb.get("item"):
            artists = ", ".join(a["name"] for a in pb["item"].get("artists", []))
            return f"{pb['item']['name']} — {artists}"
        return None

    @property
    def extra_state_attributes(self):
        pb = (self.coordinator.data or {}).get("playback")
        if not pb or not pb.get("item"):
            return {}
        item = pb["item"]
        imgs = item.get("album", {}).get("images", [])
        return {
            "track_id": item.get("id"),
            "track_uri": item.get("uri"),
            "track_name": item.get("name"),
            "artists": [a["name"] for a in item.get("artists", [])],
            "album": item.get("album", {}).get("name"),
            "album_art_url": imgs[0]["url"] if imgs else None,
            "duration_ms": item.get("duration_ms"),
            "progress_ms": pb.get("progress_ms"),
            "is_playing": pb.get("is_playing"),
            "shuffle": pb.get("shuffle_state"),
            "repeat": pb.get("repeat_state"),
            "device": pb.get("device", {}).get("name"),
            "device_id": pb.get("device", {}).get("id"),
            "context_uri": (pb.get("context") or {}).get("uri"),
        }


class SpotifyDevicesSensor(_Base):
    _attr_name = "Spotify Devices"
    _attr_icon = "mdi:cast"

    def __init__(self, coord, entry):
        super().__init__(coord, entry)
        self._attr_unique_id = f"{entry.entry_id}_devices"

    @property
    def native_value(self):
        return len(self.coordinator.devices)

    @property
    def extra_state_attributes(self):
        return {"devices": self.coordinator.devices}
