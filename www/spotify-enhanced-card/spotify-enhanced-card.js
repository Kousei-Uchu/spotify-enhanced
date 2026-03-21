/**
 * Spotify Enhanced Card  v2.0.0
 * Modelled after and extending the HA Media Control card.
 *
 * Cards exported:
 *   spotify-enhanced-card   – Full media deck (replaces old monolith)
 *   spotify-mini-card       – Slim single-row player
 *   spotify-device-card     – Device picker
 *   spotify-search-card     – Standalone search
 *   spotify-queue-card      – Queue / current playlist viewer
 */
const VERSION = "2.0.0";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (ms) => {
  if (ms == null || isNaN(ms)) return "0:00";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const round2 = (n) => Math.round(n * 100) / 100;

/** Inline SVG icon from an MDI path string */
const svg = (path, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" style="display:block;flex-shrink:0"><path d="${path}"/></svg>`;

// MDI paths used throughout
const I = {
  play:       "M8 5.14v14l11-7-11-7z",
  pause:      "M14 19h4V5h-4M6 19h4V5H6v14z",
  next:       "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
  prev:       "M6 6h2v12H6zm3.5 6 8.5 6V6l-8.5 6z",
  shuffle:    "M14.83 13.41 13.42 14.82l3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13zm.67-8.91L14.5 4H9l-2 2H4v2h16V6h-5l1-1.5zM14.83 10.59l3.13-3.13L20 9.5V4h-5.5l2.04 2.04-3.13 3.13 1.42 1.42zM4.5 10H4v10h2v-4h2v4h2V10H4.5zm3.5 4H6v-2h2v2z",
  repeat:     "M17 17H7v-3l-4 4 4 4v-3h12v-6h-2v4zM7 7h10v3l4-4-4-4v3H5v6h2V7z",
  repeat_one: "M13 15V9h-1l-2 1v1h1.5v4H13zm4 2H7v-3l-4 4 4 4v-3h12v-6h-2v4zM7 7h10v3l4-4-4-4v3H5v6h2V7z",
  heart:      "M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53L12 21.35z",
  heart_off:  "M23 7.1 21.6 5.7l-2.2 2.2-2.2-2.2-1.4 1.4 2.2 2.2-2.2 2.2 1.4 1.4 2.2-2.2 2.2 2.2L23 11.5 20.8 9.3 23 7.1zm-11 14.25-1.45-1.32C5.4 15.36 2 12.27 2 8.5c0-1.8.68-3.45 1.8-4.7L16.38 16.4c-.73.67-1.5 1.34-2.38 2.07L12 21.35z",
  vol_off:    "M16.5 12c0-1.77-1-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z",
  vol_lo:     "M18.5 12c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03zM5 9v6h4l5 5V4L9 9H5z",
  vol_hi:     "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z",
  cast:       "M1 18v3h3a3 3 0 0 0-3-3zm0-4v2a7 7 0 0 1 7 7h2c0-5-4-9-9-9zm0-4v2c6.07 0 11 4.93 11 11h2C14 15.93 8.07 10 1 10zm20-7H3C1.9 3 1 3.9 1 5v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
  search:     "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  queue:      "M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z",
  queue_music:"M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z",
  library:    "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
  chevron_r:  "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z",
  chevron_d:  "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z",
  close:      "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z",
  robot:      "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 16.5 13z",
  mic:        "M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V5a3 3 0 0 1 3-3m7 9c0 3.53-2.61 6.44-6 6.93V21h-2v-3.07c-3.39-.49-6-3.4-6-6.93h2a5 5 0 0 0 5 5 5 5 0 0 0 5-5h2z",
  more:       "M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  up:         "M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z",
  add_queue:  "M13 8H3V6h10v2zm0 4H3v-2h10v2zm4 4H3v-2h14v2zm-1 6v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3z",
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared CSS (HA variable-based, theme-aware)
// ─────────────────────────────────────────────────────────────────────────────

const baseCSS = (accent) => `
  :host {
    --se-accent: ${accent || "var(--primary-color, #6200ea)"};
    --se-bg: var(--card-background-color, #1c1c1e);
    --se-bg2: var(--secondary-background-color, #2c2c2e);
    --se-bg3: var(--divider-color, rgba(255,255,255,0.12));
    --se-txt: var(--primary-text-color, #fff);
    --se-txt2: var(--secondary-text-color, rgba(255,255,255,0.6));
    --se-r: var(--ha-card-border-radius, 12px);
    --se-shadow: var(--ha-card-box-shadow, none);
    display: block;
    height: 100%;
  }
  *, *::before, *::after { box-sizing: border-box; }
  ha-card {
    background: var(--se-bg);
    border-radius: var(--se-r);
    box-shadow: var(--se-shadow);
    color: var(--se-txt);
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  button {
    appearance: none; background: transparent; border: none;
    cursor: pointer; color: inherit; padding: 0; margin: 0;
    display: inline-flex; align-items: center; justify-content: center;
    transition: opacity 0.15s, transform 0.1s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  button:hover  { opacity: 0.8; }
  button:active { transform: scale(0.9); opacity: 0.7; }
  button.active { color: var(--se-accent); }
  button:disabled { opacity: 0.3; pointer-events: none; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// SpotifyBase – wires hass, entity state, common calls
// ─────────────────────────────────────────────────────────────────────────────

class SpotifyBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass   = null;
    this._ready  = false;
  }

  setConfig(config) {
    this._config = config;
    this._ready = false;
    this._build();
    this._ready = true;
    if (this._hass) this._update();
  }

  set hass(h) {
    this._hass = h;
    if (this._ready) this._update();
  }

  // State accessors
  get _stateObj()  { return this._hass?.states?.[this._config?.entity]; }
  get _attr()      { return this._stateObj?.attributes ?? {}; }
  get _state()     { return this._stateObj?.state ?? "idle"; }
  get _playing()   { return this._state === "playing"; }
  get _title()     { return this._attr.media_title ?? ""; }
  get _artist()    { return this._attr.media_artist ?? ""; }
  get _album()     { return this._attr.media_album_name ?? ""; }
  get _art()       { return this._attr.entity_picture ?? ""; }
  get _vol()       { return clamp((this._attr.volume_level ?? 0) * 100, 0, 100); }
  get _muted()     { return this._attr.is_volume_muted ?? false; }
  get _shuffle()   { return this._attr.shuffle ?? false; }
  get _repeat()    { return this._attr.repeat ?? "off"; }
  get _progMs()    { return (this._attr.media_position ?? 0) * 1000; }
  get _durMs()     { return (this._attr.media_duration ?? 0) * 1000; }
  get _devices()   { return this._attr.spotify_devices ?? []; }
  get _devId()     { return this._attr.device_id ?? null; }
  get _isDJ()      { return this._attr.is_dj ?? false; }
  get _trackId()   { return this._attr.track_id ?? null; }
  get _trackUri()  { return this._attr.track_uri ?? null; }
  get _ctxUri()    { return this._attr.context_uri ?? null; }

  /** Call a HA service */
  _call(domain, service, data = {}) {
    this._hass?.callService(domain, service, data);
  }

  /** Call a spotify_enhanced service */
  _spotify(service, data = {}) {
    this._call("spotify_enhanced", service, data);
  }

  /** Standard media_player call scoped to this entity */
  _mp(service, data = {}) {
    this._call("media_player", service, { entity_id: this._config.entity, ...data });
  }

  _build()  { /* override */ }
  _update() { /* override */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// ProgressController – smooth interpolated seek bar
// ─────────────────────────────────────────────────────────────────────────────

class ProgressController {
  constructor(fillEl, curEl, durEl, pct = 0) {
    this._fill = fillEl;
    this._cur  = curEl;
    this._dur  = durEl;
    this._ms   = 0;
    this._dur_ms = 0;
    this._ts   = 0;
    this._raf  = null;
    this._playing = false;
    // Track if user is dragging
    this._dragging = false;
    this._dragPct  = 0;
  }

  sync(progMs, durMs, playing) {
    if (this._dragging) return; // user has priority while dragging
    this._ms      = progMs;
    this._dur_ms  = durMs;
    this._playing = playing;
    this._ts      = performance.now();
    if (playing && !this._raf) this._tick();
    else if (!playing) { cancelAnimationFrame(this._raf); this._raf = null; this._render(progMs); }
  }

  _tick() {
    this._raf = requestAnimationFrame(() => {
      if (!this._playing || this._dragging) { this._raf = null; return; }
      const now = performance.now();
      const elapsed = now - this._ts;
      this._ts = now;
      this._ms = Math.min(this._ms + elapsed, this._dur_ms || 0);
      this._render(this._ms);
      this._tick();
    });
  }

  _render(ms) {
    const pct = this._dur_ms ? clamp((ms / this._dur_ms) * 100, 0, 100) : 0;
    if (this._fill) this._fill.style.width = `${pct}%`;
    if (this._cur)  this._cur.textContent  = fmt(ms);
    if (this._dur)  this._dur.textContent  = fmt(this._dur_ms);
  }

  startDrag(pct) {
    this._dragging = true;
    this._dragPct  = clamp(pct, 0, 1);
    this._render(this._dragPct * this._dur_ms);
  }

  moveDrag(pct) {
    if (!this._dragging) return;
    this._dragPct = clamp(pct, 0, 1);
    this._render(this._dragPct * this._dur_ms);
  }

  endDrag() {
    const pct = this._dragPct;
    this._dragging = false;
    this._ms = pct * this._dur_ms;
    this._ts = performance.now();
    if (this._playing) this._tick();
    return pct * this._dur_ms; // return ms to caller
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this._raf = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VolumeController – drag-priority volume slider
// ─────────────────────────────────────────────────────────────────────────────

class VolumeController {
  constructor(trackEl, fillEl, onChange) {
    this._track    = trackEl;
    this._fill     = fillEl;
    this._onChange = onChange; // (pct 0-1) => void
    this._pct      = 0;
    this._dragging = false;
    this._bound    = null;
    this._init();
  }

  _init() {
    const onStart = (e) => {
      this._dragging = true;
      this._move(e);
      const move = (e) => this._move(e);
      const up   = (e) => { this._dragging = false; this._move(e); this._onChange(this._pct); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerup",   up,   { once: true });
    };
    this._track?.addEventListener("pointerdown", onStart);
  }

  _move(e) {
    if (!this._track) return;
    const rect = this._track.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX ?? 0);
    this._pct = clamp((x - rect.left) / rect.width, 0, 1);
    this._render();
  }

  _render() {
    if (this._fill) this._fill.style.width = `${this._pct * 100}%`;
  }

  /** External sync (only when not dragging) */
  sync(pct) {
    if (this._dragging) return;
    this._pct = clamp(pct / 100, 0, 1);
    this._render();
  }

  destroy() {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Liked-songs tracker (toggle + update without full refresh)
// ─────────────────────────────────────────────────────────────────────────────

class LikeTracker {
  constructor() {
    this._liked   = new Set();
    this._unknown = new Set();
    this._loading = false;
    this._hass    = null;
    this._coord   = null; // set externally if available
  }

  setHass(hass) { this._hass = hass; }

  async check(trackId) {
    if (!trackId || this._liked.has(trackId) || this._loading) return;
    this._loading = true;
    try {
      // Call the REST API view we expose
      const tok = this._hass?.auth?.data?.access_token;
      if (!tok) return;
      const r = await fetch(`/api/spotify_enhanced/liked?ids=${trackId}`, {
        headers: { Authorization: `Bearer ${tok}` }
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.[0]) this._liked.add(trackId);
      }
    } catch {}
    finally { this._loading = false; }
  }

  isLiked(id) { return this._liked.has(id); }

  toggle(trackId, hass) {
    if (!trackId) return;
    if (this._liked.has(trackId)) {
      this._liked.delete(trackId);
      hass?.callService("spotify_enhanced", "remove_track", { track_id: [trackId] });
    } else {
      this._liked.add(trackId);
      hass?.callService("spotify_enhanced", "save_track", { track_id: [trackId] });
    }
    return this._liked.has(trackId);
  }
}

const globalLikeTracker = new LikeTracker();

// ─────────────────────────────────────────────────────────────────────────────
// Device list stabiliser – prevents jumping/re-ordering
// ─────────────────────────────────────────────────────────────────────────────

class DeviceStabiliser {
  constructor() {
    this._order = []; // stable ID ordering
  }

  stabilise(devices) {
    if (!devices?.length) { this._order = []; return []; }
    // Add new device IDs preserving existing order
    const ids = new Set(devices.map(d => d.id));
    // Remove gone devices
    this._order = this._order.filter(id => ids.has(id));
    // Add new ones at the end
    for (const d of devices) {
      if (!this._order.includes(d.id)) this._order.push(d.id);
    }
    // Return sorted by stable order
    const map = Object.fromEntries(devices.map(d => [d.id, d]));
    return this._order.map(id => map[id]).filter(Boolean);
  }
}

const globalDeviceStabiliser = new DeviceStabiliser();

// ─────────────────────────────────────────────────────────────────────────────
// Spotify Enhanced Card  (main full deck)
// ─────────────────────────────────────────────────────────────────────────────

class SpotifyEnhancedCard extends SpotifyBase {

  constructor() {
    super();
    this._prog   = null; // ProgressController
    this._vol    = null; // VolumeController
    this._djHold = null;
    this._djHoldActive = false;
    this._searchQuery   = "";
    this._searchResults = null;
    this._searchOffset  = { tracks: 0, albums: 0, artists: 0, playlists: 0 };
    this._libStack  = [];   // [{title,id}]
    this._libItems  = null; // null=not loaded, array=loaded
    this._libLoading= false;
    this._queueData = null;
    this._queueLoading = false;
    this._searchFocused = false; // preserve focus across renders
    this._lastTrackId = null;
  }

  static getConfigElement() { return document.createElement("spotify-enhanced-card-editor"); }

  static getStubConfig() {
    return { entity: "media_player.spotify_enhanced" };
  }

  setConfig(config) {
    // Defaults
    this._config = {
      show_seek:    true,
      show_volume:  true,
      show_shuffle: true,
      show_repeat:  true,
      accent_color: "",
      ...config,
    };
    this._ready = false;
    this._build();
    this._ready = true;
    if (this._hass) this._update();
  }

  disconnectedCallback() {
    this._prog?.destroy();
    clearTimeout(this._djHold);
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────

  _build() {
    const s = this.shadowRoot;
    s.innerHTML = `
      <style>
        ${baseCSS(this._config.accent_color)}

        /* === Layout mirrors HA media-control-card === */
        ha-card {
          position: relative;
          display: flex;
          flex-direction: column;
        }

        /* Art section – fills available space in panel mode */
        .art-section {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
          background: var(--se-bg2);
        }
        .art-img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
          transition: opacity 0.4s ease;
        }
        .art-gradient {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%);
          pointer-events: none;
        }
        /* When no art, make section a fixed height so the card isn't zero-height */
        .art-section.no-art {
          flex: 0 0 200px;
          background: linear-gradient(135deg, var(--se-bg2), var(--se-bg3));
        }
        .art-section.no-art .art-gradient { background: none; }

        /* Info overlay */
        .art-info {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 12px 16px 8px;
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 8px;
        }
        .art-info-text { flex: 1; min-width: 0; }
        .track-name {
          font-size: 1rem; font-weight: 600; line-height: 1.25;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          color: #fff;
        }
        .track-sub {
          font-size: 0.78rem; color: rgba(255,255,255,0.7); margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dj-pill {
          display: inline-flex; align-items: center; gap: 3px;
          background: var(--se-accent); color: #000;
          font-size: 0.58rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5px; padding: 2px 6px; border-radius: 20px;
          margin-bottom: 4px;
        }
        /* Like button top-right */
        .like-btn {
          position: absolute; top: 10px; right: 10px;
          background: rgba(0,0,0,0.35); border-radius: 50%;
          width: 36px; height: 36px;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          color: rgba(255,255,255,0.8);
        }
        .like-btn.liked { color: var(--se-accent); }

        /* Controls area (fixed height, never scrolls) */
        .controls-section {
          flex: 0 0 auto;
          background: var(--se-bg);
          padding: 0;
        }

        /* Seek bar – matches HA media-control-card style */
        .seek-wrap {
          padding: 8px 16px 2px;
          display: var(--seek-display, block);
        }
        .seek-track {
          position: relative; height: 4px; background: var(--se-bg3);
          border-radius: 2px; cursor: pointer; touch-action: none;
        }
        .seek-fill {
          position: absolute; left: 0; top: 0; height: 100%;
          background: var(--se-accent); border-radius: 2px;
          pointer-events: none;
          transition: width 0.1s linear;
        }
        .seek-thumb {
          position: absolute; top: 50%; right: 0;
          width: 12px; height: 12px; border-radius: 50%;
          background: var(--se-txt); transform: translate(50%,-50%);
          opacity: 0; transition: opacity 0.15s;
          pointer-events: none;
        }
        .seek-track:hover .seek-thumb,
        .seek-track.dragging .seek-thumb { opacity: 1; }
        .seek-track.dragging .seek-fill { transition: none; }
        .seek-times {
          display: flex; justify-content: space-between;
          font-size: 0.68rem; color: var(--se-txt2); margin-top: 3px;
        }

        /* Main control buttons row – HA media-card layout */
        .ctrl-row {
          display: flex; align-items: center; justify-content: center;
          gap: 0; padding: 6px 16px 4px;
        }
        .ctrl-btn {
          width: 44px; height: 44px; border-radius: 50%;
          color: var(--se-txt2);
          flex-shrink: 0;
        }
        .ctrl-btn:hover { background: var(--se-bg3); color: var(--se-txt); }
        .play-pause-btn {
          width: 52px; height: 52px; border-radius: 50%;
          background: var(--se-txt);
          color: var(--se-bg);
          margin: 0 4px;
        }
        .play-pause-btn:hover { background: var(--se-accent); color: #000; }
        .play-pause-btn:active { transform: scale(0.88); }
        .spacer { flex: 1; }

        /* Volume row */
        .vol-row {
          display: var(--vol-display, flex);
          align-items: center; gap: 6px;
          padding: 2px 16px 6px;
        }
        .vol-icon-btn { width: 28px; height: 28px; color: var(--se-txt2); flex-shrink: 0; }
        .vol-track {
          flex: 1; height: 4px; background: var(--se-bg3);
          border-radius: 2px; cursor: pointer; position: relative;
          touch-action: none;
        }
        .vol-fill {
          position: absolute; left: 0; top: 0; height: 100%;
          background: var(--se-txt2); border-radius: 2px;
          pointer-events: none;
        }
        .vol-thumb {
          position: absolute; top: 50%; right: 0;
          width: 12px; height: 12px; border-radius: 50%;
          background: var(--se-txt); transform: translate(50%,-50%);
          opacity: 0; transition: opacity 0.15s;
          pointer-events: none;
        }
        .vol-track:hover .vol-thumb { opacity: 1; }

        /* Action chips row (Library / Search / Devices / Queue) */
        .chips-row {
          display: flex; align-items: center; gap: 6px;
          padding: 2px 16px 10px; flex-wrap: nowrap; overflow-x: auto;
          scrollbar-width: none;
        }
        .chips-row::-webkit-scrollbar { display: none; }
        .chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 10px; border-radius: 16px;
          font-size: 0.72rem; font-weight: 600;
          background: var(--se-bg2); color: var(--se-txt2);
          white-space: nowrap; cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          height: 28px;
        }
        .chip:hover { background: var(--se-bg3); color: var(--se-txt); }
        .chip.active {
          background: color-mix(in srgb, var(--se-accent) 15%, transparent);
          color: var(--se-accent);
          border-color: color-mix(in srgb, var(--se-accent) 40%, transparent);
        }

        /* Slide-up panels */
        .panel-backdrop {
          display: none;
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 10;
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
        }
        .panel-backdrop.open { display: block; }

        .slide-panel {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: var(--se-bg);
          border-radius: var(--se-r) var(--se-r) 0 0;
          z-index: 11;
          transform: translateY(100%);
          transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
          max-height: 75%;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .slide-panel.open { transform: translateY(0); }

        .panel-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px 8px; flex-shrink: 0;
          border-bottom: 1px solid var(--se-bg3);
        }
        .panel-title {
          font-size: 0.82rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.7px; color: var(--se-txt2);
          display: flex; align-items: center; gap: 6px;
        }
        .panel-close {
          width: 30px; height: 30px; border-radius: 50%; color: var(--se-txt2);
        }
        .panel-close:hover { background: var(--se-bg3); color: var(--se-txt); }
        .panel-body {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          scrollbar-width: thin; scrollbar-color: var(--se-bg3) transparent;
        }
        .panel-body::-webkit-scrollbar { width: 3px; }
        .panel-body::-webkit-scrollbar-thumb { background: var(--se-bg3); }

        /* List items */
        .list-item {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 16px; cursor: pointer;
          transition: background 0.1s;
        }
        .list-item:hover { background: var(--se-bg2); }
        .list-item.playing { background: color-mix(in srgb, var(--se-accent) 10%, transparent); }
        .item-thumb {
          width: 40px; height: 40px; border-radius: 4px;
          object-fit: cover; flex-shrink: 0; background: var(--se-bg3);
        }
        .item-thumb.round { border-radius: 50%; }
        .item-placeholder {
          width: 40px; height: 40px; border-radius: 4px;
          background: var(--se-bg3); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: var(--se-txt2);
        }
        .item-info { flex: 1; min-width: 0; }
        .item-title {
          font-size: 0.85rem; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          color: var(--se-txt);
        }
        .item-sub {
          font-size: 0.72rem; color: var(--se-txt2); margin-top: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .item-action {
          width: 32px; height: 32px; border-radius: 50%;
          color: var(--se-txt2); flex-shrink: 0;
        }
        .item-action:hover { background: var(--se-bg3); color: var(--se-txt); }

        /* Section label */
        .sec-label {
          padding: 10px 16px 4px;
          font-size: 0.65rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.8px;
          color: var(--se-txt2);
        }

        /* Breadcrumb */
        .breadcrumb {
          display: flex; align-items: center; gap: 2px;
          padding: 8px 16px 4px; overflow-x: auto; scrollbar-width: none;
        }
        .breadcrumb::-webkit-scrollbar { display: none; }
        .crumb {
          font-size: 0.75rem; padding: 2px 6px; border-radius: 6px;
          color: var(--se-txt2); white-space: nowrap;
        }
        .crumb:hover { background: var(--se-bg2); color: var(--se-txt); }
        .crumb.last { color: var(--se-txt); font-weight: 600; }
        .crumb-sep { color: var(--se-bg3); font-size: 0.8rem; }

        /* Search */
        .search-bar {
          display: flex; gap: 6px; padding: 10px 16px 6px;
          flex-shrink: 0;
        }
        .search-input {
          flex: 1; background: var(--se-bg2);
          border: 1.5px solid var(--se-bg3); border-radius: 8px;
          color: var(--se-txt); padding: 7px 10px;
          font-size: 0.85rem; outline: none;
          transition: border-color 0.15s;
        }
        .search-input:focus { border-color: var(--se-accent); }
        .search-go {
          background: var(--se-accent) !important; color: #000 !important;
          border-radius: 8px; width: 36px; height: 36px;
        }
        .show-more {
          display: block; width: 100%;
          padding: 7px; text-align: center;
          font-size: 0.75rem; color: var(--se-accent);
          border-top: 1px solid var(--se-bg3);
          background: transparent;
        }
        .show-more:hover { background: var(--se-bg2); }

        /* Devices */
        .device-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 16px; cursor: pointer;
          transition: background 0.12s;
        }
        .device-item:hover { background: var(--se-bg2); }
        .device-item.active {
          background: color-mix(in srgb, var(--se-accent) 12%, transparent);
        }
        .device-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--se-txt2); flex-shrink: 0; }
        .device-name { flex: 1; font-size: 0.88rem; font-weight: 500; }
        .device-vol  { font-size: 0.75rem; color: var(--se-txt2); }
        .active-dot  { width: 7px; height: 7px; border-radius: 50%; background: var(--se-accent); flex-shrink: 0; }

        /* DJ panel (inside player) */
        .dj-section { padding: 8px 16px 10px; }
        .dj-row { display: flex; gap: 6px; }
        .dj-btn {
          flex: 1; padding: 8px; border-radius: 8px;
          font-size: 0.78rem; font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 5px;
          background: var(--se-bg2) !important; color: var(--se-txt);
        }
        .dj-btn-primary { background: var(--se-accent) !important; color: #000 !important; }
        .dj-skip-btn {
          width: 100%; padding: 9px; border-radius: 8px; margin-top: 6px;
          background: var(--se-bg2) !important; color: var(--se-txt);
          display: flex; align-items: center; justify-content: space-between;
          font-size: 0.82rem; font-weight: 600;
        }
        .dj-hint { font-size: 0.65rem; color: var(--se-txt2); text-align: right; line-height: 1.3; }
        .dj-req-wrap { display: none; margin-top: 6px; gap: 6px; }
        .dj-req-wrap.open { display: flex; }
        .dj-req-input {
          flex: 1; background: var(--se-bg2); border: 1.5px solid var(--se-bg3);
          border-radius: 8px; color: var(--se-txt); padding: 7px 10px;
          font-size: 0.82rem; outline: none; transition: border-color 0.15s;
        }
        .dj-req-input:focus { border-color: var(--se-accent); }
        .dj-req-btn {
          background: var(--se-accent) !important; color: #000 !important;
          border-radius: 8px; padding: 7px 10px; font-size: 0.8rem; font-weight: 700;
        }

        /* Queue */
        .queue-now {
          padding: 10px 16px 6px;
          font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.8px; color: var(--se-accent);
        }

        /* Empty / loading */
        .empty   { text-align: center; padding: 28px 16px; color: var(--se-txt2); font-size: 0.82rem; line-height: 1.5; }
        .loading { text-align: center; padding: 20px; color: var(--se-txt2); font-size: 0.8rem; }
      </style>

      <ha-card>
        <!-- Art section -->
        <div class="art-section" id="art-section">
          <img class="art-img" id="art" src="" alt="" />
          <div class="art-gradient"></div>
          <div class="art-info">
            <div class="art-info-text">
              <div id="dj-pill" class="dj-pill" style="display:none">${svg(I.robot,11)} DJ</div>
              <div class="track-name" id="track-name">Nothing playing</div>
              <div class="track-sub"  id="track-sub"></div>
            </div>
          </div>
          <button class="like-btn" id="like-btn" title="Save / unsave"></button>
        </div>

        <!-- Controls section (fixed) -->
        <div class="controls-section">

          <!-- Seek bar -->
          <div class="seek-wrap" id="seek-wrap">
            <div class="seek-track" id="seek-track">
              <div class="seek-fill"  id="seek-fill"></div>
              <div class="seek-thumb" id="seek-thumb"></div>
            </div>
            <div class="seek-times">
              <span id="prog-cur">0:00</span>
              <span id="prog-dur">0:00</span>
            </div>
          </div>

          <!-- Main controls -->
          <div class="ctrl-row">
            <button class="ctrl-btn" id="shuffle-btn" title="Shuffle"></button>
            <div class="spacer"></div>
            <button class="ctrl-btn" id="prev-btn"   title="Previous">${svg(I.prev,24)}</button>
            <button class="play-pause-btn" id="play-btn" title="Play / Pause"></button>
            <button class="ctrl-btn" id="next-btn"   title="Next">${svg(I.next,24)}</button>
            <div class="spacer"></div>
            <button class="ctrl-btn" id="repeat-btn" title="Repeat"></button>
          </div>

          <!-- Volume -->
          <div class="vol-row" id="vol-row">
            <button class="vol-icon-btn" id="mute-btn"></button>
            <div class="vol-track" id="vol-track">
              <div class="vol-fill"  id="vol-fill"></div>
              <div class="vol-thumb"></div>
            </div>
          </div>

          <!-- Action chips -->
          <div class="chips-row">
            <div class="chip" id="chip-dj">${svg(I.robot,13)}&nbsp;DJ</div>
            <div class="chip" id="chip-lib">${svg(I.library,13)}&nbsp;Library</div>
            <div class="chip" id="chip-search">${svg(I.search,13)}&nbsp;Search</div>
            <div class="chip" id="chip-queue">${svg(I.queue_music,13)}&nbsp;Queue</div>
            <div class="chip" id="chip-devices">${svg(I.cast,13)}&nbsp;Devices</div>
          </div>
        </div>

        <!-- Panel backdrop -->
        <div class="panel-backdrop" id="backdrop"></div>

        <!-- DJ Panel -->
        <div class="slide-panel" id="panel-dj">
          <div class="panel-header">
            <div class="panel-title">${svg(I.robot,15)}&nbsp;Spotify DJ</div>
            <button class="panel-close" id="close-dj">${svg(I.close,18)}</button>
          </div>
          <div class="panel-body">
            <div class="dj-section">
              <div class="dj-row">
                <button class="dj-btn dj-btn-primary" id="dj-start">${svg(I.play,14)}&nbsp;Start DJ</button>
              </div>
              <button class="dj-skip-btn" id="dj-skip-hold">
                <span style="display:flex;align-items:center;gap:6px">${svg(I.next,18)}&nbsp;Skip Section</span>
                <span class="dj-hint">Tap: skip<br>Hold: request</span>
              </button>
              <div class="dj-req-wrap" id="dj-req-wrap">
                <input class="dj-req-input" id="dj-req-input" placeholder="Request something…" />
                <button class="dj-req-btn" id="dj-req-btn">${svg(I.mic,16)}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Library Panel -->
        <div class="slide-panel" id="panel-lib">
          <div class="panel-header">
            <div class="panel-title" id="lib-title">${svg(I.library,15)}&nbsp;Library</div>
            <button class="panel-close" id="close-lib">${svg(I.close,18)}</button>
          </div>
          <div class="panel-body" id="lib-body">
            <div class="loading">Loading…</div>
          </div>
        </div>

        <!-- Search Panel -->
        <div class="slide-panel" id="panel-search">
          <div class="panel-header">
            <div class="panel-title">${svg(I.search,15)}&nbsp;Search</div>
            <button class="panel-close" id="close-search">${svg(I.close,18)}</button>
          </div>
          <div class="search-bar">
            <input class="search-input" id="search-input" placeholder="Search Spotify…" />
            <button class="search-go" id="search-go">${svg(I.search,16)}</button>
          </div>
          <div class="panel-body" id="search-body"></div>
        </div>

        <!-- Queue Panel -->
        <div class="slide-panel" id="panel-queue">
          <div class="panel-header">
            <div class="panel-title">${svg(I.queue_music,15)}&nbsp;Queue</div>
            <button class="panel-close" id="close-queue">${svg(I.close,18)}</button>
          </div>
          <div class="panel-body" id="queue-body">
            <div class="loading">Loading…</div>
          </div>
        </div>

        <!-- Devices Panel -->
        <div class="slide-panel" id="panel-devices">
          <div class="panel-header">
            <div class="panel-title">${svg(I.cast,15)}&nbsp;Devices</div>
            <button class="panel-close" id="close-devices">${svg(I.close,18)}</button>
          </div>
          <div class="panel-body" id="devices-body">
            <div class="loading">Loading…</div>
          </div>
        </div>
      </ha-card>
    `;

    this._bindStaticEvents();

    // Init progress controller
    this._prog = new ProgressController(
      s.getElementById("seek-fill"),
      s.getElementById("prog-cur"),
      s.getElementById("prog-dur"),
    );
    this._bindSeek();

    // Init volume controller
    this._volCtrl = new VolumeController(
      s.getElementById("vol-track"),
      s.getElementById("vol-fill"),
      (pct) => {
        // volume_level must be float 0-1 with 2dp
        this._mp("volume_set", { volume_level: round2(pct) });
      }
    );

    // Liked songs
    globalLikeTracker.setHass(this._hass);
  }

  // ── Static event bindings ────────────────────────────────────────────────

  _bindStaticEvents() {
    const s = this.shadowRoot;
    const eid = () => this._config.entity;

    // Play/Pause
    s.getElementById("play-btn").addEventListener("click", () => {
      this._mp(this._playing ? "media_pause" : "media_play");
    });

    // Prev / Next
    s.getElementById("prev-btn").addEventListener("click", () => this._mp("media_previous_track"));
    s.getElementById("next-btn").addEventListener("click", () => this._mp("media_next_track"));

    // Shuffle
    s.getElementById("shuffle-btn").addEventListener("click", () =>
      this._mp("shuffle_set", { shuffle: !this._shuffle })
    );

    // Repeat cycle: off → all → one → off
    s.getElementById("repeat-btn").addEventListener("click", () => {
      const next = { off: "all", all: "one", one: "off" }[this._repeat] ?? "off";
      this._mp("repeat_set", { repeat: next });
    });

    // Mute
    s.getElementById("mute-btn").addEventListener("click", () =>
      this._mp("volume_mute", { is_volume_muted: !this._muted })
    );

    // Like / unlike (toggle)
    s.getElementById("like-btn").addEventListener("click", () => {
      const liked = globalLikeTracker.toggle(this._trackId, this._hass);
      this._updateLikeBtn(liked);
    });

    // Chips → open panels
    const panels = { dj: "panel-dj", lib: "panel-lib", search: "panel-search", queue: "panel-queue", devices: "panel-devices" };
    for (const [chip, panel] of Object.entries(panels)) {
      s.getElementById(`chip-${chip}`).addEventListener("click", () => this._openPanel(panel, chip));
    }

    // Panel close buttons + backdrop
    const closeIds = { "close-dj": "dj", "close-lib": "lib", "close-search": "search", "close-queue": "queue", "close-devices": "devices" };
    for (const [btnId, chip] of Object.entries(closeIds)) {
      s.getElementById(btnId)?.addEventListener("click", () => this._closePanel(chip));
    }
    s.getElementById("backdrop").addEventListener("click", () => this._closeAll());

    // DJ events
    this._bindDJEvents();

    // Search events
    this._bindSearchEvents();

    // Library events (root items are static, child items are bound after render)
    this._renderLibRoot();
  }

  // ── Panel management ────────────────────────────────────────────────────

  _openPanel(panelId, chipId) {
    const s = this.shadowRoot;
    // Close all others first
    this._closeAll(false);

    s.getElementById("backdrop").classList.add("open");
    s.getElementById(panelId)?.classList.add("open");
    s.getElementById(`chip-${chipId}`)?.classList.add("active");

    // Load dynamic content
    if (panelId === "panel-queue")   this._loadQueue();
    if (panelId === "panel-devices") this._renderDevices();
    if (panelId === "panel-search")  {
      // restore focus if the user had it
      requestAnimationFrame(() => {
        const inp = s.getElementById("search-input");
        if (inp && this._searchFocused) inp.focus();
      });
    }
  }

  _closePanel(chipId) {
    const s = this.shadowRoot;
    const map = { dj: "panel-dj", lib: "panel-lib", search: "panel-search", queue: "panel-queue", devices: "panel-devices" };
    s.getElementById(map[chipId])?.classList.remove("open");
    s.getElementById(`chip-${chipId}`)?.classList.remove("active");
    const anyOpen = Object.values(map).some(p => s.getElementById(p)?.classList.contains("open"));
    if (!anyOpen) s.getElementById("backdrop").classList.remove("open");
  }

  _closeAll(andBackdrop = true) {
    const s = this.shadowRoot;
    const panels = ["panel-dj", "panel-lib", "panel-search", "panel-queue", "panel-devices"];
    panels.forEach(p => s.getElementById(p)?.classList.remove("open"));
    const chips = ["chip-dj", "chip-lib", "chip-search", "chip-queue", "chip-devices"];
    chips.forEach(c => s.getElementById(c)?.classList.remove("active"));
    if (andBackdrop) s.getElementById("backdrop").classList.remove("open");
  }

  // ── Seek binding ────────────────────────────────────────────────────────

  _bindSeek() {
    const s = this.shadowRoot;
    const track = s.getElementById("seek-track");
    if (!track) return;

    const getPct = (e) => {
      const r = track.getBoundingClientRect();
      return clamp(((e.clientX ?? e.touches?.[0]?.clientX ?? 0) - r.left) / r.width, 0, 1);
    };

    track.addEventListener("pointerdown", (e) => {
      track.classList.add("dragging");
      this._prog.startDrag(getPct(e));

      const move = (e) => this._prog.moveDrag(getPct(e));
      const up   = (e) => {
        track.classList.remove("dragging");
        const ms = this._prog.endDrag();
        this._mp("media_seek", { seek_position: round2(ms / 1000) });
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup",   up);
      };
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerup",   up,   { once: true });
    });
  }

  // ── DJ events ───────────────────────────────────────────────────────────

  _bindDJEvents() {
    const s = this.shadowRoot;
    s.getElementById("dj-start")?.addEventListener("click", () => this._spotify("start_dj"));

    const skipBtn = s.getElementById("dj-skip-hold");
    if (skipBtn) {
      skipBtn.addEventListener("pointerdown", () => {
        this._djHoldActive = false;
        this._djHold = setTimeout(() => {
          this._djHoldActive = true;
          s.getElementById("dj-req-wrap")?.classList.add("open");
          s.getElementById("dj-req-input")?.focus();
        }, 500);
      });
      skipBtn.addEventListener("pointerup", () => {
        clearTimeout(this._djHold);
        if (!this._djHoldActive) this._spotify("dj_next_section");
      });
      skipBtn.addEventListener("pointerleave", () => clearTimeout(this._djHold));
    }

    s.getElementById("dj-req-btn")?.addEventListener("click", () => {
      const val = s.getElementById("dj-req-input")?.value?.trim();
      if (val) {
        this._spotify("dj_request", { request_text: val });
        s.getElementById("dj-req-input").value = "";
        s.getElementById("dj-req-wrap")?.classList.remove("open");
      }
    });
    s.getElementById("dj-req-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter")  s.getElementById("dj-req-btn")?.click();
      if (e.key === "Escape") s.getElementById("dj-req-wrap")?.classList.remove("open");
    });
  }

  // ── Search ───────────────────────────────────────────────────────────────

  _bindSearchEvents() {
    const s = this.shadowRoot;
    const inp = s.getElementById("search-input");
    if (!inp) return;

    inp.addEventListener("focus", () => { this._searchFocused = true; });
    inp.addEventListener("blur",  () => { this._searchFocused = false; });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") this._doSearch(); });
    s.getElementById("search-go")?.addEventListener("click", () => this._doSearch());
  }

  async _doSearch(append = false) {
    const s = this.shadowRoot;
    const inp = s.getElementById("search-input");
    const q = inp?.value?.trim();
    if (!q) return;

    if (!append || q !== this._searchQuery) {
      this._searchQuery = q;
      this._searchResults = null;
      this._searchOffset = { tracks: 0, albums: 0, artists: 0, playlists: 0 };
    }

    const body = s.getElementById("search-body");
    if (body && !append) body.innerHTML = `<div class="loading">Searching…</div>`;

    try {
      const tok = this._hass?.auth?.data?.access_token;
      const url = `/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
      if (r.ok) {
        const data = await r.json();
        if (!append) {
          this._searchResults = data;
        } else {
          // Merge new results into existing
          if (!this._searchResults) this._searchResults = data;
          else {
            for (const key of ["tracks","albums","artists","playlists"]) {
              if (data[key]?.items) {
                this._searchResults[key] = this._searchResults[key] ?? { items: [] };
                this._searchResults[key].items = [...(this._searchResults[key].items||[]), ...data[key].items];
              }
            }
          }
        }
        this._renderSearchResults();
      }
    } catch (e) {
      if (body) body.innerHTML = `<div class="empty">Search failed. Try again.</div>`;
    }
  }

  _renderSearchResults() {
    const s   = this.shadowRoot;
    const body = s.getElementById("search-body");
    if (!body || !this._searchResults) return;

    const r = this._searchResults;
    let html = "";

    const track = (t) => `
      <div class="list-item" data-play="${t.uri}" data-type="track">
        <img class="item-thumb" src="${t.album?.images?.[0]?.url || ""}" alt="" />
        <div class="item-info">
          <div class="item-title">${t.name}</div>
          <div class="item-sub">${(t.artists||[]).map(a=>a.name).join(", ")}</div>
        </div>
        <button class="item-action" data-queue="${t.uri}" title="Add to queue">${svg(I.add_queue,16)}</button>
      </div>`;
    const album = (a) => `
      <div class="list-item" data-play="${a.uri}" data-type="album">
        <img class="item-thumb" src="${a.images?.[0]?.url || ""}" alt="" />
        <div class="item-info">
          <div class="item-title">${a.name}</div>
          <div class="item-sub">${(a.artists||[]).map(x=>x.name).join(", ")}</div>
        </div>
      </div>`;
    const artist = (a) => `
      <div class="list-item" data-play="${a.uri}" data-type="artist">
        <img class="item-thumb round" src="${a.images?.[0]?.url || ""}" alt="" />
        <div class="item-info">
          <div class="item-title">${a.name}</div>
          <div class="item-sub">Artist · ${(a.followers?.total||0).toLocaleString()} followers</div>
        </div>
      </div>`;
    const playlist = (p) => `
      <div class="list-item" data-play="${p.uri}" data-type="playlist">
        <img class="item-thumb" src="${p.images?.[0]?.url || ""}" alt="" />
        <div class="item-info">
          <div class="item-title">${p.name}</div>
          <div class="item-sub">Playlist · ${p.owner?.display_name||""}</div>
        </div>
      </div>`;

    const section = (label, items, renderFn, total, type) => {
      if (!items?.length) return "";
      const moreBtn = (total > items.length) ? `<button class="show-more" data-more="${type}">Show more ${label.toLowerCase()}</button>` : "";
      return `<div class="sec-label">${label}</div>${items.map(renderFn).join("")}${moreBtn}`;
    };

    html += section("Tracks",    r.tracks?.items,    track,    r.tracks?.total,    "tracks");
    html += section("Albums",    r.albums?.items?.slice(0,5),    album,    r.albums?.total,    "albums");
    html += section("Artists",   r.artists?.items?.slice(0,5),   artist,   r.artists?.total,   "artists");
    html += section("Playlists", r.playlists?.items?.slice(0,5), playlist, r.playlists?.total, "playlists");

    if (!html) html = `<div class="empty">No results found.</div>`;
    body.innerHTML = html;

    // Bind results events
    body.querySelectorAll(".list-item[data-play]").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-queue]")) return;
        const uri = el.dataset.play;
        if (uri.startsWith("spotify:track:") || uri.startsWith("spotify:episode:")) {
          this._mp("play_media", { media_content_id: uri, media_content_type: "music" });
        } else {
          this._mp("play_media", { media_content_id: uri, media_content_type: "music" });
        }
      });
    });
    body.querySelectorAll("[data-queue]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._spotify("add_to_queue", { track_uri: btn.dataset.queue });
      });
    });
    body.querySelectorAll("[data-more]").forEach(btn => {
      btn.addEventListener("click", () => {
        // Expand that section (show all current items, not a new API call for simplicity)
        const type = btn.dataset.more; // e.g. "albums"
        const key  = type; // tracks/albums/artists/playlists
        if (this._searchResults?.[key]) {
          this._searchResults[key]._showAll = true;
          this._renderSearchResults();
        }
      });
    });

    // Restore search input focus
    const inp = s.getElementById("search-input");
    if (inp && this._searchFocused) {
      requestAnimationFrame(() => inp.focus());
    }
  }

  // ── Library ───────────────────────────────────────────────────────────────

  _renderLibRoot() {
    const roots = [
      ["spotify://category/playlists",       svg(I.library,18), "Playlists",       true],
      ["spotify://category/liked_songs",     svg(I.heart,18),   "Liked Songs",     false],
      ["spotify://category/recently_played", svg(I.queue,18),   "Recently Played", false],
      ["spotify://category/top_tracks",      svg(I.queue,18),   "Top Tracks",      false],
      ["spotify://category/top_artists",     svg(I.mic,18),     "Top Artists",     true],
      ["spotify://category/new_releases",    svg(I.library,18), "New Releases",    true],
      ["spotify://category/featured",        svg(I.library,18), "Featured",        true],
    ];

    const body = this.shadowRoot.getElementById("lib-body");
    if (!body) return;

    body.innerHTML = roots.map(([id, ico, title, expandable]) => `
      <div class="list-item" data-id="${id}" data-expand="${expandable}" data-title="${title}">
        <div class="item-placeholder">${ico}</div>
        <div class="item-info"><div class="item-title">${title}</div></div>
        ${svg(I.chevron_r,16)}
      </div>
    `).join("");

    this._bindLibItems(body);
    this._libStack = [];
    this._updateLibHeader();
  }

  _bindLibItems(container) {
    container.querySelectorAll(".list-item[data-id]").forEach(el => {
      el.addEventListener("click", async () => {
        const { id, expand, title } = el.dataset;
        if (expand === "true") {
          // Navigate into
          this._libStack.push({ title, id });
          this._updateLibHeader();
          await this._browseLib(id);
        } else {
          this._mp("play_media", { media_content_id: id, media_content_type: "music" });
          this._closeAll();
        }
      });
    });

    container.querySelectorAll("[data-queue]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._spotify("add_to_queue", { track_uri: btn.dataset.queue });
      });
    });
  }

  async _browseLib(id) {
    const body = this.shadowRoot.getElementById("lib-body");
    if (!body) return;
    body.innerHTML = `<div class="loading">Loading…</div>`;
    try {
      const r = await this._hass.callWS({
        type: "media_player/browse_media",
        entity_id: this._config.entity,
        media_content_id: id,
        media_content_type: "music",
      });
      const items = r.children || [];
      body.innerHTML = items.map(item => {
        const thumb = item.thumbnail
          ? `<img class="item-thumb${item.media_class==="artist" ? " round" : ""}" src="${item.thumbnail}" alt="" />`
          : `<div class="item-placeholder">${svg(I.library,16)}</div>`;
        const queueBtn = item.can_play && !item.can_expand
          ? `<button class="item-action" data-queue="${item.media_content_id}" title="Add to queue">${svg(I.add_queue,16)}</button>`
          : (item.can_expand ? svg(I.chevron_r,16) : "");
        return `
          <div class="list-item"
            data-id="${item.media_content_id}"
            data-expand="${item.can_expand}"
            data-play="${item.can_play}"
            data-title="${(item.title||"").replace(/"/g,"&quot;")}">
            ${thumb}
            <div class="item-info">
              <div class="item-title">${item.title||""}</div>
              ${item.media_class ? `<div class="item-sub">${item.media_class}</div>` : ""}
            </div>
            ${queueBtn}
          </div>`;
      }).join("") || `<div class="empty">Nothing here.</div>`;

      this._bindLibItems(body);
    } catch {
      body.innerHTML = `<div class="empty">Could not load. Try again.</div>`;
    }
  }

  _updateLibHeader() {
    const s = this.shadowRoot;
    const title = s.getElementById("lib-title");
    if (!title) return;

    if (this._libStack.length === 0) {
      title.innerHTML = `${svg(I.library,15)}&nbsp;Library`;
      return;
    }

    // Show breadcrumb with back navigation
    const crumbs = [
      `<button class="crumb" data-nav="-1">Library</button>`,
      ...this._libStack.map((p, i) =>
        `<span class="crumb-sep">›</span>
         <button class="crumb${i===this._libStack.length-1?" last":""}" data-nav="${i}">${p.title}</button>`
      ),
    ].join("");

    title.innerHTML = `<div style="display:flex;align-items:center;flex-wrap:nowrap;gap:2px;overflow:hidden">${crumbs}</div>`;

    title.querySelectorAll(".crumb[data-nav]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const nav = parseInt(btn.dataset.nav);
        if (nav === -1) {
          this._libStack = [];
          this._renderLibRoot();
        } else {
          const target = this._libStack[nav];
          this._libStack = this._libStack.slice(0, nav);
          this._updateLibHeader();
          await this._browseLib(target.id);
        }
      });
    });
  }

  // ── Queue ─────────────────────────────────────────────────────────────────

  async _loadQueue() {
    const body = this.shadowRoot.getElementById("queue-body");
    if (!body) return;
    body.innerHTML = `<div class="loading">Loading queue…</div>`;
    try {
      const tok = this._hass?.auth?.data?.access_token;
      const r = await fetch("/api/spotify_enhanced/queue", {
        headers: { Authorization: `Bearer ${tok}` }
      });
      if (!r.ok) throw new Error("No queue data");
      const data = await r.json();
      this._renderQueue(body, data);
    } catch {
      body.innerHTML = `<div class="empty">Queue unavailable.<br>Start playback to see the queue.</div>`;
    }
  }

  _renderQueue(body, data) {
    if (!data) { body.innerHTML = `<div class="empty">Queue empty.</div>`; return; }
    const current = data.currently_playing;
    const queue   = data.queue || [];
    let html = "";

    if (current) {
      html += `<div class="queue-now">Now Playing</div>`;
      html += this._queueItem(current, true);
    }
    if (queue.length) {
      html += `<div class="sec-label">Next Up</div>`;
      html += queue.slice(0,30).map(t => this._queueItem(t)).join("");
    }
    if (!html) html = `<div class="empty">Queue is empty.</div>`;
    body.innerHTML = html;

    body.querySelectorAll(".list-item[data-play]").forEach(el => {
      el.addEventListener("click", () =>
        this._mp("play_media", { media_content_id: el.dataset.play, media_content_type: "music" })
      );
    });
  }

  _queueItem(track, isCurrent = false) {
    const imgs = track.album?.images || [];
    const artists = (track.artists||[]).map(a=>a.name).join(", ");
    return `
      <div class="list-item${isCurrent?" playing":""}" data-play="${track.uri}">
        <img class="item-thumb" src="${imgs[0]?.url||""}" alt="" />
        <div class="item-info">
          <div class="item-title">${track.name}</div>
          <div class="item-sub">${artists}</div>
        </div>
        <span style="font-size:0.7rem;color:var(--se-txt2)">${fmt(track.duration_ms)}</span>
      </div>`;
  }

  // ── Devices ───────────────────────────────────────────────────────────────

  _renderDevices() {
    const body = this.shadowRoot.getElementById("devices-body");
    if (!body) return;
    const devices = globalDeviceStabiliser.stabilise(this._devices);

    if (!devices.length) {
      body.innerHTML = `<div class="empty">No Spotify Connect devices found.<br>Open Spotify on a device to see it here.</div>`;
      return;
    }

    body.innerHTML = devices.map(d => `
      <div class="device-item${d.id===this._devId?" active":""}" data-id="${d.id}">
        <div class="device-icon">${svg(I.cast,20)}</div>
        <div class="device-name">${d.name}</div>
        ${d.volume_percent!=null ? `<span class="device-vol">${d.volume_percent}%</span>` : ""}
        ${d.id===this._devId ? `<div class="active-dot"></div>` : ""}
      </div>
    `).join("");

    body.querySelectorAll(".device-item[data-id]").forEach(el =>
      el.addEventListener("click", () => this._spotify("transfer_playback", { device_id: el.dataset.id }))
    );
  }

  // ── Update / render loop ─────────────────────────────────────────────────

  _update() {
    const s = this.shadowRoot;
    if (!s.getElementById("art")) return;

    globalLikeTracker.setHass(this._hass);

    // --- Art ---
    const art = s.getElementById("art");
    const artSection = s.getElementById("art-section");
    if (this._art) {
      art.src = this._art;
      artSection.classList.remove("no-art");
      art.style.display = "block";
    } else {
      art.style.display = "none";
      artSection.classList.add("no-art");
    }

    // --- Track info ---
    s.getElementById("track-name").textContent = this._title || "Nothing playing";
    const sub = [this._artist, this._album].filter(Boolean).join(" · ");
    s.getElementById("track-sub").textContent = sub;
    s.getElementById("dj-pill").style.display = this._isDJ ? "inline-flex" : "none";

    // --- Play button ---
    s.getElementById("play-btn").innerHTML = svg(this._playing ? I.pause : I.play, 26);

    // --- Shuffle / repeat ---
    const shuf = s.getElementById("shuffle-btn");
    shuf.innerHTML = svg(I.shuffle, 22);
    shuf.classList.toggle("active", this._shuffle);
    shuf.style.visibility = this._config.show_shuffle !== false ? "visible" : "hidden";

    const rep = s.getElementById("repeat-btn");
    rep.innerHTML = svg(this._repeat === "one" ? I.repeat_one : I.repeat, 22);
    rep.classList.toggle("active", this._repeat !== "off");
    rep.style.visibility = this._config.show_repeat !== false ? "visible" : "hidden";

    // --- Seek ---
    s.getElementById("seek-wrap").style.display = this._config.show_seek !== false ? "block" : "none";
    this._prog.sync(this._progMs, this._durMs, this._playing);

    // --- Volume ---
    s.getElementById("vol-row").style.display = this._config.show_volume !== false ? "flex" : "none";
    s.getElementById("mute-btn").innerHTML = svg(this._muted ? I.vol_off : (this._vol > 50 ? I.vol_hi : I.vol_lo), 20);
    this._volCtrl.sync(this._muted ? 0 : this._vol);

    // --- Like button ---
    // Check liked status when track changes
    if (this._trackId && this._trackId !== this._lastTrackId) {
      this._lastTrackId = this._trackId;
      globalLikeTracker.check(this._trackId).then(() => {
        this._updateLikeBtn(globalLikeTracker.isLiked(this._trackId));
      });
    }
    this._updateLikeBtn(globalLikeTracker.isLiked(this._trackId));

    // --- Keep devices panel live if open ---
    if (s.getElementById("panel-devices")?.classList.contains("open")) {
      this._renderDevices();
    }
  }

  _updateLikeBtn(liked) {
    const btn = this.shadowRoot.getElementById("like-btn");
    if (!btn) return;
    btn.innerHTML = svg(liked ? I.heart : I.heart_off, 18);
    btn.classList.toggle("liked", liked);
    btn.title = liked ? "Remove from Liked Songs" : "Save to Liked Songs";
  }
}

