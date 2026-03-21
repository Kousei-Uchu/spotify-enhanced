"""application_credentials platform for Spotify Enhanced.

By implementing this platform, Spotify Enhanced plugs into HA's built-in
OAuth2 credential management. The user enters their Client ID and Secret in
Settings → Application Credentials → Add, and HA handles storing them and
building the correct redirect URI automatically — no URL guessing needed.
"""
from homeassistant.components.application_credentials import AuthorizationServer

from .const import SPOTIFY_AUTH_URL, SPOTIFY_TOKEN_URL


async def async_get_authorization_server(hass) -> AuthorizationServer:
    """Return Spotify's OAuth2 endpoints."""
    return AuthorizationServer(
        authorize_url=SPOTIFY_AUTH_URL,
        token_url=SPOTIFY_TOKEN_URL,
    )
