"""Constants for Spotify Enhanced."""

DOMAIN = "spotify_enhanced"
MANUFACTURER = "Spotify AB"

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"

SCOPE = (
    "user-read-playback-state "
    "user-modify-playback-state "
    "user-read-currently-playing "
    "user-read-recently-played "
    "user-library-read "
    "user-library-modify "
    "playlist-read-private "
    "playlist-read-collaborative "
    "playlist-modify-private "
    "playlist-modify-public "
    "user-top-read "
    "streaming "
    "user-follow-read "
    "user-follow-modify"
)

# Config entry keys
CONF_CLIENT_ID = "client_id"
CONF_CLIENT_SECRET = "client_secret"
CONF_TOKEN_INFO = "token_info"

UPDATE_INTERVAL = 3


# Repeat modes (Spotify API values)
REPEAT_OFF = "off"
REPEAT_TRACK = "track"
REPEAT_CONTEXT = "context"

SEARCH_TYPES = ["track", "album", "artist", "playlist", "show", "episode"]

# Service names
SERVICE_PLAY_URI = "play_uri"
SERVICE_SEARCH = "search"
SERVICE_TRANSFER = "transfer_playback"
SERVICE_QUEUE_TRACK = "add_to_queue"
SERVICE_SAVE_TRACK = "save_track"
SERVICE_REMOVE_TRACK = "remove_track"
SERVICE_SEEK = "seek"
SERVICE_SET_REPEAT = "set_repeat"
SERVICE_SET_SHUFFLE = "set_shuffle"
SERVICE_FOLLOW_PLAYLIST = "follow_playlist"
SERVICE_UNFOLLOW_PLAYLIST = "unfollow_playlist"

# Attribute names
ATTR_DEVICE_ID = "device_id"
ATTR_CONTEXT_URI = "context_uri"
ATTR_TRACK_URI = "track_uri"
ATTR_POSITION_MS = "position_ms"
ATTR_QUERY = "query"
ATTR_SEARCH_TYPE = "search_type"
ATTR_SHUFFLE = "shuffle"
ATTR_REPEAT = "repeat"
ATTR_TRACK_ID = "track_id"
ATTR_PLAYLIST_ID = "playlist_id"