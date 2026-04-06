"""Config flow for Spotify Enhanced.

Uses HA's AbstractOAuth2FlowHandler which:
- Builds the redirect URI from HA's own known URL automatically
- Handles the callback at /auth/external/callback (standard HA path)
- Stores and refreshes tokens via HA's token storage
- Works correctly with every HA install type (Container, HAOS, Supervised)
  without any URL configuration from the user
"""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.application_credentials import (
    ClientCredential,
    async_import_client_credential,
)
from homeassistant.helpers import config_entry_oauth2_flow

from .const import DOMAIN, SCOPE

_LOGGER = logging.getLogger(__name__)


class SpotifyEnhancedOAuth2FlowHandler(
    config_entry_oauth2_flow.AbstractOAuth2FlowHandler,
    domain=DOMAIN,
):
    """OAuth2 config flow for Spotify Enhanced.

    HA's AbstractOAuth2FlowHandler manages:
      - Redirect URI construction (always /auth/external/callback)
      - Sending the user to Spotify
      - Receiving the callback
      - Exchanging the code for tokens
      - Persisting tokens (with refresh)

    We only need to define the scope and what to do after auth.
    """

    DOMAIN = DOMAIN

    @property
    def logger(self):
        return _LOGGER

    @property
    def extra_authorize_data(self) -> dict[str, Any]:
        """Pass the required Spotify scopes."""
        return {"scope": SCOPE}


    @staticmethod
    def async_get_options_flow(config_entry):
        return SpotifyEnhancedOptionsFlow(config_entry)

    async def async_oauth_create_entry(self, data: dict) -> dict:
        """Create the config entry after successful OAuth."""
        # Fetch the Spotify user to use as unique ID and title
        try:
            import spotipy

            token = data["token"]["access_token"]
            sp = spotipy.Spotify(auth=token)
            user = await self.hass.async_add_executor_job(sp.current_user)
            user_id = user.get("id", "unknown")
            display_name = user.get("display_name", "Spotify User")
        except Exception as err:
            _LOGGER.warning("Could not fetch Spotify user profile: %s", err)
            user_id = data.get("auth_implementation", DOMAIN)
            display_name = "Spotify User"

        await self.async_set_unique_id(user_id)
        self._abort_if_unique_id_configured()

        return self.async_create_entry(
            title=f"Spotify Enhanced ({display_name})",
            data=data,
        )


import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback


@callback
def async_get_options_flow_handler():
    return SpotifyEnhancedOptionsFlow


class SpotifyEnhancedOptionsFlow(config_entries.OptionsFlow):
    """Options flow — lets user configure colour service URL and poll interval."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        from .const import COLOUR_SERVICE_URL_DEFAULT, CONF_COLOUR_SERVICE_URL
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Optional(
                    "update_interval",
                    default=self.config_entry.options.get("update_interval", 3),
                ): vol.All(int, vol.Range(min=1, max=30)),
                vol.Optional(
                    CONF_COLOUR_SERVICE_URL,
                    default=self.config_entry.options.get(
                        CONF_COLOUR_SERVICE_URL, COLOUR_SERVICE_URL_DEFAULT
                    ),
                ): str,
            }),
            description_placeholders={
                "default_url": COLOUR_SERVICE_URL_DEFAULT,
            },
        )