customElements.define("spotify-enhanced-card", SpotifyEnhancedCard);

// ─────────────────────────────────────────────────────────────────────────────
// Mini Card
// ─────────────────────────────────────────────────────────────────────────────

class SpotifyMiniCard extends SpotifyBase {
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(config) {
    this._config = { show_volume: true, ...config };
    this._ready = false;
    this._build();
    this._ready = true;
    if (this._hass) this._update();
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseCSS(this._config.accent_color)}
        ha-card {
          display: flex; align-items: center; padding: 10px 12px; gap: 10px;
          flex-direction: row; height: auto;
        }
        img { width: 46px; height: 46px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: var(--se-bg2); }
        .info { flex: 1; min-width: 0; }
        .t { font-size: 0.87rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .a { font-size: 0.73rem; color: var(--se-txt2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
        .vol-row { display: flex; align-items: center; gap: 4px; margin-top: 5px; }
        .vol-track { flex: 1; height: 3px; background: var(--se-bg3); border-radius: 2px; position: relative; cursor: pointer; touch-action: none; }
        .vol-fill { position: absolute; left: 0; top: 0; height: 100%; background: var(--se-txt2); border-radius: 2px; pointer-events: none; }
        .ctrls { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
        .cb { width: 32px; height: 32px; border-radius: 50%; color: var(--se-txt2); }
        .cb:hover { background: var(--se-bg3); color: var(--se-txt); }
        .pb { width: 40px; height: 40px; border-radius: 50%; background: var(--se-txt) !important; color: var(--se-bg) !important; }
        .pb:hover { background: var(--se-accent) !important; }
        .vol-icon { width: 20px; height: 20px; color: var(--se-txt2); flex-shrink: 0; }
      </style>
      <ha-card>
        <img id="art" src="" alt="" />
        <div class="info">
          <div class="t" id="t">Nothing playing</div>
          <div class="a" id="a"></div>
          <div id="vr" class="vol-row">
            <button class="vol-icon" id="mute">${svg(I.vol_lo,16)}</button>
            <div class="vol-track" id="vt"><div class="vol-fill" id="vf"></div></div>
          </div>
        </div>
        <div class="ctrls">
          <button class="cb" id="prev">${svg(I.prev,20)}</button>
          <button class="pb" id="play">${svg(I.play,22)}</button>
          <button class="cb" id="next">${svg(I.next,20)}</button>
        </div>
      </ha-card>
    `;
    const s = this.shadowRoot;
    s.getElementById("play").addEventListener("click", () => this._mp(this._playing ? "media_pause" : "media_play"));
    s.getElementById("prev").addEventListener("click", () => this._mp("media_previous_track"));
    s.getElementById("next").addEventListener("click", () => this._mp("media_next_track"));
    s.getElementById("mute").addEventListener("click", () => this._mp("volume_mute", { is_volume_muted: !this._muted }));

    this._miniVol = new VolumeController(
      s.getElementById("vt"), s.getElementById("vf"),
      (pct) => this._mp("volume_set", { volume_level: round2(pct) })
    );
  }

  _update() {
    const s = this.shadowRoot;
    if (!s.getElementById("art")) return;
    s.getElementById("art").src = this._art;
    s.getElementById("t").textContent = this._title || "Nothing playing";
    s.getElementById("a").textContent = this._artist;
    s.getElementById("play").innerHTML = svg(this._playing ? I.pause : I.play, 22);
    s.getElementById("mute").innerHTML = svg(this._muted ? I.vol_off : I.vol_lo, 16);
    s.getElementById("vr").style.display = this._config.show_volume !== false ? "flex" : "none";
    this._miniVol?.sync(this._muted ? 0 : this._vol);
  }
}

customElements.define("spotify-mini-card", SpotifyMiniCard);

// ─────────────────────────────────────────────────────────────────────────────
// Device Card
// ─────────────────────────────────────────────────────────────────────────────

class SpotifyDeviceCard extends SpotifyBase {
  static getStubConfig() { return { entity: "media_player.spotify_enhanced", title: "Spotify Devices" }; }

  setConfig(config) {
    this._config = { title: "Spotify Devices", ...config };
    this._ready = false;
    this._build();
    this._ready = true;
    if (this._hass) this._update();
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseCSS(this._config.accent_color)}
        ha-card { height: auto; }
        .hdr { padding: 14px 16px 6px; font-size: 0.82rem; font-weight: 700; color: var(--se-txt2); display: flex; align-items: center; gap: 6px; }
        .device-item { display: flex; align-items: center; gap: 10px; padding: 9px 16px; cursor: pointer; transition: background 0.12s; }
        .device-item:hover { background: var(--se-bg2); }
        .device-item.active { background: color-mix(in srgb, var(--se-accent) 12%, transparent); }
        .di { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: var(--se-txt2); flex-shrink: 0; }
        .dn { flex: 1; font-size: 0.88rem; font-weight: 500; }
        .dv { font-size: 0.75rem; color: var(--se-txt2); }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--se-accent); flex-shrink: 0; }
        .empty { text-align: center; padding: 24px; color: var(--se-txt2); font-size: 0.82rem; }
      </style>
      <ha-card>
        <div class="hdr">${svg(I.cast,16)}&nbsp;<span>${this._config.title}</span></div>
        <div id="list"><div class="empty">Loading…</div></div>
      </ha-card>
    `;
  }

  _update() {
    const list = this.shadowRoot.getElementById("list");
    if (!list) return;
    const devices = globalDeviceStabiliser.stabilise(this._devices);
    if (!devices.length) {
      list.innerHTML = `<div class="empty">No devices found. Open Spotify on a device.</div>`;
      return;
    }
    list.innerHTML = devices.map(d => `
      <div class="device-item${d.id===this._devId?" active":""}" data-id="${d.id}">
        <div class="di">${svg(I.cast,20)}</div>
        <div class="dn">${d.name}</div>
        ${d.volume_percent!=null ? `<span class="dv">${d.volume_percent}%</span>` : ""}
        ${d.id===this._devId ? `<div class="dot"></div>` : ""}
      </div>
    `).join("");
    list.querySelectorAll(".device-item[data-id]").forEach(el =>
      el.addEventListener("click", () => this._spotify("transfer_playback", { device_id: el.dataset.id }))
    );
  }
}

customElements.define("spotify-device-card", SpotifyDeviceCard);

// ─────────────────────────────────────────────────────────────────────────────
// Search Card (standalone)
// ─────────────────────────────────────────────────────────────────────────────

class SpotifySearchCard extends SpotifyBase {
  constructor() {
    super();
    this._q = "";
    this._results = null;
    this._focused = false;
  }
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(config) {
    this._config = config;
    this._ready = false;
    this._build();
    this._ready = true;
    if (this._hass) this._update();
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseCSS(this._config.accent_color)}
        ha-card { height: auto; display: flex; flex-direction: column; }
        .search-bar { display: flex; gap: 6px; padding: 12px 16px 8px; flex-shrink: 0; }
        .search-input { flex: 1; background: var(--se-bg2); border: 1.5px solid var(--se-bg3); border-radius: 8px; color: var(--se-txt); padding: 8px 10px; font-size: 0.88rem; outline: none; transition: border-color 0.15s; }
        .search-input:focus { border-color: var(--se-accent); }
        .search-go { background: var(--se-accent) !important; color: #000 !important; border-radius: 8px; width: 38px; height: 38px; flex-shrink: 0; }
        .body { overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--se-bg3) transparent; }
        .body::-webkit-scrollbar { width: 3px; }
        .sec-label { padding: 8px 16px 3px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--se-txt2); }
        .list-item { display: flex; align-items: center; gap: 10px; padding: 7px 16px; cursor: pointer; transition: background 0.1s; }
        .list-item:hover { background: var(--se-bg2); }
        .item-thumb { width: 40px; height: 40px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: var(--se-bg3); }
        .item-thumb.round { border-radius: 50%; }
        .item-info { flex: 1; min-width: 0; }
        .item-title { font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-sub { font-size: 0.72rem; color: var(--se-txt2); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-action { width: 32px; height: 32px; border-radius: 50%; color: var(--se-txt2); flex-shrink: 0; }
        .item-action:hover { background: var(--se-bg3); color: var(--se-txt); }
        .show-more { display: block; width: 100%; padding: 7px; text-align: center; font-size: 0.75rem; color: var(--se-accent); border-top: 1px solid var(--se-bg3); background: transparent; }
        .show-more:hover { background: var(--se-bg2); }
        .empty { text-align: center; padding: 24px; color: var(--se-txt2); font-size: 0.82rem; }
        .loading { text-align: center; padding: 20px; color: var(--se-txt2); font-size: 0.8rem; }
      </style>
      <ha-card>
        <div class="search-bar">
          <input class="search-input" id="si" placeholder="Search Spotify…" />
          <button class="search-go" id="sg">${svg(I.search,16)}</button>
        </div>
        <div class="body" id="body"></div>
      </ha-card>
    `;
    const s = this.shadowRoot;
    const doSearch = async () => {
      const q = s.getElementById("si")?.value?.trim();
      if (!q) return;
      this._q = q;
      const body = s.getElementById("body");
      body.innerHTML = `<div class="loading">Searching…</div>`;
      try {
        const tok = this._hass?.auth?.data?.access_token;
        const r = await fetch(`/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`, { headers: { Authorization: `Bearer ${tok}` } });
        if (r.ok) { this._results = await r.json(); this._renderResults(); }
        else body.innerHTML = `<div class="empty">Search failed.</div>`;
      } catch { body.innerHTML = `<div class="empty">Search failed.</div>`; }
    };
    s.getElementById("sg")?.addEventListener("click", doSearch);
    s.getElementById("si")?.addEventListener("keydown", (e) => { if (e.key==="Enter") doSearch(); });
    s.getElementById("si")?.addEventListener("focus", () => { this._focused = true; });
    s.getElementById("si")?.addEventListener("blur",  () => { this._focused = false; });
  }

  _renderResults() {
    const s = this.shadowRoot;
    const body = s.getElementById("body");
    if (!body || !this._results) return;
    const r = this._results;
    const track = (t) => `
      <div class="list-item" data-play="${t.uri}">
        <img class="item-thumb" src="${t.album?.images?.[0]?.url||""}" alt="" />
        <div class="item-info"><div class="item-title">${t.name}</div><div class="item-sub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div>
        <button class="item-action" data-queue="${t.uri}">${svg(I.add_queue,16)}</button>
      </div>`;
    const album = (a) => `
      <div class="list-item" data-play="${a.uri}">
        <img class="item-thumb" src="${a.images?.[0]?.url||""}" alt="" />
        <div class="item-info"><div class="item-title">${a.name}</div><div class="item-sub">${(a.artists||[]).map(x=>x.name).join(", ")}</div></div>
      </div>`;
    const artist = (a) => `
      <div class="list-item" data-play="${a.uri}">
        <img class="item-thumb round" src="${a.images?.[0]?.url||""}" alt="" />
        <div class="item-info"><div class="item-title">${a.name}</div><div class="item-sub">Artist</div></div>
      </div>`;
    const playlist = (p) => `
      <div class="list-item" data-play="${p.uri}">
        <img class="item-thumb" src="${p.images?.[0]?.url||""}" alt="" />
        <div class="item-info"><div class="item-title">${p.name}</div><div class="item-sub">Playlist · ${p.owner?.display_name||""}</div></div>
      </div>`;

    let html = "";
    if (r.tracks?.items?.length)    html += `<div class="sec-label">Tracks</div>`    + r.tracks.items.slice(0,5).map(track).join("")    + (r.tracks.total>5 ?`<button class="show-more" data-more="tracks">Show more</button>`:"");
    if (r.albums?.items?.length)    html += `<div class="sec-label">Albums</div>`    + r.albums.items.slice(0,4).map(album).join("")    + (r.albums.total>4 ?`<button class="show-more" data-more="albums">Show more</button>`:"");
    if (r.artists?.items?.length)   html += `<div class="sec-label">Artists</div>`   + r.artists.items.slice(0,4).map(artist).join("")  + (r.artists.total>4?`<button class="show-more" data-more="artists">Show more</button>`:"");
    if (r.playlists?.items?.length) html += `<div class="sec-label">Playlists</div>` + r.playlists.items.slice(0,4).map(playlist).join("") + (r.playlists.total>4?`<button class="show-more" data-more="playlists">Show more</button>`:"");
    if (!html) html = `<div class="empty">No results.</div>`;
    body.innerHTML = html;

    body.querySelectorAll(".list-item[data-play]").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-queue]")) return;
        this._mp("play_media", { media_content_id: el.dataset.play, media_content_type: "music" });
      });
    });
    body.querySelectorAll("[data-queue]").forEach(btn => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); this._spotify("add_to_queue", { track_uri: btn.dataset.queue }); });
    });
    body.querySelectorAll("[data-more]").forEach(btn => {
      btn.addEventListener("click", () => {
        // Show all items of that type
        const t = btn.dataset.more;
        if (this._results?.[t]) {
          const all = this._results[t].items;
          btn.parentElement.querySelectorAll(".list-item").length; // do nothing, just show all
          this._results[t]._expanded = true;
          this._renderResults();
        }
      });
    });
    // Restore focus
    const si = s.getElementById("si");
    if (si && this._focused) requestAnimationFrame(() => si.focus());
  }

  _update() {
    globalLikeTracker.setHass(this._hass);
    // nothing else to update from hass
  }
}

customElements.define("spotify-search-card", SpotifySearchCard);

// ─────────────────────────────────────────────────────────────────────────────
// Queue Card (standalone)
// ─────────────────────────────────────────────────────────────────────────────

class SpotifyQueueCard extends SpotifyBase {
  constructor() { super(); this._data = null; this._loading = false; }
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(config) {
    this._config = config;
    this._ready = false;
    this._build();
    this._ready = true;
    if (this._hass) this._update();
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseCSS(this._config.accent_color)}
        ha-card { height: auto; display: flex; flex-direction: column; }
        .hdr { padding: 14px 16px 8px; font-size: 0.82rem; font-weight: 700; color: var(--se-txt2); display: flex; align-items: center; justify-content: space-between; }
        .hdr-left { display: flex; align-items: center; gap: 6px; }
        .reload-btn { width: 30px; height: 30px; border-radius: 50%; color: var(--se-txt2); }
        .reload-btn:hover { background: var(--se-bg2); }
        .body { overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--se-bg3) transparent; }
        .body::-webkit-scrollbar { width: 3px; }
        .list-item { display: flex; align-items: center; gap: 10px; padding: 7px 16px; cursor: pointer; transition: background 0.1s; }
        .list-item:hover { background: var(--se-bg2); }
        .list-item.playing { background: color-mix(in srgb, var(--se-accent) 10%, transparent); }
        .item-thumb { width: 40px; height: 40px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: var(--se-bg3); }
        .item-info { flex: 1; min-width: 0; }
        .item-title { font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-sub { font-size: 0.72rem; color: var(--se-txt2); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-dur { font-size: 0.7rem; color: var(--se-txt2); flex-shrink: 0; }
        .sec-label { padding: 8px 16px 3px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--se-txt2); }
        .empty { text-align: center; padding: 24px; color: var(--se-txt2); font-size: 0.82rem; }
        .loading { text-align: center; padding: 20px; color: var(--se-txt2); }
      </style>
      <ha-card>
        <div class="hdr">
          <div class="hdr-left">${svg(I.queue_music,16)}&nbsp;Queue</div>
          <button class="reload-btn" id="reload">${svg(I.queue,16)}</button>
        </div>
        <div class="body" id="body"><div class="loading">Loading…</div></div>
      </ha-card>
    `;
    this.shadowRoot.getElementById("reload")?.addEventListener("click", () => this._load());
  }

  async _load() {
    if (this._loading) return;
    this._loading = true;
    const body = this.shadowRoot.getElementById("body");
    if (body) body.innerHTML = `<div class="loading">Loading…</div>`;
    try {
      const tok = this._hass?.auth?.data?.access_token;
      const r = await fetch("/api/spotify_enhanced/queue", { headers: { Authorization: `Bearer ${tok}` } });
      if (!r.ok) throw new Error();
      this._data = await r.json();
      this._render();
    } catch {
      if (body) body.innerHTML = `<div class="empty">Queue unavailable. Start playback first.</div>`;
    } finally { this._loading = false; }
  }

  _render() {
    const body = this.shadowRoot.getElementById("body");
    if (!body || !this._data) return;
    const cur = this._data.currently_playing;
    const q   = this._data.queue || [];
    let html = "";
    const item = (t, cur=false) => {
      const imgs = t.album?.images||[];
      return `<div class="list-item${cur?" playing":""}" data-uri="${t.uri}">
        <img class="item-thumb" src="${imgs[0]?.url||""}" alt="" />
        <div class="item-info">
          <div class="item-title">${t.name}</div>
          <div class="item-sub">${(t.artists||[]).map(a=>a.name).join(", ")}</div>
        </div>
        <span class="item-dur">${fmt(t.duration_ms)}</span>
      </div>`;
    };
    if (cur) { html += `<div class="sec-label">Now Playing</div>` + item(cur, true); }
    if (q.length) { html += `<div class="sec-label">Next Up</div>` + q.slice(0,30).map(t=>item(t)).join(""); }
    if (!html) html = `<div class="empty">Queue is empty.</div>`;
    body.innerHTML = html;
    body.querySelectorAll(".list-item[data-uri]").forEach(el =>
      el.addEventListener("click", () => this._mp("play_media", { media_content_id: el.dataset.uri, media_content_type: "music" }))
    );
  }

  _update() {
    globalLikeTracker.setHass(this._hass);
    if (!this._data && !this._loading) this._load();
  }
}

customElements.define("spotify-queue-card", SpotifyQueueCard);

// ─────────────────────────────────────────────────────────────────────────────
// Visual Editor
// ─────────────────────────────────────────────────────────────────────────────

class SpotifyEnhancedCardEditor extends HTMLElement {
  set hass(h) { this._hass = h; if (this._rendered) this._updateHass(); }

  setConfig(c) {
    this._config   = c;
    this._rendered = false;
    this._render();
    this._rendered = true;
  }

  _updateHass() {
    const picker = this.querySelector("ha-entity-picker");
    if (picker) picker.hass = this._hass;
  }

  _render() {
    const c = this._config || {};
    this.innerHTML = `
      <style>
        :host { display: block; padding: 8px 0; }
        ha-entity-picker { display: block; margin-bottom: 14px; }
        .row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--divider-color, #eee); font-size: 0.9rem; }
        .section-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: var(--secondary-text-color); margin: 16px 0 6px; }
        .color-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; }
        .color-swatch { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--divider-color,#ccc); cursor: pointer; position: relative; overflow: hidden; }
        .color-swatch input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
      </style>

      <ha-entity-picker
        label="Spotify Media Player Entity"
        .includeDomains="${["media_player"]}"
        .value="${c.entity || ""}"
      ></ha-entity-picker>

      <div class="section-title">Accent Colour</div>
      <div class="color-row">
        <div class="color-swatch" style="background:${c.accent_color||"var(--primary-color)"}">
          <input type="color" id="accent" value="${c.accent_color||"#6200ea"}" />
        </div>
        <span style="font-size:0.82rem;color:var(--secondary-text-color)">${c.accent_color||"Follow theme"}</span>
        <button style="font-size:0.75rem;color:var(--primary-color);background:none;border:none;cursor:pointer" id="clear-accent">Reset</button>
      </div>

      <div class="section-title">Controls</div>
      ${this._toggle("show_seek",    "Show seek bar",      c.show_seek    !== false)}
      ${this._toggle("show_volume",  "Show volume",        c.show_volume  !== false)}
      ${this._toggle("show_shuffle", "Show shuffle",       c.show_shuffle !== false)}
      ${this._toggle("show_repeat",  "Show repeat",        c.show_repeat  !== false)}
    `;

    // Bind entity picker
    const picker = this.querySelector("ha-entity-picker");
    if (picker) {
      picker.hass = this._hass;
      picker.addEventListener("value-changed", (e) => this._set("entity", e.detail.value));
    }

    // Bind toggles
    this.querySelectorAll("ha-switch[data-key]").forEach(sw => {
      sw.addEventListener("change", (e) => this._set(sw.dataset.key, e.target.checked));
    });

    // Bind colour picker
    this.querySelector("#accent")?.addEventListener("input", (e) => {
      this._set("accent_color", e.target.value);
      this._render(); // re-render to update swatch
    });
    this.querySelector("#clear-accent")?.addEventListener("click", () => {
      this._set("accent_color", "");
      this._render();
    });
  }

  _toggle(key, label, checked) {
    return `
      <div class="row">
        <span>${label}</span>
        <ha-switch data-key="${key}" ${checked ? "checked" : ""}></ha-switch>
      </div>
    `;
  }

  _set(key, value) {
    this._config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }
}

customElements.define("spotify-enhanced-card-editor", SpotifyEnhancedCardEditor);

// ─────────────────────────────────────────────────────────────────────────────
// Card registration
// ─────────────────────────────────────────────────────────────────────────────

window.customCards = window.customCards || [];
window.customCards.push(
  { type: "spotify-enhanced-card", name: "Spotify Enhanced — Media Deck",    description: "Full player: art, controls, seek, volume, DJ, library, search, queue, devices.",   preview: true },
  { type: "spotify-mini-card",     name: "Spotify Enhanced — Mini Player",   description: "Compact single-row playback control.",                                               preview: true },
  { type: "spotify-device-card",   name: "Spotify Enhanced — Device Picker", description: "Browse and switch Spotify Connect devices.",                                          preview: true },
  { type: "spotify-search-card",   name: "Spotify Enhanced — Search",        description: "Standalone Spotify search card.",                                                     preview: true },
  { type: "spotify-queue-card",    name: "Spotify Enhanced — Queue",         description: "View and manage the current playback queue.",                                         preview: true },
);

console.info(
  `%c SPOTIFY ENHANCED %c v${VERSION} `,
  "color:#fff;background:#1DB954;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px",
  "color:#1DB954;background:#111;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0"
);
