/**
 * Spotify Enhanced Card  v1.0.0
 *
 * Design: closely follows hui-media-control-card — blurred art background,
 * colour-extracted accent, translucent overlays, same button positions.
 *
 * Cards:
 *   spotify-enhanced-card   Full deck (art + controls + slide panels)
 *   spotify-mini-card        Slim row player
 *   spotify-device-card      Device picker
 *   spotify-search-card      Standalone search
 *   spotify-queue-card       Queue viewer
 */

const VERSION = "1.0.0";

// ─── Utilities ───────────────────────────────────────────────────────────────

const fmt = (ms) => {
  if (ms == null || isNaN(ms)) return "0:00";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = (n) => Math.round(n * 100) / 100;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Inline MDI SVG — no external font dependency
const mdi = (path, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" style="flex-shrink:0;display:block"><path d="${path}"/></svg>`;

const P = {
  play:       "M8 5.14v14l11-7z",
  pause:      "M14 19h4V5h-4M6 19h4V5H6v14z",
  next:       "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
  prev:       "M6 6h2v12H6zm3.5 6 8.5 6V6z",
  shuffle:    "M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  repeat:     "M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  repeat_one: "M13 15V9h-1l-2 1v1h1.5v4M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  heart:      "M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53z",
  heart_out:  "M12.1 18.55l-.1.1-.11-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04 1 3.57 2.36h1.86C13.46 6 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05M16.5 3c-1.74 0-3.41.81-4.5 2.08C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.41 2 8.5c0 3.77 3.4 6.86 8.55 11.53L12 21.35l1.45-1.32C18.6 15.36 22 12.27 22 8.5 22 5.41 19.58 3 16.5 3z",
  vol_off:    "M16.5 12c0-1.77-1-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z",
  vol_lo:     "M18.5 12c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03zM5 9v6h4l5 5V4L9 9H5z",
  vol_hi:     "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
  cast:       "M1 18v3h3a3 3 0 0 0-3-3zm0-4v2a7 7 0 0 1 7 7h2c0-5-4-9-9-9zm0-4v2c6.07 0 11 4.93 11 11h2C14 15.93 8.07 10 1 10zm20-7H3C1.9 3 1 3.9 1 5v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
  search:     "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  queue:      "M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z",
  close:      "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  chev_r:     "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  library:    "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
  add_q:      "M13 8H3V6h10v2zm0 4H3v-2h10v2zm4 4H3v-2h14v2zm-1 6v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3z",
  more_h:     "M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  home:       "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  refresh:    "M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
};

// ─── Colour extractor (from album art canvas) ─────────────────────────────────

async function extractDominantColor(imgUrl) {
  if (!imgUrl) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 32;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        // Ensure minimum brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness < 60) { r = Math.min(255, r + 80); g = Math.min(255, g + 80); b = Math.min(255, b + 80); }
        resolve(`rgb(${r},${g},${b})`);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = imgUrl;
  });
}

// ─── Device stabiliser ────────────────────────────────────────────────────────

class DeviceStabiliser {
  constructor() { this._order = []; }
  stabilise(devices) {
    if (!devices?.length) { this._order = []; return []; }
    const ids = new Set(devices.map(d => d.id));
    this._order = this._order.filter(id => ids.has(id));
    for (const d of devices) { if (!this._order.includes(d.id)) this._order.push(d.id); }
    const map = Object.fromEntries(devices.map(d => [d.id, d]));
    return this._order.map(id => map[id]).filter(Boolean);
  }
}
const gDevStab = new DeviceStabiliser();

// ─── Liked-songs tracker ─────────────────────────────────────────────────────

class LikeTracker {
  constructor() { this._liked = new Set(); this._pending = new Set(); }
  async check(trackId, hass) {
    if (!trackId || this._pending.has(trackId)) return;
    this._pending.add(trackId);
    try {
      const tok = hass?.auth?.data?.access_token;
      if (!tok) return;
      const r = await fetch(`/api/spotify_enhanced/liked?ids=${trackId}`, { headers: { Authorization: `Bearer ${tok}` } });
      if (r.ok) { const d = await r.json(); if (d?.[0]) this._liked.add(trackId); else this._liked.delete(trackId); }
    } catch {}
    finally { this._pending.delete(trackId); }
  }
  isLiked(id) { return this._liked.has(id); }
  toggle(trackId, hass) {
    if (!trackId) return false;
    if (this._liked.has(trackId)) { this._liked.delete(trackId); hass?.callService("spotify_enhanced", "remove_track", { track_id: [trackId] }); }
    else { this._liked.add(trackId); hass?.callService("spotify_enhanced", "save_track", { track_id: [trackId] }); }
    return this._liked.has(trackId);
  }
}
const gLikes = new LikeTracker();

// ─── Base class ───────────────────────────────────────────────────────────────

class SpotifyBase extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._hass = null; this._config = {}; this._ready = false; }

  set hass(h) {
    this._hass = h;
    if (this._ready) this._onHass();
  }

  setConfig(c) {
    this._config = c;
    this._ready = false;
    this._build();
    this._ready = true;
    if (this._hass) this._onHass();
  }

  get _so()      { return this._hass?.states?.[this._config?.entity]; }
  get _a()       { return this._so?.attributes ?? {}; }
  get _state()   { return this._so?.state ?? "idle"; }
  get _playing() { return this._state === "playing"; }
  get _title()   { return this._a.media_title ?? ""; }
  get _artist()  { return this._a.media_artist ?? ""; }
  get _album()   { return this._a.media_album_name ?? ""; }
  get _art()     { return this._a.entity_picture ?? ""; }
  get _vol()     { return clamp((this._a.volume_level ?? 0) * 100, 0, 100); }
  get _muted()   { return this._a.is_volume_muted ?? false; }
  get _shuffle() { return this._a.shuffle ?? false; }
  get _repeat()  { return this._a.repeat ?? "off"; }
  get _progMs()  { return (this._a.media_position ?? 0) * 1000; }
  get _durMs()   { return (this._a.media_duration ?? 0) * 1000; }
  get _devices() { return this._a.spotify_devices ?? []; }
  get _devId()   { return this._a.device_id ?? null; }
  get _trackId() { return this._a.track_id ?? null; }
  get _ctxUri()  { return this._a.context_uri ?? null; }

  _call(domain, service, data = {}) { this._hass?.callService(domain, service, data); }
  _spotify(s, d = {}) { this._call("spotify_enhanced", s, d); }
  _mp(s, d = {}) { this._call("media_player", s, { entity_id: this._config.entity, ...d }); }

  _build()  {}
  _onHass() {}
}

// ─── ProgressController (smooth 60fps interpolation) ────────────────────────

class ProgressCtrl {
  constructor(fill, cur, dur) {
    this._fill = fill; this._cur = cur; this._dur = dur;
    this._ms = 0; this._durMs = 0; this._ts = 0;
    this._playing = false; this._raf = null;
    this._drag = false; this._dragPct = 0;
  }
  sync(ms, durMs, playing) {
    if (this._drag) return;
    this._ms = ms; this._durMs = durMs; this._playing = playing; this._ts = performance.now();
    if (playing) { if (!this._raf) this._tick(); }
    else { cancelAnimationFrame(this._raf); this._raf = null; this._render(ms); }
  }
  _tick() {
    this._raf = requestAnimationFrame(() => {
      if (!this._playing || this._drag) { this._raf = null; return; }
      const now = performance.now();
      this._ms = Math.min(this._ms + (now - this._ts), this._durMs || 0);
      this._ts = now; this._render(this._ms); this._tick();
    });
  }
  _render(ms) {
    const pct = this._durMs ? clamp((ms / this._durMs) * 100, 0, 100) : 0;
    if (this._fill) this._fill.style.width = `${pct}%`;
    if (this._cur)  this._cur.textContent  = fmt(ms);
    if (this._dur)  this._dur.textContent  = fmt(this._durMs);
  }
  startDrag(pct) { this._drag = true; this._dragPct = clamp(pct, 0, 1); this._render(this._dragPct * this._durMs); }
  moveDrag(pct)  { if (!this._drag) return; this._dragPct = clamp(pct, 0, 1); this._render(this._dragPct * this._durMs); }
  endDrag()      { this._drag = false; this._ms = this._dragPct * this._durMs; this._ts = performance.now(); if (this._playing) this._tick(); return this._ms; }
  destroy()      { cancelAnimationFrame(this._raf); this._raf = null; }
}

