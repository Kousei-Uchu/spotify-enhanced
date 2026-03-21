"""Browse media for Spotify Enhanced."""
from __future__ import annotations
import logging
from homeassistant.components.media_player import BrowseMedia, MediaClass, MediaType
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

ROOTS = [
    ("spotify://category/playlists",      "Playlists",         "mdi:playlist-music",  True),
    ("spotify://category/liked_songs",    "Liked Songs",       "mdi:heart",           False),
    ("spotify://category/recently_played","Recently Played",   "mdi:history",         False),
    ("spotify://category/top_tracks",     "Top Tracks",        "mdi:chart-bar",       False),
    ("spotify://category/top_artists",    "Top Artists",       "mdi:account-music",   True),
    ("spotify://category/new_releases",   "New Releases",      "mdi:new-box",         True),
    ("spotify://category/featured",       "Featured",          "mdi:star",            True),
    ("spotify://category/dj",             "Spotify DJ",        "mdi:robot",           False),
]


async def async_browse_media(hass: HomeAssistant, coordinator, media_content_type, media_content_id):
    if not media_content_id or media_content_id == "spotify://library":
        return _root()

    cid = media_content_id
    if cid.startswith("spotify://category/"):
        return await _category(coordinator, cid.split("/")[-1])
    if cid.startswith("spotify:playlist:"):
        return await _playlist(coordinator, cid.split(":")[-1])
    if cid.startswith("spotify:album:"):
        return await _album(coordinator, cid.split(":")[-1])
    if cid.startswith("spotify:artist:"):
        return await _artist(coordinator, cid.split(":")[-1])
    return _root()


def _root():
    children = [
        BrowseMedia(title=title, media_class=MediaClass.DIRECTORY,
                    media_content_id=cid, media_content_type=MediaType.MUSIC,
                    can_play=(cid == "spotify://category/dj"), can_expand=expandable)
        for cid, title, _, expandable in ROOTS
    ]
    return BrowseMedia(title="Spotify Enhanced", media_class=MediaClass.DIRECTORY,
                       media_content_id="spotify://library", media_content_type=MediaType.MUSIC,
                       can_play=False, can_expand=True, children=children)


async def _category(coordinator, category: str):
    api = coordinator.api
    children = []

    if category == "dj":
        return BrowseMedia(title="Spotify DJ", media_class=MediaClass.DIRECTORY,
                           media_content_id="spotify://category/dj", media_content_type=MediaType.MUSIC,
                           can_play=True, can_expand=False,
                           children=[BrowseMedia(title="▶ Start Spotify DJ", media_class=MediaClass.MUSIC,
                                                 media_content_id="spotify:genre:0JQ5DAt0tbjZptfcdMSKl3",
                                                 media_content_type=MediaType.MUSIC, can_play=True, can_expand=False)])

    titles = dict((c, t) for c, t, _, _ in ROOTS)

    if category == "playlists":
        r = await api.get_playlists(limit=50)
        for item in r.get("items", []):
            if item:
                children.append(BrowseMedia(title=item["name"], media_class=MediaClass.PLAYLIST,
                    media_content_id=item["uri"], media_content_type=MediaType.PLAYLIST,
                    can_play=True, can_expand=True,
                    thumbnail=(item.get("images") or [{}])[0].get("url")))

    elif category == "liked_songs":
        r = await api.get_saved_tracks(limit=50)
        for item in r.get("items", []):
            if item and item.get("track"):
                children.append(_track_node(item["track"]))

    elif category == "recently_played":
        r = await api.get_recently_played(limit=20)
        seen = set()
        for item in r.get("items", []):
            t = item.get("track")
            if t and t["id"] not in seen:
                seen.add(t["id"])
                children.append(_track_node(t))

    elif category == "top_tracks":
        r = await api.get_top_tracks(limit=20)
        for t in r.get("items", []):
            children.append(_track_node(t))

    elif category == "top_artists":
        r = await api.get_top_artists(limit=20)
        for a in r.get("items", []):
            children.append(BrowseMedia(title=a["name"], media_class=MediaClass.ARTIST,
                media_content_id=a["uri"], media_content_type=MediaType.ARTIST,
                can_play=True, can_expand=True,
                thumbnail=(a.get("images") or [{}])[0].get("url")))

    elif category == "new_releases":
        r = await api.get_new_releases(limit=20)
        for a in r.get("albums", {}).get("items", []):
            children.append(_album_node(a))

    elif category == "featured":
        r = await api.get_featured_playlists(limit=20)
        for p in r.get("playlists", {}).get("items", []):
            if p:
                children.append(BrowseMedia(title=p["name"], media_class=MediaClass.PLAYLIST,
                    media_content_id=p["uri"], media_content_type=MediaType.PLAYLIST,
                    can_play=True, can_expand=True,
                    thumbnail=(p.get("images") or [{}])[0].get("url")))

    title = titles.get(f"spotify://category/{category}", category.replace("_", " ").title())
    return BrowseMedia(title=title, media_class=MediaClass.DIRECTORY,
                       media_content_id=f"spotify://category/{category}", media_content_type=MediaType.MUSIC,
                       can_play=False, can_expand=True, children=children)


async def _playlist(coordinator, playlist_id):
    r = await coordinator.api.get_playlist_tracks(playlist_id, limit=50)
    children = [_track_node(i["track"]) for i in r.get("items", []) if i and i.get("track")]
    return BrowseMedia(title="Playlist", media_class=MediaClass.PLAYLIST,
                       media_content_id=f"spotify:playlist:{playlist_id}", media_content_type=MediaType.PLAYLIST,
                       can_play=True, can_expand=True, children=children)


async def _album(coordinator, album_id):
    album = await coordinator.api.get_album(album_id)
    imgs = album.get("images", [])
    thumb = imgs[0]["url"] if imgs else None
    children = [BrowseMedia(title=t["name"], media_class=MediaClass.TRACK,
                             media_content_id=t["uri"], media_content_type=MediaType.MUSIC,
                             can_play=True, can_expand=False, thumbnail=thumb)
                for t in album.get("tracks", {}).get("items", [])]
    return BrowseMedia(title=album.get("name", "Album"), media_class=MediaClass.ALBUM,
                       media_content_id=f"spotify:album:{album_id}", media_content_type=MediaType.ALBUM,
                       can_play=True, can_expand=True, thumbnail=thumb, children=children)


async def _artist(coordinator, artist_id):
    top = await coordinator.api.get_artist_top_tracks(artist_id)
    albums = await coordinator.api.get_artist_albums(artist_id, limit=10)
    children = [_track_node(t) for t in top.get("tracks", [])]
    children += [_album_node(a) for a in albums.get("items", [])]
    return BrowseMedia(title="Artist", media_class=MediaClass.ARTIST,
                       media_content_id=f"spotify:artist:{artist_id}", media_content_type=MediaType.ARTIST,
                       can_play=True, can_expand=True, children=children)


def _track_node(track):
    imgs = track.get("album", {}).get("images", [])
    artists = ", ".join(a["name"] for a in track.get("artists", []))
    return BrowseMedia(title=f"{track['name']} — {artists}", media_class=MediaClass.TRACK,
                       media_content_id=track["uri"], media_content_type=MediaType.MUSIC,
                       can_play=True, can_expand=False, thumbnail=imgs[0]["url"] if imgs else None)


def _album_node(album):
    imgs = album.get("images", [])
    return BrowseMedia(title=album["name"], media_class=MediaClass.ALBUM,
                       media_content_id=album["uri"], media_content_type=MediaType.ALBUM,
                       can_play=True, can_expand=True, thumbnail=imgs[0]["url"] if imgs else None)
