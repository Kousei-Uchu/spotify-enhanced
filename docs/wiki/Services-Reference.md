# Services Reference

All services are in the `spotify_enhanced` domain.

---

## play_uri

Play a Spotify URI.

```yaml
service: spotify_enhanced.play_uri
data:
  context_uri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"  # playlist/album/artist URI
  # OR
  track_uri:   ["spotify:track:4uLU6hMCjMI75M1A2tKUQC"]   # list of track URIs
  device_id: "abc123"     # optional — defaults to active device
  position_ms: 0          # optional — start position
```

---

## transfer_playback

Transfer playback to a different Spotify Connect device.

```yaml
service: spotify_enhanced.transfer_playback
data:
  device_id: "abc123"
```

---

## add_to_queue

Add a track to the playback queue.

```yaml
service: spotify_enhanced.add_to_queue
data:
  track_uri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC"
  device_id: "abc123"  # optional
```

---

## save_track / remove_track

Save or remove tracks from Liked Songs.

```yaml
service: spotify_enhanced.save_track
data:
  track_id: ["4uLU6hMCjMI75M1A2tKUQC"]

service: spotify_enhanced.remove_track
data:
  track_id: ["4uLU6hMCjMI75M1A2tKUQC"]
```

---

## seek

Seek to a position in the current track.

```yaml
service: spotify_enhanced.seek
data:
  position_ms: 30000   # 30 seconds
  device_id: "abc123"  # optional
```

---

## set_repeat

Set repeat mode.

```yaml
service: spotify_enhanced.set_repeat
data:
  repeat: "off"      # off / track / context
  device_id: "abc123"
```

---

## set_shuffle

Enable or disable shuffle.

```yaml
service: spotify_enhanced.set_shuffle
data:
  shuffle: true
  device_id: "abc123"
```

---

## follow_playlist / unfollow_playlist

Follow or unfollow a playlist.

```yaml
service: spotify_enhanced.follow_playlist
data:
  playlist_id: "37i9dQZF1DXcBWIGoYBM5M"
```

---

## resume_session

Resume the last cached playback session (up to 6 hours old).

```yaml
service: spotify_enhanced.resume_session
```

---

## search

Search Spotify and fire an event with results.

```yaml
service: spotify_enhanced.search
data:
  query: "Blinding Lights"
  search_type: ["track", "album"]
```

Results are fired as a `spotify_enhanced_search_results` event.