// ─── VolumeController (drag priority, no range input) ────────────────────────

class VolumeCtrl {
  constructor(track, fill, onChange) {
    this._track = track; this._fill = fill; this._onChange = onChange;
    this._pct = 0; this._drag = false;
    if (track) {
      track.addEventListener("pointerdown", (e) => {
        this._drag = true; this._move(e); track.setPointerCapture(e.pointerId);
        track.addEventListener("pointermove", this._moveH = (e) => this._move(e), { passive: true });
        track.addEventListener("pointerup",   this._upH   = (e) => { this._drag = false; this._move(e); this._onChange(this._pct); track.removeEventListener("pointermove", this._moveH); track.removeEventListener("pointerup", this._upH); }, { once: true });
      });
    }
  }
  _move(e) {
    if (!this._track) return;
    const r = this._track.getBoundingClientRect();
    this._pct = clamp((e.clientX - r.left) / r.width, 0, 1);
    if (this._fill) this._fill.style.width = `${this._pct * 100}%`;
  }
  sync(pct) { if (this._drag) return; this._pct = clamp(pct / 100, 0, 1); if (this._fill) this._fill.style.width = `${this._pct * 100}%`; }
}

// ─── Shared CSS (HA media-control-card style) ─────────────────────────────────

const CSS = () => `
  :host {
    --se-accent: var(--primary-color, #03a9f4);
    --se-bg: var(--card-background-color, #1c1c1e);
    --se-bg2: rgba(255,255,255,0.08);
    --se-bg3: rgba(255,255,255,0.14);
    --se-txt: var(--primary-text-color, #fff);
    --se-txt2: var(--secondary-text-color, rgba(255,255,255,0.55));
    --se-r: var(--ha-card-border-radius, 12px);
    --se-shadow: var(--ha-card-box-shadow, none);
    display: block; height: 100%;
  }
  *, *::before, *::after { box-sizing: border-box; }

  ha-card {
    background: var(--se-bg);
    border-radius: var(--se-r);
    box-shadow: var(--se-shadow);
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    color: var(--se-txt);
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  button {
    appearance: none; background: none; border: none;
    cursor: pointer; color: inherit; padding: 0; margin: 0;
    display: inline-flex; align-items: center; justify-content: center;
    transition: opacity 0.15s, transform 0.1s, background 0.15s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  button:hover  { opacity: 0.85; }
  button:active { transform: scale(0.88); opacity: 0.7; }
  button.on     { color: var(--se-accent); }
  button:disabled { opacity: 0.25; pointer-events: none; }

  /* ── Blurred art background (like HA media-control-card) ── */
  .art-bg {
    position: absolute; inset: 0; z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .art-bg img {
    width: 100%; height: 100%;
    object-fit: cover;
    filter: blur(24px) brightness(0.45) saturate(1.4);
    transform: scale(1.15);
    transition: opacity 0.5s ease;
  }
  .art-bg-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom,
      rgba(0,0,0,0.1) 0%,
      rgba(0,0,0,0.3) 60%,
      rgba(0,0,0,0.6) 100%);
  }

  /* ── Content sits above blur ── */
  .content {
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
    height: 100%;
  }

  /* ── Art + info section (expands to fill panel) ── */
  .art-section {
    flex: 1 1 auto; min-height: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 24px 20px 12px;
    gap: 12px;
  }

  .art-img-wrap {
    width: min(180px, 60%);
    aspect-ratio: 1;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    flex-shrink: 0;
  }
  .art-img-wrap img {
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    transition: opacity 0.4s;
  }
  .art-img-wrap.no-art {
    background: var(--se-bg2);
    display: flex; align-items: center; justify-content: center;
    color: var(--se-txt2);
  }

  .track-info {
    text-align: center; width: 100%;
  }
  .track-name {
    font-size: clamp(0.95rem, 2.5vw, 1.15rem);
    font-weight: 700; line-height: 1.2;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    color: #fff;
  }
  .track-sub {
    font-size: clamp(0.75rem, 2vw, 0.88rem);
    color: rgba(255,255,255,0.65);
    margin-top: 3px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* Like button (top-right of art) */
  .like-btn {
    position: absolute; top: 12px; right: 12px;
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(0,0,0,0.35);
    color: rgba(255,255,255,0.7);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 2;
  }
  .like-btn.liked { color: var(--se-accent); }

  /* ── Controls section (fixed, at bottom) ── */
  .ctrl-section {
    flex: 0 0 auto;
    padding: 0 16px 12px;
  }

  /* Seek bar */
  .seek-wrap { padding: 6px 0 2px; }
  .seek-track {
    height: 4px; background: rgba(255,255,255,0.25);
    border-radius: 2px; cursor: pointer;
    position: relative; touch-action: none;
    transition: height 0.1s;
  }
  .seek-track:hover, .seek-track.drag { height: 5px; }
  .seek-fill {
    position: absolute; left: 0; top: 0; height: 100%;
    background: var(--se-accent); border-radius: 2px;
    pointer-events: none;
  }
  .seek-thumb {
    position: absolute; right: 0; top: 50%;
    width: 13px; height: 13px; border-radius: 50%;
    background: #fff; transform: translate(50%, -50%);
    opacity: 0; transition: opacity 0.15s; pointer-events: none;
  }
  .seek-track:hover .seek-thumb,
  .seek-track.drag  .seek-thumb { opacity: 1; }
  .seek-times { display: flex; justify-content: space-between; font-size: 0.68rem; color: rgba(255,255,255,0.55); margin-top: 2px; }

  /* Main control row — same layout as HA media-control-card */
  .ctrl-row {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 6px 0 4px;
  }
  .icon-btn {
    width: 42px; height: 42px; border-radius: 50%;
    color: rgba(255,255,255,0.7);
  }
  .icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .play-btn {
    width: 54px; height: 54px; border-radius: 50%;
    background: rgba(255,255,255,0.9) !important;
    color: #000 !important;
  }
  .play-btn:hover { background: #fff !important; }

  /* Volume row */
  .vol-row { display: flex; align-items: center; gap: 6px; padding: 2px 0 6px; }
  .vol-icon { width: 26px; height: 26px; color: rgba(255,255,255,0.55); flex-shrink: 0; }
  .vol-track {
    flex: 1; height: 3px; background: rgba(255,255,255,0.25);
    border-radius: 2px; cursor: pointer; position: relative;
    touch-action: none;
    transition: height 0.1s;
  }
  .vol-track:hover { height: 4px; }
  .vol-fill {
    position: absolute; left: 0; top: 0; height: 100%;
    background: rgba(255,255,255,0.8); border-radius: 2px;
    pointer-events: none;
  }
  .vol-thumb {
    position: absolute; right: 0; top: 50%;
    width: 12px; height: 12px; border-radius: 50%;
    background: #fff; transform: translate(50%, -50%);
    opacity: 0; transition: opacity 0.15s; pointer-events: none;
  }
  .vol-track:hover .vol-thumb { opacity: 1; }

  /* Action chips */
  .chips-row {
    display: flex; gap: 5px; padding: 2px 0 2px;
    overflow-x: auto; scrollbar-width: none;
    flex-wrap: nowrap;
  }
  .chips-row::-webkit-scrollbar { display: none; }
  .chip {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 4px 10px; border-radius: 14px;
    font-size: 0.7rem; font-weight: 600;
    background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.7);
    white-space: nowrap; cursor: pointer; flex-shrink: 0;
    border: 1px solid transparent;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    height: 26px;
  }
  .chip:hover { background: rgba(255,255,255,0.2); color: #fff; }
  .chip.on {
    background: rgba(255,255,255,0.18);
    color: #fff;
    border-color: rgba(255,255,255,0.4);
  }

  /* ── Slide-up panels ── */
  .backdrop {
    display: none; position: absolute; inset: 0;
    background: rgba(0,0,0,0.5); z-index: 10;
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }
  .backdrop.open { display: block; }

  .panel {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: var(--se-bg);
    border-radius: var(--se-r) var(--se-r) 0 0;
    z-index: 11;
    max-height: 78%;
    display: flex; flex-direction: column;
    overflow: hidden;
    transform: translateY(101%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .panel.open { transform: translateY(0); }

  .panel-hdr {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px 8px; flex-shrink: 0;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    min-height: 44px;
  }
  .panel-title {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.6px; color: var(--se-txt2);
    flex: 1; overflow: hidden;
  }
  .panel-close { width: 28px; height: 28px; border-radius: 50%; color: var(--se-txt2); flex-shrink: 0; }
  .panel-close:hover { background: rgba(255,255,255,0.08); color: var(--se-txt); }
  .panel-body { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
  .panel-body::-webkit-scrollbar { width: 3px; }
  .panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); }

  /* ── List items (shared across library, search, queue) ── */
  .item {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 14px; cursor: pointer;
    transition: background 0.1s;
  }
  .item:hover { background: rgba(255,255,255,0.06); }
  .item.now { background: rgba(255,255,255,0.1); }
  .thumb {
    width: 40px; height: 40px; border-radius: 4px;
    object-fit: cover; flex-shrink: 0;
    background: rgba(255,255,255,0.08);
  }
  .thumb.circle { border-radius: 50%; }
  .thumb-ph {
    width: 40px; height: 40px; border-radius: 4px;
    background: rgba(255,255,255,0.08); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    color: var(--se-txt2);
  }
  .iinfo { flex: 1; min-width: 0; }
  .ititle { font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--se-txt); }
  .isub   { font-size: 0.72rem; color: var(--se-txt2); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .iact   { width: 30px; height: 30px; border-radius: 50%; color: var(--se-txt2); flex-shrink: 0; }
  .iact:hover { background: rgba(255,255,255,0.1); color: var(--se-txt); }

  /* Section header */
  .sec { padding: 10px 14px 3px; font-size: 0.63rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--se-txt2); }

  /* Show more button */
  .show-more {
    display: block; width: 100%; padding: 7px;
    text-align: center; font-size: 0.75rem;
    color: var(--se-accent); background: transparent;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .show-more:hover { background: rgba(255,255,255,0.05); }

  /* Breadcrumb */
  .breadcrumb { display: flex; align-items: center; gap: 2px; padding: 6px 14px 3px; overflow-x: auto; scrollbar-width: none; }
  .breadcrumb::-webkit-scrollbar { display: none; }
  .crumb { font-size: 0.73rem; padding: 2px 5px; border-radius: 5px; color: var(--se-txt2); white-space: nowrap; cursor: pointer; }
  .crumb:hover { background: rgba(255,255,255,0.07); color: var(--se-txt); }
  .crumb.last { color: var(--se-txt); font-weight: 600; }
  .crumb-sep { color: rgba(255,255,255,0.2); font-size: 0.75rem; }

  /* Search bar */
  .search-bar { display: flex; gap: 6px; padding: 10px 14px 6px; flex-shrink: 0; }
  .search-in {
    flex: 1; background: rgba(255,255,255,0.1);
    border: 1.5px solid rgba(255,255,255,0.15);
    border-radius: 8px; color: var(--se-txt);
    padding: 7px 10px; font-size: 0.85rem; outline: none;
    transition: border-color 0.15s;
  }
  .search-in::placeholder { color: var(--se-txt2); }
  .search-in:focus { border-color: var(--se-accent); }
  .search-go { background: var(--se-accent) !important; color: #000 !important; border-radius: 8px; width: 36px; height: 36px; flex-shrink: 0; }

  /* Device items */
  .dev-item { display: flex; align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer; transition: background 0.12s; }
  .dev-item:hover { background: rgba(255,255,255,0.06); }
  .dev-item.now { background: color-mix(in srgb, var(--se-accent) 12%, transparent); }
  .dev-icon { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: var(--se-txt2); flex-shrink: 0; }
  .dev-name { flex: 1; font-size: 0.88rem; font-weight: 500; }
  .dev-vol  { font-size: 0.73rem; color: var(--se-txt2); }
  .dev-dot  { width: 7px; height: 7px; border-radius: 50%; background: var(--se-accent); flex-shrink: 0; }

  /* Queue now-playing label */
  .queue-now { padding: 8px 14px 3px; font-size: 0.63rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--se-accent); }

  /* Empty / loading */
  .empty   { text-align: center; padding: 28px 14px; color: var(--se-txt2); font-size: 0.82rem; line-height: 1.5; }
  .loading { text-align: center; padding: 20px; color: var(--se-txt2); font-size: 0.8rem; }
`;

