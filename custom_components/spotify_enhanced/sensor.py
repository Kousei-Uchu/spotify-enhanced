"""Sensor entities for Spotify Enhanced."""
from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN, MANUFACTURER
from .coordinator import SpotifyDataUpdateCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
):
    coord: SpotifyDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        SpotifyNowPlayingSensor(coord, entry),
        SpotifyDevicesSensor(coord, entry),
        SpotifyBgColorSensor(coord, entry),
        SpotifyFgColorSensor(coord, entry),
        SpotifyPrColorSensor(coord, entry),
        SpotifyAcColorSensor(coord, entry),
    ])


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
            # Include colours here too for convenience
            "background_color": self.coordinator.bg_color,
            "foreground_color": self.coordinator.fg_color,
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


class SpotifyBgColorSensor(_Base):
    """Sensor exposing the extracted background colour as a hex string.

    Cards read this sensor's state to set their background colour,
    using the exact same node-vibrant result as HA's media control card.
    """
    _attr_name = "Background Color"
    _attr_icon = "mdi:palette"

    def __init__(self, coord, entry):
        super().__init__(coord, entry)
        self._attr_unique_id = f"{entry.entry_id}_bg_color"

    @property
    def native_value(self) -> str:
        return self.coordinator.bg_color or ""

    @property
    def extra_state_attributes(self):
        return {"foreground_color": self.coordinator.fg_color}


class SpotifyFgColorSensor(_Base):
    """Sensor exposing the extracted foreground colour as a hex string."""

    _attr_name = "Foreground Color"
    _attr_icon = "mdi:palette-outline"

    def __init__(self, coord, entry):
        super().__init__(coord, entry)
        self._attr_unique_id = f"{entry.entry_id}_fg_color"

    @property
    def native_value(self) -> str:
        return self.coordinator.fg_color or ""


class SpotifyPrColorSensor(_Base):
    """Sensor exposing the extracted foreground colour as a hex string."""

    _attr_name = "Primary Light Color"
    _attr_icon = "mdi:palette-outline"

    def __init__(self, coord, entry):
        super().__init__(coord, entry)
        self._attr_unique_id = f"{entry.entry_id}_pr_color"

    @property
    def native_value(self) -> str:
        return self.coordinator.pr_color or [255, 0, 0]


class SpotifyAcColorSensor(_Base):
    """Sensor exposing the extracted foreground colour as a hex string."""

    _attr_name = "Accent Light Color"
    _attr_icon = "mdi:palette-outline"

    def __init__(self, coord, entry):
        super().__init__(coord, entry)
        self._attr_unique_id = f"{entry.entry_id}_ac_color"

    @property
    def native_value(self) -> str:
        return self.coordinator.ac_color or [255, 0, 0]