// ─── MAIN CARD ────────────────────────────────────────────────────────────────

class SpotifyEnhancedCard extends SpotifyBase {
  constructor() {
    super();
    this._prog     = null;
    this._volCtrl  = null;
    this._lastArt  = "";
    this._lastTrack= "";
    this._libStack = [];
    this._libItems = null;
    this._srQuery  = "";
    this._srResults= null;
    this._srExpand = {};
    this._searchFocused = false;
    this._openPanel = null;
  }

  static getConfigElement() { return document.createElement("spotify-enhanced-card-editor"); }
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config = {
      show_seek: true, show_volume: true,
      show_shuffle: true, show_repeat: true,
      ...c,
    };
    this._ready = false;
    this._build();
    this._ready = true;
    if (this._hass) this._onHass();
  }

  disconnectedCallback() {
    this._prog?.destroy();
    this._volCtrl = null;
  }

  _build() {
    const s = this.shadowRoot;
    s.innerHTML = `<style>${CSS()}</style>
    <ha-card>
      <!-- Blurred art background -->
      <div class="art-bg">
        <img id="bg-img" src="" alt="" />
        <div class="art-bg-overlay"></div>
      </div>

      <!-- All content -->
      <div class="content">

        <!-- Like button (absolute, top-right) -->
        <button class="like-btn" id="like-btn"></button>

        <!-- Art + track info (fills available space) -->
        <div class="art-section" id="art-section">
          <div class="art-img-wrap" id="art-wrap">
            <img id="art-img" src="" alt="" />
          </div>
          <div class="track-info">
            <div class="track-name" id="t-name">Nothing playing</div>
            <div class="track-sub"  id="t-sub"></div>
          </div>
        </div>

        <!-- Fixed controls -->
        <div class="ctrl-section">
          <div id="seek-wrap" class="seek-wrap">
            <div class="seek-track" id="seek-track">
              <div class="seek-fill"  id="seek-fill"></div>
              <div class="seek-thumb" id="seek-thumb"></div>
            </div>
            <div class="seek-times">
              <span id="p-cur">0:00</span>
              <span id="p-dur">0:00</span>
            </div>
          </div>

          <div class="ctrl-row">
            <button class="icon-btn" id="shuf-btn"></button>
            <button class="icon-btn" id="prev-btn">${mdi(P.prev, 24)}</button>
            <button class="play-btn"  id="play-btn"></button>
            <button class="icon-btn" id="next-btn">${mdi(P.next, 24)}</button>
            <button class="icon-btn" id="rep-btn"></button>
          </div>

          <div class="vol-row" id="vol-row">
            <button class="vol-icon" id="mute-btn"></button>
            <div class="vol-track" id="vol-track">
              <div class="vol-fill"  id="vol-fill"></div>
              <div class="vol-thumb"></div>
            </div>
          </div>

          <div class="chips-row">
            <div class="chip" id="chip-lib">${mdi(P.library,12)}&nbsp;Library</div>
            <div class="chip" id="chip-search">${mdi(P.search,12)}&nbsp;Search</div>
            <div class="chip" id="chip-queue">${mdi(P.queue,12)}&nbsp;Queue</div>
            <div class="chip" id="chip-devices">${mdi(P.cast,12)}&nbsp;Devices</div>
          </div>
        </div>
      </div>

      <!-- Backdrop -->
      <div class="backdrop" id="backdrop"></div>

      <!-- Library panel -->
      <div class="panel" id="panel-lib">
        <div class="panel-hdr">
          <div class="panel-title" id="lib-title">${mdi(P.library,15)}&nbsp;Library</div>
          <button class="panel-close" id="close-lib">${mdi(P.close,18)}</button>
        </div>
        <div class="panel-body" id="lib-body"></div>
      </div>

      <!-- Search panel -->
      <div class="panel" id="panel-search">
        <div class="panel-hdr">
          <div class="panel-title">${mdi(P.search,15)}&nbsp;Search</div>
          <button class="panel-close" id="close-search">${mdi(P.close,18)}</button>
        </div>
        <div class="search-bar">
          <input class="search-in" id="search-in" placeholder="Search Spotify…" autocomplete="off" />
          <button class="search-go" id="search-go">${mdi(P.search,16)}</button>
        </div>
        <div class="panel-body" id="search-body"></div>
      </div>

      <!-- Queue panel -->
      <div class="panel" id="panel-queue">
        <div class="panel-hdr">
          <div class="panel-title">${mdi(P.queue,15)}&nbsp;Queue</div>
          <button class="panel-close" id="close-queue">${mdi(P.close,18)}</button>
        </div>
        <div class="panel-body" id="queue-body"><div class="loading">Loading…</div></div>
      </div>

      <!-- Devices panel -->
      <div class="panel" id="panel-devices">
        <div class="panel-hdr">
          <div class="panel-title">${mdi(P.cast,15)}&nbsp;Devices</div>
          <button class="panel-close" id="close-devices">${mdi(P.close,18)}</button>
        </div>
        <div class="panel-body" id="devices-body"></div>
      </div>

    </ha-card>`;

    this._bindEvents();

    this._prog = new ProgressCtrl(
      s.getElementById("seek-fill"),
      s.getElementById("p-cur"),
      s.getElementById("p-dur"),
    );
    this._bindSeek();

    this._volCtrl = new VolumeCtrl(
      s.getElementById("vol-track"),
      s.getElementById("vol-fill"),
      (pct) => this._mp("volume_set", { volume_level: round2(pct) }),
    );
  }

  _bindEvents() {
    const s = this.shadowRoot;

    s.getElementById("play-btn").addEventListener("click", () =>
      this._mp(this._playing ? "media_pause" : "media_play"));
    s.getElementById("prev-btn").addEventListener("click", () => this._mp("media_previous_track"));
    s.getElementById("next-btn").addEventListener("click", () => this._mp("media_next_track"));
    s.getElementById("shuf-btn").addEventListener("click", () =>
      this._mp("shuffle_set", { shuffle: !this._shuffle }));
    s.getElementById("rep-btn").addEventListener("click", () => {
      const next = { off: "all", all: "one", one: "off" }[this._repeat] ?? "off";
      this._mp("repeat_set", { repeat: next });
    });
    s.getElementById("mute-btn").addEventListener("click", () =>
      this._mp("volume_mute", { is_volume_muted: !this._muted }));
    s.getElementById("like-btn").addEventListener("click", () => {
      const liked = gLikes.toggle(this._trackId, this._hass);
      this._updateLike(liked);
    });

    // Chips
    const chipPanels = { lib: "panel-lib", search: "panel-search", queue: "panel-queue", devices: "panel-devices" };
    for (const [chip, panel] of Object.entries(chipPanels)) {
      s.getElementById(`chip-${chip}`).addEventListener("click", () => this._showPanel(panel, chip));
    }
    // Close buttons
    for (const key of ["lib","search","queue","devices"]) {
      s.getElementById(`close-${key}`)?.addEventListener("click", () => this._hidePanel());
    }
    s.getElementById("backdrop").addEventListener("click", () => this._hidePanel());

    // Search
    const si = s.getElementById("search-in");
    si?.addEventListener("focus", () => { this._searchFocused = true; });
    si?.addEventListener("blur",  () => { this._searchFocused = false; });
    si?.addEventListener("keydown", (e) => { if (e.key === "Enter") this._doSearch(); });
    s.getElementById("search-go")?.addEventListener("click", () => this._doSearch());
  }

  _bindSeek() {
    const s = this.shadowRoot;
    const track = s.getElementById("seek-track");
    if (!track) return;
    const pct = (e) => {
      const r = track.getBoundingClientRect();
      return clamp((e.clientX - r.left) / r.width, 0, 1);
    };
    track.addEventListener("pointerdown", (e) => {
      track.classList.add("drag");
      this._prog.startDrag(pct(e));
      track.setPointerCapture(e.pointerId);
      const mv = (e) => this._prog.moveDrag(pct(e));
      const up = (e) => {
        track.classList.remove("drag");
        const ms = this._prog.endDrag();
        this._mp("media_seek", { seek_position: round2(ms / 1000) });
        track.removeEventListener("pointermove", mv);
        track.removeEventListener("pointerup", up);
      };
      track.addEventListener("pointermove", mv, { passive: true });
      track.addEventListener("pointerup", up, { once: true });
    });
  }

  _showPanel(panelId, chipId) {
    this._hidePanel(false);
    const s = this.shadowRoot;
    s.getElementById("backdrop").classList.add("open");
    s.getElementById(panelId)?.classList.add("open");
    if (chipId) s.getElementById(`chip-${chipId}`)?.classList.add("on");
    this._openPanel = { panelId, chipId };

    if (panelId === "panel-queue")   this._loadQueue();
    if (panelId === "panel-devices") this._renderDevices();
    if (panelId === "panel-lib" && !this._libItems) this._renderLibRoot();
    if (panelId === "panel-search") {
      requestAnimationFrame(() => {
        const si = this.shadowRoot.getElementById("search-in");
        if (si) { si.focus(); if (this._srResults) this._renderSearch(); }
      });
    }
  }

  _hidePanel(andBackdrop = true) {
    const s = this.shadowRoot;
    ["panel-lib","panel-search","panel-queue","panel-devices"].forEach(p => s.getElementById(p)?.classList.remove("open"));
    ["chip-lib","chip-search","chip-queue","chip-devices"].forEach(c => s.getElementById(c)?.classList.remove("on"));
    if (andBackdrop) s.getElementById("backdrop").classList.remove("open");
    this._openPanel = null;
  }

  // ── Library ───────────────────────────────────────────────────────────────

  _renderLibRoot() {
    const roots = [
      ["spotify://category/playlists",       P.library, "Playlists",       true],
      ["spotify://category/liked_songs",     P.heart,   "Liked Songs",     false],
      ["spotify://category/recently_played", P.queue,   "Recently Played", false],
      ["spotify://category/top_tracks",      P.queue,   "Top Tracks",      false],
      ["spotify://category/top_artists",     P.queue,   "Top Artists",     true],
      ["spotify://category/new_releases",    P.library, "New Releases",    true],
      ["spotify://category/featured",        P.library, "Featured",        true],
    ];
    const body = this.shadowRoot.getElementById("lib-body");
    if (!body) return;
    body.innerHTML = roots.map(([id, ico, title, exp]) => `
      <div class="item" data-id="${id}" data-exp="${exp}" data-title="${title}">
        <div class="thumb-ph">${mdi(ico, 18)}</div>
        <div class="iinfo"><div class="ititle">${title}</div></div>
        ${mdi(P.chev_r, 16)}
      </div>`).join("");
    this._bindLibItems(body);
    this._libStack = [];
    this._updateLibTitle();
  }

  _bindLibItems(container) {
    container.querySelectorAll(".item[data-id]").forEach(el => {
      el.addEventListener("click", async () => {
        const { id, exp, title } = el.dataset;
        if (exp === "true") {
          this._libStack.push({ title, id });
          this._updateLibTitle();
          await this._browseLib(id);
        } else {
          this._mp("play_media", { media_content_id: id, media_content_type: "music" });
          this._hidePanel();
        }
      });
    });
    container.querySelectorAll("[data-q]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._spotify("add_to_queue", { track_uri: btn.dataset.q });
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
          ? `<img class="thumb${item.media_class === "artist" ? " circle" : ""}" src="${item.thumbnail}" alt="" />`
          : `<div class="thumb-ph">${mdi(P.library, 16)}</div>`;
        const action = item.can_play && !item.can_expand
          ? `<button class="iact" data-q="${item.media_content_id}">${mdi(P.add_q, 16)}</button>`
          : (item.can_expand ? mdi(P.chev_r, 16) : "");
        return `
          <div class="item" data-id="${item.media_content_id}" data-exp="${item.can_expand}" data-title="${(item.title||"").replace(/"/g,"&quot;")}">
            ${thumb}
            <div class="iinfo">
              <div class="ititle">${item.title || ""}</div>
              ${item.media_class ? `<div class="isub">${item.media_class}</div>` : ""}
            </div>
            ${action}
          </div>`;
      }).join("") || `<div class="empty">Nothing here.</div>`;
      this._bindLibItems(body);
    } catch {
      body.innerHTML = `<div class="empty">Could not load. Try again.</div>`;
    }
  }

  _updateLibTitle() {
    const titleEl = this.shadowRoot.getElementById("lib-title");
    if (!titleEl) return;
    if (!this._libStack.length) {
      titleEl.innerHTML = `${mdi(P.library, 15)}&nbsp;Library`;
      return;
    }
    const crumbs = [
      `<button class="crumb" data-nav="-1">${mdi(P.home, 12)}&nbsp;Library</button>`,
      ...this._libStack.map((p, i) =>
        `<span class="crumb-sep">›</span><button class="crumb${i===this._libStack.length-1?" last":""}" data-nav="${i}">${p.title}</button>`
      ),
    ].join("");
    titleEl.innerHTML = `<div style="display:flex;align-items:center;gap:2px;overflow:hidden;flex-wrap:nowrap">${crumbs}</div>`;
    titleEl.querySelectorAll(".crumb[data-nav]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const nav = parseInt(btn.dataset.nav);
        if (nav === -1) { this._libStack = []; this._renderLibRoot(); return; }
        const t = this._libStack[nav];
        this._libStack = this._libStack.slice(0, nav);
        this._updateLibTitle();
        await this._browseLib(t.id);
      });
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async _doSearch() {
    const s = this.shadowRoot;
    const q = s.getElementById("search-in")?.value?.trim();
    if (!q) return;
    if (q !== this._srQuery) { this._srQuery = q; this._srResults = null; this._srExpand = {}; }
    const body = s.getElementById("search-body");
    if (body && !this._srResults) body.innerHTML = `<div class="loading">Searching…</div>`;
    try {
      const tok = this._hass?.auth?.data?.access_token;
      const r = await fetch(
        `/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`,
        { headers: { Authorization: `Bearer ${tok}` } }
      );
      if (r.ok) { this._srResults = await r.json(); this._renderSearch(); }
      else if (body) body.innerHTML = `<div class="empty">Search failed.</div>`;
    } catch (e) {
      if (body) body.innerHTML = `<div class="empty">Search failed.</div>`;
    }
  }

  _renderSearch() {
    const s   = this.shadowRoot;
    const body = s.getElementById("search-body");
    if (!body || !this._srResults) return;
    const R = this._srResults;

    const track = (t) => `
      <div class="item" data-play="${t.uri}">
        <img class="thumb" src="${t.album?.images?.[0]?.url||""}" alt="" />
        <div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div>
        <button class="iact" data-q="${t.uri}">${mdi(P.add_q,16)}</button>
      </div>`;
    const album = (a) => `
      <div class="item" data-play="${a.uri}">
        <img class="thumb" src="${a.images?.[0]?.url||""}" alt="" />
        <div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">${(a.artists||[]).map(x=>x.name).join(", ")}</div></div>
      </div>`;
    const artist = (a) => `
      <div class="item" data-play="${a.uri}">
        <img class="thumb circle" src="${a.images?.[0]?.url||""}" alt="" />
        <div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">Artist</div></div>
      </div>`;
    const pl = (p) => `
      <div class="item" data-play="${p.uri}">
        <img class="thumb" src="${p.images?.[0]?.url||""}" alt="" />
        <div class="iinfo"><div class="ititle">${p.name}</div><div class="isub">Playlist · ${p.owner?.display_name||""}</div></div>
      </div>`;

    const section = (label, key, renderFn, defaultCount) => {
      const items = R[key]?.items;
      if (!items?.length) return "";
      const expanded = this._srExpand[key];
      const shown    = expanded ? items : items.slice(0, defaultCount);
      const total    = R[key]?.total || items.length;
      const moreBtn  = !expanded && total > defaultCount
        ? `<button class="show-more" data-expand="${key}">Show more ${label.toLowerCase()} (${total})</button>` : "";
      return `<div class="sec">${label}</div>${shown.map(renderFn).join("")}${moreBtn}`;
    };

    const html =
      section("Tracks",    "tracks",    track,  5) +
      section("Albums",    "albums",    album,  4) +
      section("Artists",   "artists",   artist, 4) +
      section("Playlists", "playlists", pl,     4);

    body.innerHTML = html || `<div class="empty">No results.</div>`;

    body.querySelectorAll(".item[data-play]").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-q]")) return;
        this._mp("play_media", { media_content_id: el.dataset.play, media_content_type: "music" });
        this._hidePanel();
      });
    });
    body.querySelectorAll("[data-q]").forEach(btn => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); this._spotify("add_to_queue", { track_uri: btn.dataset.q }); });
    });
    body.querySelectorAll("[data-expand]").forEach(btn => {
      btn.addEventListener("click", () => { this._srExpand[btn.dataset.expand] = true; this._renderSearch(); });
    });

    // Restore focus
    const si = s.getElementById("search-in");
    if (si && this._searchFocused) requestAnimationFrame(() => si.focus());
  }

  // ── Queue ─────────────────────────────────────────────────────────────────

  async _loadQueue() {
    const body = this.shadowRoot.getElementById("queue-body");
    if (!body) return;
    body.innerHTML = `<div class="loading">Loading queue…</div>`;
    try {
      const tok = this._hass?.auth?.data?.access_token;
      const r = await fetch("/api/spotify_enhanced/queue", { headers: { Authorization: `Bearer ${tok}` } });
      if (!r.ok) throw new Error();
      const data = await r.json();
      const cur = data.currently_playing;
      const q   = data.queue || [];
      const item = (t, now = false) => {
        const imgs = t.album?.images || [];
        return `<div class="item${now?" now":""}" data-uri="${t.uri}">
          <img class="thumb" src="${imgs[0]?.url||""}" alt="" />
          <div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div>
          <span style="font-size:0.68rem;color:var(--se-txt2)">${fmt(t.duration_ms)}</span>
        </div>`;
      };
      let html = "";
      if (cur) html += `<div class="queue-now">Now Playing</div>` + item(cur, true);
      if (q.length) html += `<div class="sec">Next Up</div>` + q.slice(0, 30).map(t => item(t)).join("");
      body.innerHTML = html || `<div class="empty">Queue is empty.</div>`;
      body.querySelectorAll(".item[data-uri]").forEach(el =>
        el.addEventListener("click", () =>
          this._mp("play_media", { media_content_id: el.dataset.uri, media_content_type: "music" }))
      );
    } catch {
      body.innerHTML = `<div class="empty">Queue unavailable. Start playback first.</div>`;
    }
  }

  // ── Devices ───────────────────────────────────────────────────────────────

  _renderDevices() {
    const body = this.shadowRoot.getElementById("devices-body");
    if (!body) return;
    const devices = gDevStab.stabilise(this._devices);
    if (!devices.length) {
      body.innerHTML = `<div class="empty">No Spotify Connect devices found.<br>Open Spotify on a device to see it here.</div>`;
      return;
    }
    body.innerHTML = devices.map(d => `
      <div class="dev-item${d.id===this._devId?" now":""}" data-id="${d.id}">
        <div class="dev-icon">${mdi(P.cast, 20)}</div>
        <div class="dev-name">${d.name}</div>
        ${d.volume_percent!=null ? `<span class="dev-vol">${d.volume_percent}%</span>` : ""}
        ${d.id===this._devId ? `<div class="dev-dot"></div>` : ""}
      </div>`).join("");
    body.querySelectorAll(".dev-item[data-id]").forEach(el =>
      el.addEventListener("click", () => this._spotify("transfer_playback", { device_id: el.dataset.id }))
    );
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async _onHass() {
    const s = this.shadowRoot;
    if (!s.getElementById("play-btn")) return;

    const art = this._art;
    const bgImg  = s.getElementById("bg-img");
    const artImg = s.getElementById("art-img");
    const artWrap= s.getElementById("art-wrap");

    // Update art (only if changed)
    if (art !== this._lastArt) {
      this._lastArt = art;
      if (art) {
        if (bgImg)  bgImg.src  = art;
        if (artImg) artImg.src = art;
        artWrap?.classList.remove("no-art");
        // Extract accent colour from art
        extractDominantColor(art).then(col => {
          if (col) this.shadowRoot.host.style.setProperty("--se-accent", col);
        });
      } else {
        if (bgImg)  bgImg.src  = "";
        if (artImg) artImg.src = "";
        artWrap?.classList.add("no-art");
        this.shadowRoot.host.style.removeProperty("--se-accent");
      }
    }

    // Track name / artist
    s.getElementById("t-name").textContent = this._title || "Nothing playing";
    s.getElementById("t-sub").textContent = [this._artist, this._album].filter(Boolean).join(" · ");

    // Play button
    s.getElementById("play-btn").innerHTML = mdi(this._playing ? P.pause : P.play, 28);

    // Shuffle
    const shuf = s.getElementById("shuf-btn");
    shuf.innerHTML = mdi(P.shuffle, 22);
    shuf.classList.toggle("on", this._shuffle);
    shuf.style.visibility = this._config.show_shuffle !== false ? "" : "hidden";

    // Repeat
    const rep = s.getElementById("rep-btn");
    rep.innerHTML = mdi(this._repeat === "one" ? P.repeat_one : P.repeat, 22);
    rep.classList.toggle("on", this._repeat !== "off");
    rep.style.visibility = this._config.show_repeat !== false ? "" : "hidden";

    // Seek
    s.getElementById("seek-wrap").style.display = this._config.show_seek !== false ? "" : "none";
    this._prog.sync(this._progMs, this._durMs, this._playing);

    // Volume
    s.getElementById("vol-row").style.display = this._config.show_volume !== false ? "" : "none";
    s.getElementById("mute-btn").innerHTML = mdi(this._muted ? P.vol_off : this._vol > 50 ? P.vol_hi : P.vol_lo, 20);
    this._volCtrl?.sync(this._muted ? 0 : this._vol);

    // Like button — refresh on track change
    if (this._trackId !== this._lastTrack) {
      this._lastTrack = this._trackId;
      gLikes.check(this._trackId, this._hass).then(() => this._updateLike(gLikes.isLiked(this._trackId)));
    }
    this._updateLike(gLikes.isLiked(this._trackId));

    // Keep devices panel live
    if (this._openPanel?.panelId === "panel-devices") this._renderDevices();
  }

  _updateLike(liked) {
    const btn = this.shadowRoot.getElementById("like-btn");
    if (!btn) return;
    btn.innerHTML = mdi(liked ? P.heart : P.heart_out, 18);
    btn.classList.toggle("liked", liked);
    btn.title = liked ? "Remove from Liked Songs" : "Save to Liked Songs";
  }
}

customElements.define("spotify-enhanced-card", SpotifyEnhancedCard);

// ─── MINI CARD ────────────────────────────────────────────────────────────────

class SpotifyMiniCard extends SpotifyBase {
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config = { show_volume: true, ...c };
    this._ready = false; this._build(); this._ready = true;
    if (this._hass) this._onHass();
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        ${CSS()}
        ha-card { flex-direction: row; align-items: center; padding: 10px 12px; gap: 10px; height: auto; }
        img.art { width: 46px; height: 46px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: var(--se-bg2); }
        .info { flex: 1; min-width: 0; }
        .t { font-size: 0.87rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--se-txt); }
        .a { font-size: 0.73rem; color: var(--se-txt2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
        .vr { display: flex; align-items: center; gap: 4px; margin-top: 5px; }
        .vr .vol-track { flex: 1; }
        .ctrls { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
        .cb { width: 32px; height: 32px; border-radius: 50%; color: var(--se-txt2); }
        .cb:hover { background: var(--se-bg2); color: var(--se-txt); }
        .pb { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.9) !important; color: #000 !important; }
        .pb:hover { background: #fff !important; }
      </style>
      <ha-card>
        <img class="art" id="art" src="" alt="" />
        <div class="info">
          <div class="t" id="t">Nothing playing</div>
          <div class="a" id="a"></div>
          <div class="vr" id="vr">
            <button class="cb" id="mute">${mdi(P.vol_lo,15)}</button>
            <div class="vol-track" id="vt"><div class="vol-fill" id="vf"></div><div class="vol-thumb"></div></div>
          </div>
        </div>
        <div class="ctrls">
          <button class="cb" id="prev">${mdi(P.prev,20)}</button>
          <button class="pb" id="play">${mdi(P.play,22)}</button>
          <button class="cb" id="next">${mdi(P.next,20)}</button>
        </div>
      </ha-card>`;
    const s = this.shadowRoot;
    s.getElementById("play").addEventListener("click", () => this._mp(this._playing ? "media_pause" : "media_play"));
    s.getElementById("prev").addEventListener("click", () => this._mp("media_previous_track"));
    s.getElementById("next").addEventListener("click", () => this._mp("media_next_track"));
    s.getElementById("mute").addEventListener("click", () => this._mp("volume_mute", { is_volume_muted: !this._muted }));
    this._vc = new VolumeCtrl(s.getElementById("vt"), s.getElementById("vf"), (pct) => this._mp("volume_set", { volume_level: round2(pct) }));
  }

  _onHass() {
    const s = this.shadowRoot;
    if (!s.getElementById("art")) return;
    s.getElementById("art").src = this._art;
    s.getElementById("t").textContent = this._title || "Nothing playing";
    s.getElementById("a").textContent = this._artist;
    s.getElementById("play").innerHTML = mdi(this._playing ? P.pause : P.play, 22);
    s.getElementById("mute").innerHTML = mdi(this._muted ? P.vol_off : P.vol_lo, 16);
    s.getElementById("vr").style.display = this._config.show_volume !== false ? "flex" : "none";
    this._vc?.sync(this._muted ? 0 : this._vol);
  }
}
customElements.define("spotify-mini-card", SpotifyMiniCard);

// ─── DEVICE CARD ─────────────────────────────────────────────────────────────

class SpotifyDeviceCard extends SpotifyBase {
  static getStubConfig() { return { entity: "media_player.spotify_enhanced", title: "Spotify Devices" }; }

  setConfig(c) {
    this._config = { title: "Spotify Devices", ...c };
    this._ready = false; this._build(); this._ready = true;
    if (this._hass) this._onHass();
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        ${CSS()}
        ha-card { height: auto; }
        .hdr { padding: 14px 14px 6px; font-size: 0.82rem; font-weight: 700; color: var(--se-txt2); display: flex; align-items: center; gap: 6px; }
        .dev-item { display: flex; align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer; transition: background 0.12s; }
        .dev-item:hover { background: rgba(255,255,255,0.06); }
        .dev-item.now { background: color-mix(in srgb, var(--se-accent) 12%, transparent); }
        .di { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: var(--se-txt2); flex-shrink: 0; }
        .dn { flex: 1; font-size: 0.88rem; font-weight: 500; }
        .dv { font-size: 0.73rem; color: var(--se-txt2); }
        .dd { width: 7px; height: 7px; border-radius: 50%; background: var(--se-accent); flex-shrink: 0; }
        .empty { text-align: center; padding: 24px; color: var(--se-txt2); font-size: 0.82rem; }
      </style>
      <ha-card>
        <div class="hdr">${mdi(P.cast,16)}&nbsp;${this._config.title}</div>
        <div id="list"><div class="empty">Loading…</div></div>
      </ha-card>`;
  }

  _onHass() {
    const list = this.shadowRoot.getElementById("list");
    if (!list) return;
    const devices = gDevStab.stabilise(this._devices);
    if (!devices.length) { list.innerHTML = `<div class="empty">No devices. Open Spotify on a device.</div>`; return; }
    list.innerHTML = devices.map(d => `
      <div class="dev-item${d.id===this._devId?" now":""}" data-id="${d.id}">
        <div class="di">${mdi(P.cast,20)}</div>
        <div class="dn">${d.name}</div>
        ${d.volume_percent!=null ? `<span class="dv">${d.volume_percent}%</span>` : ""}
        ${d.id===this._devId ? `<div class="dd"></div>` : ""}
      </div>`).join("");
    list.querySelectorAll(".dev-item[data-id]").forEach(el =>
      el.addEventListener("click", () => this._spotify("transfer_playback", { device_id: el.dataset.id }))
    );
  }
}
customElements.define("spotify-device-card", SpotifyDeviceCard);

// ─── SEARCH CARD ─────────────────────────────────────────────────────────────

class SpotifySearchCard extends SpotifyBase {
  constructor() { super(); this._q = ""; this._r = null; this._exp = {}; this._focused = false; }
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config = c;
    this._ready = false; this._build(); this._ready = true;
    if (this._hass) this._onHass();
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        ${CSS()}
        ha-card { height: auto; display: flex; flex-direction: column; }
        .sb { display: flex; gap: 6px; padding: 12px 14px 8px; flex-shrink: 0; }
        .si { flex: 1; background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--se-txt); padding: 8px 10px; font-size: 0.88rem; outline: none; transition: border-color 0.15s; }
        .si::placeholder { color: var(--se-txt2); }
        .si:focus { border-color: var(--se-accent); }
        .sg { background: var(--se-accent) !important; color: #000 !important; border-radius: 8px; width: 38px; height: 38px; flex-shrink: 0; }
        .body { overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        .body::-webkit-scrollbar { width: 3px; }
        .sec { padding: 8px 14px 3px; font-size: 0.63rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--se-txt2); }
        .item { display: flex; align-items: center; gap: 10px; padding: 7px 14px; cursor: pointer; transition: background 0.1s; }
        .item:hover { background: rgba(255,255,255,0.06); }
        .thumb { width: 40px; height: 40px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: rgba(255,255,255,0.08); }
        .thumb.circle { border-radius: 50%; }
        .iinfo { flex: 1; min-width: 0; }
        .ititle { font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--se-txt); }
        .isub { font-size: 0.72rem; color: var(--se-txt2); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .iact { width: 30px; height: 30px; border-radius: 50%; color: var(--se-txt2); flex-shrink: 0; }
        .iact:hover { background: rgba(255,255,255,0.1); color: var(--se-txt); }
        .show-more { display: block; width: 100%; padding: 7px; text-align: center; font-size: 0.75rem; color: var(--se-accent); background: transparent; border-top: 1px solid rgba(255,255,255,0.06); }
        .show-more:hover { background: rgba(255,255,255,0.05); }
        .empty { text-align: center; padding: 24px; color: var(--se-txt2); font-size: 0.82rem; }
        .loading { text-align: center; padding: 20px; color: var(--se-txt2); }
      </style>
      <ha-card>
        <div class="sb">
          <input class="si" id="si" placeholder="Search Spotify…" autocomplete="off" />
          <button class="sg" id="sg">${mdi(P.search,16)}</button>
        </div>
        <div class="body" id="body"></div>
      </ha-card>`;
    const go = async () => {
      const q = this.shadowRoot.getElementById("si")?.value?.trim();
      if (!q) return;
      if (q !== this._q) { this._q = q; this._r = null; this._exp = {}; }
      const body = this.shadowRoot.getElementById("body");
      if (body && !this._r) body.innerHTML = `<div class="loading">Searching…</div>`;
      try {
        const tok = this._hass?.auth?.data?.access_token;
        const r = await fetch(`/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`, { headers: { Authorization: `Bearer ${tok}` } });
        if (r.ok) { this._r = await r.json(); this._render(); }
        else if (body) body.innerHTML = `<div class="empty">Search failed.</div>`;
      } catch { if (body) this.shadowRoot.getElementById("body").innerHTML = `<div class="empty">Search failed.</div>`; }
    };
    this.shadowRoot.getElementById("sg")?.addEventListener("click", go);
    this.shadowRoot.getElementById("si")?.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    this.shadowRoot.getElementById("si")?.addEventListener("focus", () => { this._focused = true; });
    this.shadowRoot.getElementById("si")?.addEventListener("blur",  () => { this._focused = false; });
  }

  _render() {
    const s = this.shadowRoot;
    const body = s.getElementById("body");
    if (!body || !this._r) return;
    const R = this._r;
    const t = (t) => `<div class="item" data-play="${t.uri}"><img class="thumb" src="${t.album?.images?.[0]?.url||""}" alt="" /><div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div><button class="iact" data-q="${t.uri}">${mdi(P.add_q,16)}</button></div>`;
    const a = (a) => `<div class="item" data-play="${a.uri}"><img class="thumb" src="${a.images?.[0]?.url||""}" alt="" /><div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">${(a.artists||[]).map(x=>x.name).join(", ")}</div></div></div>`;
    const ar= (a) => `<div class="item" data-play="${a.uri}"><img class="thumb circle" src="${a.images?.[0]?.url||""}" alt="" /><div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">Artist</div></div></div>`;
    const pl= (p) => `<div class="item" data-play="${p.uri}"><img class="thumb" src="${p.images?.[0]?.url||""}" alt="" /><div class="iinfo"><div class="ititle">${p.name}</div><div class="isub">Playlist · ${p.owner?.display_name||""}</div></div></div>`;
    const sec = (label, key, fn, n) => {
      const items = R[key]?.items; if (!items?.length) return "";
      const exp = this._exp[key];
      const shown = exp ? items : items.slice(0, n);
      const more  = !exp && (R[key]?.total||items.length) > n ? `<button class="show-more" data-expand="${key}">Show more ${label.toLowerCase()} (${R[key]?.total||items.length})</button>` : "";
      return `<div class="sec">${label}</div>${shown.map(fn).join("")}${more}`;
    };
    const html = sec("Tracks","tracks",t,5)+sec("Albums","albums",a,4)+sec("Artists","artists",ar,4)+sec("Playlists","playlists",pl,4);
    body.innerHTML = html || `<div class="empty">No results.</div>`;
    body.querySelectorAll(".item[data-play]").forEach(el => el.addEventListener("click", (e) => { if (e.target.closest("[data-q]")) return; this._mp("play_media", { media_content_id: el.dataset.play, media_content_type: "music" }); }));
    body.querySelectorAll("[data-q]").forEach(btn => btn.addEventListener("click", (e) => { e.stopPropagation(); this._spotify("add_to_queue", { track_uri: btn.dataset.q }); }));
    body.querySelectorAll("[data-expand]").forEach(btn => btn.addEventListener("click", () => { this._exp[btn.dataset.expand] = true; this._render(); }));
    const si = s.getElementById("si");
    if (si && this._focused) requestAnimationFrame(() => si.focus());
  }

  _onHass() {}
}
customElements.define("spotify-search-card", SpotifySearchCard);

// ─── QUEUE CARD ──────────────────────────────────────────────────────────────

class SpotifyQueueCard extends SpotifyBase {
  constructor() { super(); this._data = null; this._loading = false; }
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config = c;
    this._ready = false; this._build(); this._ready = true;
    if (this._hass) this._onHass();
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        ${CSS()}
        ha-card { height: auto; display: flex; flex-direction: column; }
        .hdr { padding: 14px 14px 8px; font-size: 0.82rem; font-weight: 700; color: var(--se-txt2); display: flex; align-items: center; justify-content: space-between; }
        .rb { width: 30px; height: 30px; border-radius: 50%; color: var(--se-txt2); }
        .rb:hover { background: rgba(255,255,255,0.08); }
        .body { overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        .body::-webkit-scrollbar { width: 3px; }
        .now { padding: 8px 14px 3px; font-size: 0.63rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--se-accent); }
        .sec { padding: 8px 14px 3px; font-size: 0.63rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--se-txt2); }
        .item { display: flex; align-items: center; gap: 10px; padding: 7px 14px; cursor: pointer; transition: background 0.1s; }
        .item:hover { background: rgba(255,255,255,0.06); }
        .item.np { background: rgba(255,255,255,0.1); }
        .thumb { width: 40px; height: 40px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: rgba(255,255,255,0.08); }
        .iinfo { flex: 1; min-width: 0; }
        .ititle { font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--se-txt); }
        .isub { font-size: 0.72rem; color: var(--se-txt2); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dur { font-size: 0.68rem; color: var(--se-txt2); flex-shrink: 0; }
        .empty { text-align: center; padding: 24px; color: var(--se-txt2); font-size: 0.82rem; }
        .loading { text-align: center; padding: 20px; color: var(--se-txt2); }
      </style>
      <ha-card>
        <div class="hdr">
          <span style="display:flex;align-items:center;gap:6px">${mdi(P.queue,16)}&nbsp;Queue</span>
          <button class="rb" id="reload" title="Refresh">${mdi(P.refresh,18)}</button>
        </div>
        <div class="body" id="body"><div class="loading">Loading…</div></div>
      </ha-card>`;
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
    const item = (t, np = false) => {
      const imgs = t.album?.images || [];
      return `<div class="item${np?" np":""}" data-uri="${t.uri}">
        <img class="thumb" src="${imgs[0]?.url||""}" alt="" />
        <div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div>
        <span class="dur">${fmt(t.duration_ms)}</span>
      </div>`;
    };
    let html = "";
    if (cur) html += `<div class="now">Now Playing</div>` + item(cur, true);
    if (q.length) html += `<div class="sec">Next Up</div>` + q.slice(0, 30).map(t => item(t)).join("");
    body.innerHTML = html || `<div class="empty">Queue is empty.</div>`;
    body.querySelectorAll(".item[data-uri]").forEach(el =>
      el.addEventListener("click", () => this._mp("play_media", { media_content_id: el.dataset.uri, media_content_type: "music" }))
    );
  }

  _onHass() { if (!this._data && !this._loading) this._load(); }
}
customElements.define("spotify-queue-card", SpotifyQueueCard);

// ─── VISUAL EDITOR ───────────────────────────────────────────────────────────

class SpotifyEnhancedCardEditor extends HTMLElement {
  set hass(h) {
    this._hass = h;
    const p = this.querySelector("ha-entity-picker");
    if (p) p.hass = h;
  }

  setConfig(c) {
    this._config = c;
    this._render();
  }

  _render() {
    const c = this._config || {};
    const tog = (key, label, def = true) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--divider-color,#eee)">
        <span style="font-size:0.9rem">${label}</span>
        <ha-switch data-key="${key}" ${c[key] !== false && (c[key] || def) ? "checked" : ""}></ha-switch>
      </div>`;

    this.innerHTML = `
      <style>
        :host { display:block; padding: 6px 0; }
        ha-entity-picker { display:block; margin-bottom:14px; }
        .sh { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.7px; color:var(--secondary-text-color); margin:14px 0 5px; }
      </style>

      <ha-entity-picker
        .hass="${this._hass||null}"
        .value="${c.entity||""}"
        .includeDomains="${["media_player"]}"
        label="Spotify Media Player Entity"
      ></ha-entity-picker>

      <div class="sh">Controls</div>
      ${tog("show_seek",    "Show seek bar")}
      ${tog("show_volume",  "Show volume")}
      ${tog("show_shuffle", "Show shuffle")}
      ${tog("show_repeat",  "Show repeat")}
    `;

    const p = this.querySelector("ha-entity-picker");
    if (p) {
      p.hass = this._hass;
      p.addEventListener("value-changed", (e) => this._set("entity", e.detail.value));
    }
    this.querySelectorAll("ha-switch[data-key]").forEach(sw =>
      sw.addEventListener("change", (e) => this._set(sw.dataset.key, e.target.checked))
    );
  }

  _set(key, val) {
    this._config = { ...this._config, [key]: val };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }
}
customElements.define("spotify-enhanced-card-editor", SpotifyEnhancedCardEditor);

// ─── Registration ─────────────────────────────────────────────────────────────

window.customCards = window.customCards || [];
window.customCards.push(
  { type: "spotify-enhanced-card", name: "Spotify Enhanced — Media Deck",    description: "Full player with art, controls, library, search, queue and device switching.", preview: true },
  { type: "spotify-mini-card",     name: "Spotify Enhanced — Mini Player",   description: "Compact single-row playback control.",                                          preview: true },
  { type: "spotify-device-card",   name: "Spotify Enhanced — Device Picker", description: "Browse and switch Spotify Connect devices.",                                     preview: true },
  { type: "spotify-search-card",   name: "Spotify Enhanced — Search",        description: "Standalone Spotify search card.",                                                preview: true },
  { type: "spotify-queue-card",    name: "Spotify Enhanced — Queue",         description: "View and manage the current playback queue.",                                    preview: true },
);

console.info(
  `%c SPOTIFY ENHANCED %c v${VERSION} `,
  "color:#fff;background:#1DB954;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px",
  "color:#1DB954;background:#111;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0"
);
