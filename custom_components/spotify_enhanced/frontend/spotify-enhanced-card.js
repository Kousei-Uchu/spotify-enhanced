/**
 * Spotify Enhanced Card  v1.1.0
 *
 * Built directly on hui-media-control-card source patterns:
 * - Same background/image/gradient/colour-extraction layout
 * - Same control button sizing and positioning
 * - Same progress bar (mwc-linear-progress style, but custom for drag support)
 * - ResizeObserver for responsive narrow/veryNarrow layout
 * - extractColors() equivalent via canvas sampling
 * - Marquee scrolling for long titles (pointer-events based)
 *
 * Extra cards:
 *   spotify-mini-card     Slim row
 *   spotify-device-card   Device picker
 *   spotify-search-card   Standalone search
 *   spotify-queue-card    Queue viewer with swipe-to-remove
 *   spotify-lyrics-card   Time-synced lyrics
 */

const VERSION = "1.1.0";

// ─── Utilities ───────────────────────────────────────────────────────────────

const fmt = (secs) => {
  if (secs == null || isNaN(secs)) return "0:00";
  const t = Math.max(0, Math.floor(secs));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (v) => String(v).padStart(2, "0");
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = (n) => Math.round(n * 100) / 100;

// Debounce (same as HA source)
const debounce = (fn, wait, immediate = false) => {
  let timeout;
  return function (...args) {
    const later = () => { timeout = null; if (!immediate) fn.apply(this, args); };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) fn.apply(this, args);
  };
};

// Inline MDI paths — same icons as HA source where possible
const MDI = {
  play:         "M8 5.14v14l11-7z",
  pause:        "M14 19h4V5h-4M6 19h4V5H6v14z",
  stop:         "M18 18H6V6h12v12z",
  next:         "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
  prev:         "M6 6h2v12H6zm3.5 6 8.5 6V6z",
  shuffle:      "M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  shuffle_off:  "M10.72 11.06 8.43 8.77C7.91 9.4 7.47 10.1 7.17 10.86L4.93 8.62C5.5 7.59 6.27 6.67 7.22 5.92L5.03 3.73l1.41-1.41 15.56 15.56-1.41 1.41-2.19-2.19c-.92.68-2.03 1.09-3.4 1.38V20.5h-2v-2.07c-1.33-.2-2.54-.73-3.56-1.52L3 14.5l1-1.73 3.44 1.99c-.04-.25-.07-.5-.07-.76 0-.71.17-1.38.44-1.98l2.91 2.91zM21 5.5l-1 1.73-4.35-2.52-.07.04V7h-2V4.93c-1.4.26-2.54.82-3.45 1.62l1.44 1.44C12.2 7.36 13.05 7 14 7c2.76 0 5 2.24 5 5 0 .28-.03.54-.07.8l1.63.94C20.82 12.62 21 11.83 21 11c0-1.7-.63-3.22-1.64-4.37L21 5.5z",
  repeat:       "M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  repeat_off:   "M6 6h12v3l4-4-4-4v3H4v6h2V6zm14 12H8v-3l-4 4 4 4v-3h14v-6h-2v5z",
  repeat_one:   "M13 15V9h-1l-2 1v1h1.5v4M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  vol_off:      "M16.5 12c0-1.77-1-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z",
  vol_lo:       "M18.5 12c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03zM5 9v6h4l5 5V4L9 9H5z",
  vol_hi:       "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
  heart:        "M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53z",
  heart_out:    "M12.1 18.55l-.1.1-.11-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04 1 3.57 2.36h1.86C13.46 6 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05M16.5 3c-1.74 0-3.41.81-4.5 2.08C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.41 2 8.5c0 3.77 3.4 6.86 8.55 11.53L12 21.35l1.45-1.32C18.6 15.36 22 12.27 22 8.5 22 5.41 19.58 3 16.5 3z",
  cast:         "M1 18v3h3a3 3 0 0 0-3-3zm0-4v2a7 7 0 0 1 7 7h2c0-5-4-9-9-9zm0-4v2c6.07 0 11 4.93 11 11h2C14 15.93 8.07 10 1 10zm20-7H3C1.9 3 1 3.9 1 5v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
  search:       "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  queue:        "M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z",
  library:      "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
  close:        "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  dots:         "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  browse:       "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  chev_r:       "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  home:         "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  add_q:        "M13 8H3V6h10v2zm0 4H3v-2h10v2zm4 4H3v-2h14v2zm-1 6v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3z",
  delete:       "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  lyrics:       "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
  mic:          "M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V5a3 3 0 0 1 3-3m7 9c0 3.53-2.61 6.44-6 6.93V21h-2v-3.07c-3.39-.49-6-3.4-6-6.93h2a5 5 0 0 0 5 5 5 5 0 0 0 5-5h2z",
  refresh:      "M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  play_box:     "M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 12.5v-7l6 3.5-6 3.5z",
};

const icon = (path, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" style="flex-shrink:0;display:block;pointer-events:none"><path d="${path}"/></svg>`;

// ─── Colour extraction (same purpose as HA's extractColors) ──────────────────

async function extractColors(imgUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, 64, 64);
        const d = ctx.getImageData(0, 0, 64, 64).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          // Skip very dark or near-white pixels
          const brightness = (d[i] * 299 + d[i+1] * 587 + d[i+2] * 114) / 1000;
          if (brightness > 20 && brightness < 240) {
            r += d[i]; g += d[i+1]; b += d[i+2]; n++;
          }
        }
        if (!n) { resolve(null); return; }
        r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
        // Ensure minimum saturation / brightness for bg
        const max = Math.max(r, g, b);
        const mul = max < 80 ? 80 / max : 1;
        resolve({
          background: `rgb(${Math.round(r*mul)},${Math.round(g*mul)},${Math.round(b*mul)})`,
          foreground: (r*mul*299 + g*mul*587 + b*mul*114) / 1000 > 128 ? "#000" : "#fff",
        });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = imgUrl;
  });
}

// ─── Device list stabiliser ──────────────────────────────────────────────────

const _devOrder = [];
function stabiliseDevices(devices) {
  if (!devices?.length) { _devOrder.length = 0; return []; }
  const ids = new Set(devices.map(d => d.id));
  // Remove gone devices
  for (let i = _devOrder.length - 1; i >= 0; i--) {
    if (!ids.has(_devOrder[i])) _devOrder.splice(i, 1);
  }
  // Append new ones
  for (const d of devices) {
    if (!_devOrder.includes(d.id)) _devOrder.push(d.id);
  }
  const map = Object.fromEntries(devices.map(d => [d.id, d]));
  return _devOrder.map(id => map[id]).filter(Boolean);
}

// ─── Liked-songs tracker ─────────────────────────────────────────────────────

const _liked = new Set();
const _likedPending = new Set();

async function checkLiked(trackId, hass) {
  if (!trackId || _likedPending.has(trackId)) return;
  _likedPending.add(trackId);
  try {
    const tok = hass?.auth?.data?.access_token;
    if (!tok) return;
    const r = await fetch(`/api/spotify_enhanced/liked?ids=${trackId}`,
      { headers: { Authorization: `Bearer ${tok}` } });
    if (r.ok) {
      const data = await r.json();
      if (data?.[0]) _liked.add(trackId); else _liked.delete(trackId);
    }
  } catch {}
  finally { _likedPending.delete(trackId); }
}

function toggleLiked(trackId, hass) {
  if (!trackId) return false;
  if (_liked.has(trackId)) {
    _liked.delete(trackId);
    hass?.callService("spotify_enhanced", "remove_track", { track_id: [trackId] });
  } else {
    _liked.add(trackId);
    hass?.callService("spotify_enhanced", "save_track", { track_id: [trackId] });
  }
  return _liked.has(trackId);
}

// ─── Progress (getCurrentProgress equivalent from HA source) ─────────────────
// The HA source uses: progress += (Date.now() - new Date(updated_at).getTime()) / 1000
// We replicate this exactly so there's no jumpiness — we never fight HA's own value,
// we just extrapolate it between state updates.

class ProgressTracker {
  constructor() {
    this._pos  = 0;   // last known position in seconds (from HA)
    this._dur  = 0;
    this._updatedAt = 0; // timestamp when HA last updated position
    this._playing = false;
    this._raf = null;
    // DOM refs set by owner
    this.fillEl  = null;
    this.curEl   = null;
    this.durEl   = null;
    // Drag state
    this._drag   = false;
    this._dragPct= 0;
  }

  /** Call on every hass update */
  sync(stateObj) {
    if (this._drag) return;
    const attrs = stateObj?.attributes ?? {};
    this._pos      = attrs.media_position     ?? 0;
    this._dur      = attrs.media_duration     ?? 0;
    this._playing  = stateObj?.state === "playing";
    // Use the same formula as HA getCurrentProgress
    this._updatedAt = attrs.media_position_updated_at
      ? new Date(attrs.media_position_updated_at).getTime()
      : Date.now();

    if (this._playing) {
      if (!this._raf) this._raf = requestAnimationFrame(() => this._tick());
    } else {
      cancelAnimationFrame(this._raf);
      this._raf = null;
      this._paint(this._pos);
    }
  }

  /** Current extrapolated position in seconds — mirrors HA getCurrentProgress */
  get current() {
    if (!this._playing) return this._pos;
    const elapsed = (Date.now() - this._updatedAt) / 1000;
    return clamp(this._pos + elapsed, 0, this._dur || Infinity);
  }

  _tick() {
    this._raf = null;
    if (!this._playing || this._drag) return;
    this._paint(this.current);
    this._raf = requestAnimationFrame(() => this._tick());
  }

  _paint(secs) {
    const pct = this._dur ? clamp((secs / this._dur) * 100, 0, 100) : 0;
    if (this.fillEl)  this.fillEl.style.width   = `${pct}%`;
    if (this.curEl)   this.curEl.textContent     = fmt(secs);
    if (this.durEl)   this.durEl.textContent     = fmt(this._dur);
  }

  startDrag(pct) {
    this._drag    = true;
    this._dragPct = clamp(pct, 0, 1);
    this._paint(this._dragPct * this._dur);
  }

  moveDrag(pct) {
    if (!this._drag) return;
    this._dragPct = clamp(pct, 0, 1);
    this._paint(this._dragPct * this._dur);
  }

  endDrag() {
    const secs  = this._dragPct * this._dur;
    this._drag  = false;
    // Immediately adopt the new position so there's no snap-back
    this._pos       = secs;
    this._updatedAt = Date.now();
    if (this._playing) this._raf = requestAnimationFrame(() => this._tick());
    return secs; // caller seeks to this value
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this._raf = null;
  }
}

// ─── Volume drag (pointer-capture, no native input) ──────────────────────────

class VolumeDrag {
  constructor(trackEl, fillEl, thumbEl, onChange) {
    this._track   = trackEl;
    this._fill    = fillEl;
    this._thumb   = thumbEl;
    this._onChange= onChange;
    this._pct     = 0;
    this._drag    = false;
    if (!trackEl) return;

    trackEl.addEventListener("pointerdown", (e) => {
      this._drag = true;
      trackEl.setPointerCapture(e.pointerId);
      this._update(e);
      trackEl.addEventListener("pointermove", this._onMove = (e) => this._update(e), { passive: true });
      trackEl.addEventListener("pointerup",   this._onUp   = (e) => {
        this._update(e);
        this._drag = false;
        this._onChange(this._pct);
        trackEl.removeEventListener("pointermove", this._onMove);
        trackEl.removeEventListener("pointerup",   this._onUp);
      }, { once: true });
    });
  }

  _update(e) {
    const r = this._track.getBoundingClientRect();
    this._pct = clamp((e.clientX - r.left) / r.width, 0, 1);
    this._render();
  }

  _render() {
    const w = `${this._pct * 100}%`;
    if (this._fill)  this._fill.style.width = w;
    if (this._thumb) this._thumb.style.left = w;
  }

  /** Sync from HA state — only when not dragging */
  sync(pct01) {
    if (this._drag) return;
    this._pct = clamp(pct01, 0, 1);
    this._render();
  }
}

// ─── Marquee (scrolling text for long titles — same as hui-marquee) ───────────

function buildMarqueeCSS() {
  return `
    .marquee-wrap {
      overflow: hidden;
      white-space: nowrap;
      position: relative;
    }
    .marquee-inner {
      display: inline-block;
      padding-right: 32px;
    }
    .marquee-inner.scrolling {
      animation: marquee-scroll var(--marquee-dur, 8s) linear infinite;
    }
    @keyframes marquee-scroll {
      0%   { transform: translateX(0); }
      100% { transform: translateX(var(--marquee-offset, -50%)); }
    }
  `;
}

function startMarquee(wrapEl) {
  const inner = wrapEl.querySelector(".marquee-inner");
  if (!inner) return;
  const ww = wrapEl.offsetWidth;
  const iw = inner.scrollWidth;
  if (iw <= ww) { inner.classList.remove("scrolling"); return; }
  const dist = iw - ww + 32;
  const dur  = Math.max(4, dist / 40); // 40px/s
  inner.style.setProperty("--marquee-dur",    `${dur}s`);
  inner.style.setProperty("--marquee-offset", `-${dist}px`);
  inner.classList.add("scrolling");
}

function stopMarquee(wrapEl) {
  wrapEl?.querySelector(".marquee-inner")?.classList.remove("scrolling");
}

// ─── Base class ──────────────────────────────────────────────────────────────

class SpotifyBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass  = null;
    this._config = {};
    this._ready = false;
  }

  set hass(h) {
    const prev = this._hass;
    this._hass = h;
    if (this._ready) this._onHass(prev);
  }

  setConfig(c) {
    this._config = c;
    this._ready  = false;
    this._build();
    this._ready  = true;
    if (this._hass) this._onHass(null);
  }

  // ── Entity accessors ───────────────────────────────────────────────────────
  get _so()       { return this._hass?.states?.[this._config?.entity]; }
  get _attrs()    { return this._so?.attributes ?? {}; }
  get _state()    { return this._so?.state ?? "idle"; }
  get _playing()  { return this._state === "playing"; }
  get _title()    { return this._attrs.media_title ?? ""; }
  get _artist()   { return this._attrs.media_artist ?? ""; }
  get _album()    { return this._attrs.media_album_name ?? ""; }
  get _art()      {
    // entity_picture_local takes priority (same as HA source)
    return this._attrs.entity_picture_local || this._attrs.entity_picture || "";
  }
  get _vol()      { return clamp((this._attrs.volume_level ?? 0) * 100, 0, 100); }
  get _muted()    { return this._attrs.is_volume_muted ?? false; }
  get _shuffle()  { return this._attrs.shuffle ?? false; }
  get _repeat()   { return this._attrs.repeat ?? "off"; }
  get _durSecs()  { return this._attrs.media_duration ?? 0; }
  get _posSecs()  { return this._attrs.media_position ?? 0; }
  get _devices()  { return this._attrs.spotify_devices ?? []; }
  get _devId()    { return this._attrs.device_id ?? null; }
  get _trackId()  { return this._attrs.track_id ?? null; }

  _call(domain, service, data = {}) {
    this._hass?.callService(domain, service, data);
  }
  _spotify(s, d = {}) { this._call("spotify_enhanced", s, d); }
  _mp(s, d = {})      { this._call("media_player", s, { entity_id: this._config.entity, ...d }); }

  _build()        {}
  _onHass(prev)   {}
}

// ─── CSS shared across all cards ─────────────────────────────────────────────
// Follows hui-media-control-card.styles exactly, extended for our panels.

const CARD_CSS = `
  /* === Reset === */
  *, *::before, *::after { box-sizing: border-box; }

  /* === ha-card === */
  ha-card {
    overflow: hidden;
    height: 100%;
    position: relative;
    color: var(--primary-text-color);
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* === Background layer (identical to HA source) === */
  .background {
    display: flex;
    position: absolute;
    top: 0; left: 0;
    height: 100%; width: 100%;
    transition: filter 0.8s;
  }
  .color-block {
    background-color: var(--primary-color);
    transition: background-color 0.8s;
    width: 100%;
  }
  .color-gradient {
    position: absolute;
    height: 100%; right: 0;
    opacity: 1;
    transition: width 0.8s, opacity 0.8s linear 0.8s;
  }
  .image {
    background-color: var(--primary-color);
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    position: absolute; right: 0;
    height: 100%;
    opacity: 1;
    transition: width 0.8s, background-image 0.8s, background-color 0.8s, opacity 0.8s linear 0.8s;
  }
  .no-image .image { opacity: 0; }
  .no-img {
    background-color: var(--primary-color);
    background-size: initial;
    background-repeat: no-repeat;
    background-position: center center;
    position: absolute; right: 0;
    height: 100%;
    background-image: url("/static/images/card_media_player_bg.png");
    width: 50%;
    transition: opacity 0.8s, background-color 0.8s;
  }
  .off .image, .off .color-gradient { opacity: 0; transition: opacity 0s, width 0.8s; width: 0; }
  .unavailable .no-img, .background:not(.off):not(.no-image) .no-img { opacity: 0; }
  .off.background { filter: grayscale(1); }

  /* === Player layer (identical to HA source layout) === */
  .player {
    position: relative;
    padding: 16px;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: var(--text-primary-color);
    transition-property: color, padding;
    transition-duration: 0.4s;
  }
  .top-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .icon-name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    overflow: hidden;
  }
  .media-info {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
  .media-title {
    font-size: 1.2em;
    margin: 0 0 4px;
  }
  .media-description {
    font-size: 0.85em;
    opacity: 0.8;
  }
  .title-controls {
    padding-top: 16px;
  }

  /* === Action buttons (HA source sizing) === */
  .controls {
    padding: 8px 8px 8px 0;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-left: -12px;
    direction: ltr;
  }
  .controls > .start { display: flex; align-items: center; flex-grow: 1; }
  .controls > .end   { display: flex; align-items: center; }

  .ctrl-btn {
    appearance: none; background: none; border: none;
    cursor: pointer; color: inherit; padding: 0; margin: 0;
    display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px;
    border-radius: 50%;
    transition: opacity 0.15s, transform 0.12s, background 0.15s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .ctrl-btn:hover  { opacity: 0.8; }
  .ctrl-btn:active { transform: scale(0.88); opacity: 0.7; }
  .ctrl-btn.active { color: var(--accent-color, var(--primary-color)); }

  /* Play/pause is larger — matches HA source exactly */
  .ctrl-btn.play-pause {
    width: 56px; height: 56px;
  }
  .ctrl-btn.play-pause svg { width: 40px; height: 40px; }

  /* Secondary action buttons (browse, etc) are smaller */
  .ctrl-btn.secondary { width: 36px; height: 36px; }
  .ctrl-btn.secondary svg { width: 24px; height: 24px; }

  /* === Progress bar (replaces mwc-linear-progress) === */
  .progress-wrap {
    margin-top: 4px;
    padding-bottom: 2px;
  }
  .progress-bar {
    position: relative;
    width: 100%;
    height: 4px;
    background: rgba(255,255,255,0.3);
    border-radius: 2px;
    cursor: pointer;
    touch-action: none;
    transition: height 0.1s;
  }
  .progress-bar:hover, .progress-bar.dragging { height: 6px; }
  .progress-fill {
    position: absolute; left: 0; top: 0;
    height: 100%;
    background: var(--accent-color, currentColor);
    border-radius: 2px;
    pointer-events: none;
    /* NO CSS transition — we paint every rAF frame */
  }
  .progress-thumb {
    position: absolute; top: 50%;
    width: 14px; height: 14px; border-radius: 50%;
    background: currentColor;
    transform: translate(-50%, -50%);
    opacity: 0; transition: opacity 0.15s;
    pointer-events: none;
    left: 0; /* updated via style.left */
  }
  .progress-bar:hover  .progress-thumb,
  .progress-bar.dragging .progress-thumb { opacity: 1; }
  .progress-times {
    display: flex; justify-content: space-between;
    font-size: 0.7em; opacity: 0.7;
    margin-top: 2px;
  }

  /* === Volume === */
  .volume-row {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 0;
  }
  .vol-btn { width: 28px; height: 28px; flex-shrink: 0; }
  .vol-track {
    flex: 1; height: 4px;
    background: rgba(255,255,255,0.3);
    border-radius: 2px;
    cursor: pointer; position: relative;
    touch-action: none;
    transition: height 0.1s;
  }
  .vol-track:hover { height: 6px; }
  .vol-fill {
    position: absolute; left: 0; top: 0; height: 100%;
    background: currentColor; border-radius: 2px;
    pointer-events: none;
  }
  .vol-thumb {
    position: absolute; top: 50%;
    width: 12px; height: 12px; border-radius: 50%;
    background: currentColor;
    transform: translateY(-50%);
    opacity: 0; transition: opacity 0.15s;
    pointer-events: none;
    left: 0; /* updated via style.left */
  }
  .vol-track:hover .vol-thumb { opacity: 1; }

  /* === Like button === */
  .like-btn {
    appearance: none; background: none; border: none;
    cursor: pointer; color: inherit;
    display: inline-flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 50%;
    transition: opacity 0.15s, transform 0.12s;
    flex-shrink: 0;
  }
  .like-btn:hover  { opacity: 0.8; }
  .like-btn:active { transform: scale(0.88); }
  .like-btn.liked  { color: var(--accent-color, var(--primary-color)); }

  /* === Narrow layout (same breakpoints as HA source) === */
  .player.narrow .controls { padding-bottom: 0; }
  .player.narrow .ctrl-btn { width: 40px; height: 40px; }
  .player.narrow .ctrl-btn.play-pause { width: 50px; height: 50px; }
  .player.narrow .ctrl-btn.play-pause svg { width: 36px; height: 36px; }
  .player.no-progress .controls { padding-bottom: 0; }

  /* === Panels === */
  .backdrop {
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 10;
    opacity: 0; pointer-events: none;
    transition: opacity 0.25s;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }
  .backdrop.open { opacity: 1; pointer-events: auto; }

  .slide-panel {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: var(--card-background-color, #1c1c1e);
    border-radius: 16px 16px 0 0;
    z-index: 11;
    max-height: 80%;
    display: flex; flex-direction: column;
    overflow: hidden;
    transform: translateY(100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;
  }
  .slide-panel.open { transform: translateY(0); }

  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px 8px; flex-shrink: 0;
    border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
    min-height: 48px;
  }
  .panel-title {
    font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.7px; color: var(--secondary-text-color);
    display: flex; align-items: center; gap: 6px;
    flex: 1; overflow: hidden;
  }
  .panel-close {
    appearance: none; background: none; border: none; cursor: pointer;
    color: var(--secondary-text-color);
    width: 30px; height: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .panel-close:hover { background: var(--secondary-background-color); }
  .panel-body {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: var(--divider-color) transparent;
  }
  .panel-body::-webkit-scrollbar { width: 3px; }
  .panel-body::-webkit-scrollbar-thumb { background: var(--divider-color); }

  /* === List items (library / queue / search results) === */
  .list-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 16px; cursor: pointer;
    transition: background 0.1s;
    position: relative;
    overflow: hidden;
  }
  .list-item:hover { background: var(--secondary-background-color); }
  .list-item.now-playing { background: rgba(var(--rgb-accent-color, 3,169,244), 0.12); }

  .item-thumb {
    width: 42px; height: 42px; border-radius: 4px;
    object-fit: cover; flex-shrink: 0;
    background: var(--secondary-background-color);
  }
  .item-thumb.circle { border-radius: 50%; }
  .item-ph {
    width: 42px; height: 42px; border-radius: 4px; flex-shrink: 0;
    background: var(--secondary-background-color);
    display: flex; align-items: center; justify-content: center;
    color: var(--secondary-text-color);
  }
  .item-info { flex: 1; min-width: 0; }
  .item-title {
    font-size: 0.88rem; font-weight: 500;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    color: var(--primary-text-color);
  }
  .item-sub {
    font-size: 0.74rem; color: var(--secondary-text-color);
    margin-top: 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .item-action {
    appearance: none; background: none; border: none; cursor: pointer;
    color: var(--secondary-text-color);
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background 0.15s;
  }
  .item-action:hover { background: var(--secondary-background-color); color: var(--primary-text-color); }

  /* Swipe-to-delete reveal */
  .swipe-delete {
    position: absolute; right: 0; top: 0; bottom: 0;
    background: #c62828;
    display: flex; align-items: center; justify-content: center;
    width: 70px; color: #fff;
    transform: translateX(100%);
    transition: transform 0.22s;
    pointer-events: none;
  }
  .list-item.swiped .swipe-delete { transform: translateX(0); pointer-events: auto; }
  .list-item.swiped .item-content { transform: translateX(-70px); }
  .item-content { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; transition: transform 0.22s; }

  /* Section header */
  .section-label {
    padding: 10px 16px 4px;
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.8px; color: var(--secondary-text-color);
  }

  /* Show more button */
  .show-more-btn {
    display: block; width: 100%; padding: 8px;
    text-align: center; font-size: 0.78rem;
    color: var(--accent-color, var(--primary-color));
    background: transparent; border: none; cursor: pointer;
    border-top: 1px solid var(--divider-color);
  }
  .show-more-btn:hover { background: var(--secondary-background-color); }

  /* Breadcrumb */
  .breadcrumb {
    display: flex; align-items: center; gap: 2px;
    padding: 6px 16px 3px; overflow-x: auto; scrollbar-width: none;
    flex-wrap: nowrap;
  }
  .breadcrumb::-webkit-scrollbar { display: none; }
  .bc-btn {
    appearance: none; background: none; border: none; cursor: pointer;
    font-size: 0.75rem; padding: 3px 5px; border-radius: 5px;
    color: var(--secondary-text-color); white-space: nowrap;
    transition: background 0.12s;
  }
  .bc-btn:hover { background: var(--secondary-background-color); color: var(--primary-text-color); }
  .bc-btn.last  { color: var(--primary-text-color); font-weight: 600; }
  .bc-sep { color: var(--divider-color); font-size: 0.75rem; }

  /* Search input */
  .search-bar { display: flex; gap: 6px; padding: 10px 16px 6px; flex-shrink: 0; }
  .search-input {
    flex: 1;
    background: var(--secondary-background-color);
    border: 1.5px solid var(--divider-color);
    border-radius: 8px; color: var(--primary-text-color);
    padding: 8px 10px; font-size: 0.88rem; outline: none;
    transition: border-color 0.15s;
  }
  .search-input::placeholder { color: var(--secondary-text-color); }
  .search-input:focus { border-color: var(--accent-color, var(--primary-color)); }
  .search-go {
    background: var(--accent-color, var(--primary-color)) !important;
    color: var(--text-accent-color, #fff) !important;
    border: none; border-radius: 8px;
    width: 38px; height: 38px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: opacity 0.15s;
  }
  .search-go:hover { opacity: 0.85; }

  /* Chips row */
  .chips-row {
    display: flex; gap: 5px; padding: 4px 0 0;
    overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap;
  }
  .chips-row::-webkit-scrollbar { display: none; }
  .chip {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 4px 10px; border-radius: 14px; height: 28px;
    font-size: 0.72rem; font-weight: 600;
    background: rgba(255,255,255,0.14); color: rgba(255,255,255,0.75);
    white-space: nowrap; cursor: pointer; flex-shrink: 0;
    border: 1px solid transparent;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
    -webkit-tap-highlight-color: transparent;
  }
  .chip:hover { background: rgba(255,255,255,0.22); color: #fff; }
  .chip.active {
    background: rgba(255,255,255,0.2); color: #fff;
    border-color: rgba(255,255,255,0.5);
  }

  /* Device items */
  .device-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 16px; cursor: pointer;
    transition: background 0.12s;
  }
  .device-item:hover { background: var(--secondary-background-color); }
  .device-item.active { background: rgba(var(--rgb-accent-color, 3,169,244), 0.12); }
  .device-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--secondary-text-color); flex-shrink: 0; }
  .device-name { flex: 1; font-size: 0.9rem; font-weight: 500; }
  .device-vol  { font-size: 0.75rem; color: var(--secondary-text-color); }
  .active-dot  { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-color, var(--primary-color)); flex-shrink: 0; }

  /* Lyrics */
  .lyric-line {
    padding: 8px 20px;
    font-size: 1rem; line-height: 1.5;
    color: var(--secondary-text-color);
    cursor: pointer;
    transition: color 0.3s, font-size 0.3s, font-weight 0.3s;
    border-radius: 6px;
  }
  .lyric-line.active {
    color: var(--primary-text-color);
    font-size: 1.1rem; font-weight: 700;
  }
  .lyric-line:hover { background: var(--secondary-background-color); }

  /* Queue now-playing label */
  .queue-now { padding: 8px 16px 3px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--accent-color, var(--primary-color)); }

  /* Empty / loading */
  .empty   { text-align: center; padding: 28px 16px; color: var(--secondary-text-color); font-size: 0.85rem; line-height: 1.6; }
  .loading { text-align: center; padding: 22px; color: var(--secondary-text-color); font-size: 0.82rem; }

  ${buildMarqueeCSS()}
`;

// ─── MAIN CARD ────────────────────────────────────────────────────────────────

class SpotifyEnhancedCard extends SpotifyBase {
  constructor() {
    super();
    this._prog      = null;  // ProgressTracker
    this._volDrag   = null;  // VolumeDrag
    this._resizeObs = null;
    this._narrow    = false;
    this._veryNarrow= false;
    this._cardH     = 0;
    this._bgColor   = "";
    this._fgColor   = "";
    this._lastArt   = "";
    this._lastTrack = "";
    this._openPanelId = null; // track exactly which panel is open
    this._libStack  = [];
    this._srQuery   = "";
    this._srResults = null;
    this._srExpand  = {};
    this._searchFocused = false;
    this._lyricsData= null;
    this._lyricsScrolled = false;
  }

  static getConfigElement() { return document.createElement("spotify-enhanced-card-editor"); }
  static getStubConfig()    { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config = {
      show_seek: true, show_volume: true,
      show_shuffle: true, show_repeat: true,
      ...c,
    };
    this._ready = false;
    this._build();
    this._ready = true;
    if (this._hass) this._onHass(null);
  }

  connectedCallback() {
    this._attachObserver();
    // Restart progress ticker if playing
    if (this._prog && this._playing) {
      if (this._so) this._prog.sync(this._so);
    }
  }

  disconnectedCallback() {
    this._prog?.destroy();
    this._resizeObs?.disconnect();
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────

  _build() {
    const s = this.shadowRoot;
    s.innerHTML = `
<style>${CARD_CSS}</style>
<ha-card>

  <!-- Background layer (identical structure to HA source) -->
  <div class="background no-image off" id="bg">
    <div class="color-block" id="color-block"></div>
    <div class="no-img" id="no-img"></div>
    <div class="image" id="art-image"></div>
    <div class="color-gradient" id="color-gradient"></div>
  </div>

  <!-- Player layer -->
  <div class="player no-progress" id="player">

    <!-- Top: icon/name row + action buttons -->
    <div class="top-info">
      <div class="icon-name">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="${MDI.play}"/></svg>
        <span id="card-name">Spotify Enhanced</span>
      </div>
      <div style="display:flex;align-items:center;gap:2px">
        <button class="like-btn" id="like-btn" title="Save / unsave"></button>
        <button class="ctrl-btn secondary" id="btn-lyrics" title="Lyrics">${icon(MDI.mic, 22)}</button>
        <button class="ctrl-btn secondary" id="btn-browse" title="Browse library">${icon(MDI.play_box, 22)}</button>
        <button class="ctrl-btn secondary" id="btn-more" title="More options">${icon(MDI.dots, 22)}</button>
      </div>
    </div>

    <!-- Media info + controls -->
    <div id="media-section">
      <div class="title-controls">
        <div class="media-info">
          <div class="media-title marquee-wrap" id="title-wrap">
            <div class="marquee-inner" id="title-text">Nothing playing</div>
          </div>
          <div class="media-description" id="sub-text"></div>
        </div>

        <div class="controls">
          <div class="start">
            <button class="ctrl-btn" id="shuf-btn" title="Shuffle"></button>
            <button class="ctrl-btn" id="prev-btn" title="Previous">${icon(MDI.prev, 30)}</button>
            <button class="ctrl-btn play-pause" id="play-btn" title="Play / Pause"></button>
            <button class="ctrl-btn" id="next-btn" title="Next">${icon(MDI.next, 30)}</button>
            <button class="ctrl-btn" id="rep-btn"  title="Repeat"></button>
          </div>
          <div class="end">
            <button class="ctrl-btn secondary" id="chip-queue"   title="Queue">${icon(MDI.queue, 22)}</button>
            <button class="ctrl-btn secondary" id="chip-devices" title="Devices">${icon(MDI.cast, 22)}</button>
            <button class="ctrl-btn secondary" id="chip-search"  title="Search">${icon(MDI.search, 22)}</button>
          </div>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="progress-wrap" id="progress-wrap">
        <div class="progress-bar" id="prog-bar">
          <div class="progress-fill"  id="prog-fill"></div>
          <div class="progress-thumb" id="prog-thumb"></div>
        </div>
        <div class="progress-times">
          <span id="p-cur">0:00</span>
          <span id="p-dur">0:00</span>
        </div>
      </div>

      <!-- Volume -->
      <div class="volume-row" id="vol-row">
        <button class="ctrl-btn vol-btn" id="mute-btn"></button>
        <div class="vol-track" id="vol-track">
          <div class="vol-fill"  id="vol-fill"></div>
          <div class="vol-thumb" id="vol-thumb"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Panels backdrop (single, shared) -->
  <div class="backdrop" id="backdrop"></div>

  <!-- Library panel -->
  <div class="slide-panel" id="panel-lib">
    <div class="panel-header">
      <div class="panel-title" id="lib-title">${icon(MDI.library, 15)}&nbsp;Library</div>
      <button class="panel-close" id="close-lib">${icon(MDI.close, 18)}</button>
    </div>
    <div class="panel-body" id="lib-body"></div>
  </div>

  <!-- Search panel -->
  <div class="slide-panel" id="panel-search">
    <div class="panel-header">
      <div class="panel-title">${icon(MDI.search, 15)}&nbsp;Search</div>
      <button class="panel-close" id="close-search">${icon(MDI.close, 18)}</button>
    </div>
    <div class="search-bar">
      <input class="search-input" id="search-in" placeholder="Search Spotify…" autocomplete="off" />
      <button class="search-go" id="search-go">${icon(MDI.search, 18)}</button>
    </div>
    <div class="panel-body" id="search-body"></div>
  </div>

  <!-- Queue panel -->
  <div class="slide-panel" id="panel-queue">
    <div class="panel-header">
      <div class="panel-title">${icon(MDI.queue, 15)}&nbsp;Queue</div>
      <button class="panel-close" id="close-queue">${icon(MDI.close, 18)}</button>
    </div>
    <div class="panel-body" id="queue-body"><div class="loading">Loading…</div></div>
  </div>

  <!-- Devices panel -->
  <div class="slide-panel" id="panel-devices">
    <div class="panel-header">
      <div class="panel-title">${icon(MDI.cast, 15)}&nbsp;Devices</div>
      <button class="panel-close" id="close-devices">${icon(MDI.close, 18)}</button>
    </div>
    <div class="panel-body" id="devices-body"></div>
  </div>

  <!-- Lyrics panel -->
  <div class="slide-panel" id="panel-lyrics">
    <div class="panel-header">
      <div class="panel-title">${icon(MDI.mic, 15)}&nbsp;Lyrics</div>
      <button class="panel-close" id="close-lyrics">${icon(MDI.close, 18)}</button>
    </div>
    <div class="panel-body" id="lyrics-body"><div class="loading">Loading…</div></div>
  </div>

</ha-card>`;

    this._bindEvents();

    // Progress tracker
    this._prog = new ProgressTracker();
    this._prog.fillEl  = s.getElementById("prog-fill");
    this._prog.curEl   = s.getElementById("p-cur");
    this._prog.durEl   = s.getElementById("p-dur");
    this._bindSeek();

    // Volume drag
    this._volDrag = new VolumeDrag(
      s.getElementById("vol-track"),
      s.getElementById("vol-fill"),
      s.getElementById("vol-thumb"),
      (pct) => this._mp("volume_set", { volume_level: round2(pct) }),
    );

    this._attachObserver();
  }

  _attachObserver() {
    const card = this.shadowRoot?.querySelector("ha-card");
    if (!card) return;
    if (!this._resizeObs) {
      this._resizeObs = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }
    this._resizeObs.observe(card);
  }

  _measureCard() {
    const card = this.shadowRoot?.querySelector("ha-card");
    if (!card) return;
    this._narrow     = card.offsetWidth < 350;
    this._veryNarrow = card.offsetWidth < 300;
    this._cardH      = card.offsetHeight;
    this._applyLayout();
  }

  _applyLayout() {
    const s = this.shadowRoot;
    const player = s.getElementById("player");
    if (!player) return;
    player.classList.toggle("narrow",   this._narrow && !this._veryNarrow);
    // Image width = card height (square), same as HA source
    const imgEl = s.getElementById("art-image");
    if (imgEl && this._cardH) imgEl.style.width = `${this._cardH}px`;
    const gradEl = s.getElementById("color-gradient");
    if (gradEl && this._cardH) gradEl.style.width = `${this._cardH}px`;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  _bindEvents() {
    const s = this.shadowRoot;

    // Playback controls
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

    // Like
    s.getElementById("like-btn").addEventListener("click", () => {
      const liked = toggleLiked(this._trackId, this._hass);
      this._paintLike(liked);
    });

    // Panel openers
    s.getElementById("btn-browse").addEventListener("click",  () => this._openPanel("lib"));
    s.getElementById("btn-lyrics").addEventListener("click",  () => this._openPanel("lyrics"));
    s.getElementById("chip-queue").addEventListener("click",   () => this._openPanel("queue"));
    s.getElementById("chip-devices").addEventListener("click", () => this._openPanel("devices"));
    s.getElementById("chip-search").addEventListener("click",  () => this._openPanel("search"));

    // Close buttons
    for (const id of ["lib","search","queue","devices","lyrics"]) {
      s.getElementById(`close-${id}`)?.addEventListener("click", () => this._closePanel());
    }
    s.getElementById("backdrop").addEventListener("click", () => this._closePanel());

    // More-info button
    s.getElementById("btn-more").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        detail: { entityId: this._config.entity }, bubbles: true, composed: true,
      }));
    });

    // Search
    const si = s.getElementById("search-in");
    si?.addEventListener("focus", () => { this._searchFocused = true; });
    si?.addEventListener("blur",  () => { this._searchFocused = false; });
    si?.addEventListener("keydown", (e) => { if (e.key === "Enter") this._doSearch(); });
    s.getElementById("search-go")?.addEventListener("click", () => this._doSearch());

    // Marquee
    const tw = s.getElementById("title-wrap");
    tw?.addEventListener("mouseenter", () => startMarquee(tw));
    tw?.addEventListener("mouseleave", () => stopMarquee(tw));
  }

  _bindSeek() {
    const s    = this.shadowRoot;
    const bar  = s.getElementById("prog-bar");
    const fill = s.getElementById("prog-fill");
    const thumb= s.getElementById("prog-thumb");
    if (!bar) return;

    const getPct = (e) => {
      const r = bar.getBoundingClientRect();
      return clamp((e.clientX - r.left) / r.width, 0, 1);
    };
    const paintThumb = (pct) => {
      if (thumb) thumb.style.left = `${pct * 100}%`;
    };

    bar.addEventListener("pointerdown", (e) => {
      bar.classList.add("dragging");
      bar.setPointerCapture(e.pointerId);
      this._prog.startDrag(getPct(e));
      paintThumb(getPct(e));

      const mv = (e) => { const p = getPct(e); this._prog.moveDrag(p); paintThumb(p); };
      const up = (e) => {
        bar.classList.remove("dragging");
        const secs = this._prog.endDrag();
        paintThumb(this._prog._dragPct);
        this._mp("media_seek", { seek_position: round2(secs) });
        bar.removeEventListener("pointermove", mv);
        bar.removeEventListener("pointerup",   up);
      };
      bar.addEventListener("pointermove", mv, { passive: true });
      bar.addEventListener("pointerup",   up, { once: true });
    });
  }

  // ── Panel management (one open at a time, no stuck state) ────────────────

  _openPanel(id) {
    // If same panel clicked again, close it
    if (this._openPanelId === id) { this._closePanel(); return; }

    const s = this.shadowRoot;
    // Close any currently open panel first (no animation overlap)
    if (this._openPanelId) {
      s.getElementById(`panel-${this._openPanelId}`)?.classList.remove("open");
    }

    this._openPanelId = id;
    s.getElementById("backdrop").classList.add("open");
    s.getElementById(`panel-${id}`)?.classList.add("open");

    // Load content
    if (id === "queue")   this._loadQueue();
    if (id === "devices") this._renderDevices();
    if (id === "lyrics")  this._loadLyrics();
    if (id === "lib" && !this._libStack.length) this._renderLibRoot();
    if (id === "search") {
      requestAnimationFrame(() => {
        const inp = s.getElementById("search-in");
        inp?.focus();
        if (this._srResults) this._renderSearch();
      });
    }
  }

  _closePanel() {
    const s = this.shadowRoot;
    if (this._openPanelId) {
      s.getElementById(`panel-${this._openPanelId}`)?.classList.remove("open");
      this._openPanelId = null;
    }
    s.getElementById("backdrop").classList.remove("open");
  }

  // ── Colours (same as HA willUpdate logic) ────────────────────────────────

  async _updateColors(artUrl) {
    if (!artUrl) {
      this._bgColor = "";
      this._fgColor = "";
      this._applyColors();
      return;
    }
    try {
      const fullUrl = artUrl.startsWith("http") ? artUrl : (this._hass?.hassUrl(artUrl) ?? artUrl);
      const colors = await extractColors(fullUrl);
      if (colors) {
        this._bgColor = colors.background;
        this._fgColor = colors.foreground;
        this._applyColors();
      }
    } catch {}
  }

  _applyColors() {
    const s = this.shadowRoot;
    const bg = this._bgColor;
    const fg = this._fgColor;
    s.getElementById("color-block")?.style.setProperty("background-color", bg || "");
    s.getElementById("no-img")?.style.setProperty("background-color", bg || "");
    const grad = s.getElementById("color-gradient");
    if (grad) {
      grad.style.backgroundImage = bg
        ? `linear-gradient(to right, ${bg}, ${bg}00)`
        : "";
    }
    const player = s.getElementById("player");
    if (player) player.style.color = fg || "";
  }

  // ── Main update ──────────────────────────────────────────────────────────

  _onHass(prev) {
    const s = this.shadowRoot;
    if (!s.getElementById("play-btn")) return;

    const so    = this._so;
    const art   = this._art;
    const title = this._title;
    const sub   = [this._artist, this._album].filter(Boolean).join(" · ");
    const isOff = !so || ["off","unavailable","unknown"].includes(this._state);

    // Background layer classes (mirrors HA source)
    const bg = s.getElementById("bg");
    if (bg) {
      bg.classList.toggle("no-image", !art);
      bg.classList.toggle("off",      isOff);
      bg.classList.toggle("unavailable", this._state === "unavailable");
    }

    // Art image
    const artEl = s.getElementById("art-image");
    if (artEl) {
      artEl.style.backgroundImage = art
        ? `url(${art.startsWith("http") ? art : (this._hass?.hassUrl(art) ?? art)})`
        : "";
    }

    // Colours — only recompute when art changes
    if (art !== this._lastArt) {
      this._lastArt = art;
      this._updateColors(art);
    }

    // Title / artist
    const titleEl = s.getElementById("title-text");
    if (titleEl && titleEl.textContent !== (title || "Nothing playing")) {
      titleEl.textContent = title || "Nothing playing";
    }
    const subEl = s.getElementById("sub-text");
    if (subEl) subEl.textContent = sub;

    // Play button
    s.getElementById("play-btn").innerHTML = icon(this._playing ? MDI.pause : MDI.play, 40);

    // Shuffle
    const shuf = s.getElementById("shuf-btn");
    if (shuf) {
      shuf.innerHTML = icon(this._shuffle ? MDI.shuffle : MDI.shuffle_off, 28);
      shuf.classList.toggle("active", this._shuffle);
      shuf.style.visibility = this._config.show_shuffle !== false ? "" : "hidden";
    }

    // Repeat
    const rep = s.getElementById("rep-btn");
    if (rep) {
      const ico = this._repeat === "one" ? MDI.repeat_one : this._repeat === "all" ? MDI.repeat : MDI.repeat_off;
      rep.innerHTML = icon(ico, 28);
      rep.classList.toggle("active", this._repeat !== "off");
      rep.style.visibility = this._config.show_repeat !== false ? "" : "hidden";
    }

    // Progress bar
    const showProg = this._config.show_seek !== false
      && !this._narrow
      && (this._playing || this._state === "paused")
      && this._durSecs > 0;
    s.getElementById("progress-wrap").style.display = showProg ? "" : "none";
    s.getElementById("player")?.classList.toggle("no-progress", !showProg);

    if (showProg && so) this._prog.sync(so);

    // Volume
    const showVol = this._config.show_volume !== false;
    s.getElementById("vol-row").style.display = showVol ? "" : "none";
    s.getElementById("mute-btn").innerHTML = icon(
      this._muted ? MDI.vol_off : this._vol > 50 ? MDI.vol_hi : MDI.vol_lo, 22
    );
    this._volDrag?.sync(this._muted ? 0 : this._vol / 100);

    // Like — recheck when track changes
    if (this._trackId !== this._lastTrack) {
      this._lastTrack = this._trackId;
      checkLiked(this._trackId, this._hass).then(() =>
        this._paintLike(_liked.has(this._trackId))
      );
    }
    this._paintLike(_liked.has(this._trackId));

    // Keep devices panel live without closing it
    if (this._openPanelId === "devices") this._renderDevices();

    // Update lyrics highlight if panel is open
    if (this._openPanelId === "lyrics") this._highlightLyric();

    // Layout
    this._applyLayout();
  }

  _paintLike(liked) {
    const btn = this.shadowRoot.getElementById("like-btn");
    if (!btn) return;
    btn.innerHTML  = icon(liked ? MDI.heart : MDI.heart_out, 20);
    btn.classList.toggle("liked", liked);
    btn.title = liked ? "Remove from Liked Songs" : "Save to Liked Songs";
  }

  // ── Library ───────────────────────────────────────────────────────────────

  _renderLibRoot() {
    const roots = [
      ["spotify://category/playlists",       MDI.library, "Playlists",       true],
      ["spotify://category/liked_songs",     MDI.heart,   "Liked Songs",     false],
      ["spotify://category/recently_played", MDI.queue,   "Recently Played", false],
      ["spotify://category/top_tracks",      MDI.play,    "Top Tracks",      false],
      ["spotify://category/top_artists",     MDI.mic,     "Top Artists",     true],
      ["spotify://category/new_releases",    MDI.library, "New Releases",    true],
      ["spotify://category/featured",        MDI.play_box,"Featured",        true],
    ];
    const body = this.shadowRoot.getElementById("lib-body");
    if (!body) return;
    body.innerHTML = roots.map(([id, ico, label, exp]) => `
      <div class="list-item" data-id="${id}" data-exp="${exp}" data-label="${label}">
        <div class="item-content">
          <div class="item-ph">${icon(ico, 18)}</div>
          <div class="item-info"><div class="item-title">${label}</div></div>
          ${icon(MDI.chev_r, 16)}
        </div>
      </div>`).join("");
    this._bindLibItems(body);
    this._updateLibTitle();
  }

  _bindLibItems(container) {
    container.querySelectorAll(".list-item[data-id]").forEach(el => {
      el.addEventListener("click", async () => {
        const { id, exp, label } = el.dataset;
        if (exp === "true") {
          this._libStack.push({ label, id });
          this._updateLibTitle();
          await this._browseLib(id);
        } else {
          this._mp("play_media", { media_content_id: id, media_content_type: "music" });
          this._closePanel();
        }
      });
    });
    container.querySelectorAll("[data-add-q]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._spotify("add_to_queue", { track_uri: btn.dataset.addQ });
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
        const isTrack = !item.can_expand;
        const thumb = item.thumbnail
          ? `<img class="item-thumb${item.media_class==="artist"?" circle":""}" src="${item.thumbnail}" alt="" />`
          : `<div class="item-ph">${icon(MDI.library, 16)}</div>`;
        const right = isTrack
          ? `<button class="item-action" data-add-q="${item.media_content_id}" title="Add to queue">${icon(MDI.add_q, 16)}</button>`
          : icon(MDI.chev_r, 16);
        return `
          <div class="list-item" data-id="${item.media_content_id}" data-exp="${item.can_expand}" data-label="${(item.title||"").replace(/"/g,"&quot;")}">
            <div class="item-content">
              ${thumb}
              <div class="item-info">
                <div class="item-title">${item.title||""}</div>
                ${item.media_class?`<div class="item-sub">${item.media_class}</div>`:""}
              </div>
              ${right}
            </div>
          </div>`;
      }).join("") || `<div class="empty">Nothing here.</div>`;
      this._bindLibItems(body);
    } catch {
      body.innerHTML = `<div class="empty">Could not load. Try again.</div>`;
    }
  }

  _updateLibTitle() {
    const el = this.shadowRoot.getElementById("lib-title");
    if (!el) return;
    if (!this._libStack.length) {
      el.innerHTML = `${icon(MDI.library, 15)}&nbsp;Library`; return;
    }
    const crumbs = [
      `<button class="bc-btn" data-nav="-1">${icon(MDI.home, 12)}&nbsp;Library</button>`,
      ...this._libStack.map((p, i) =>
        `<span class="bc-sep">›</span>
         <button class="bc-btn${i===this._libStack.length-1?" last":""}" data-nav="${i}">${p.label}</button>`
      ),
    ].join("");
    el.innerHTML = `<div style="display:flex;align-items:center;gap:2px;overflow:hidden;flex-wrap:nowrap">${crumbs}</div>`;
    el.querySelectorAll(".bc-btn[data-nav]").forEach(btn => {
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
    if (!this._srResults && body) body.innerHTML = `<div class="loading">Searching…</div>`;
    try {
      const tok = this._hass?.auth?.data?.access_token;
      const r = await fetch(
        `/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`,
        { headers: { Authorization: `Bearer ${tok}` } }
      );
      if (r.ok) { this._srResults = await r.json(); this._renderSearch(); }
      else if (body) body.innerHTML = `<div class="empty">Search failed. Try again.</div>`;
    } catch {
      if (body) body.innerHTML = `<div class="empty">Search failed.</div>`;
    }
  }

  _renderSearch() {
    const s    = this.shadowRoot;
    const body = s.getElementById("search-body");
    if (!body || !this._srResults) return;
    const R = this._srResults;

    const mkTrack = (t) => `
      <div class="list-item" data-play="${t.uri}" data-type="track">
        <div class="item-content">
          <img class="item-thumb" src="${t.album?.images?.[0]?.url||""}" alt="" />
          <div class="item-info">
            <div class="item-title">${t.name}</div>
            <div class="item-sub">${(t.artists||[]).map(a=>a.name).join(", ")}</div>
          </div>
          <button class="item-action" data-add-q="${t.uri}" title="Add to queue">${icon(MDI.add_q,16)}</button>
        </div>
      </div>`;
    const mkAlbum = (a) => `
      <div class="list-item" data-play="${a.uri}" data-type="album">
        <div class="item-content">
          <img class="item-thumb" src="${a.images?.[0]?.url||""}" alt="" />
          <div class="item-info">
            <div class="item-title">${a.name}</div>
            <div class="item-sub">${(a.artists||[]).map(x=>x.name).join(", ")}</div>
          </div>
        </div>
      </div>`;
    const mkArtist = (a) => `
      <div class="list-item" data-play="${a.uri}" data-type="artist">
        <div class="item-content">
          <img class="item-thumb circle" src="${a.images?.[0]?.url||""}" alt="" />
          <div class="item-info">
            <div class="item-title">${a.name}</div>
            <div class="item-sub">Artist</div>
          </div>
        </div>
      </div>`;
    const mkPl = (p) => `
      <div class="list-item" data-play="${p.uri}" data-type="playlist">
        <div class="item-content">
          <img class="item-thumb" src="${p.images?.[0]?.url||""}" alt="" />
          <div class="item-info">
            <div class="item-title">${p.name}</div>
            <div class="item-sub">Playlist · ${p.owner?.display_name||""}</div>
          </div>
        </div>
      </div>`;

    const section = (label, key, mkFn, defaultN) => {
      const items = R[key]?.items;
      if (!items?.length) return "";
      const exp   = this._srExpand[key];
      const shown = exp ? items : items.slice(0, defaultN);
      const total = R[key]?.total || items.length;
      const more  = !exp && total > defaultN
        ? `<button class="show-more-btn" data-expand="${key}">Show more ${label.toLowerCase()} (${total})</button>` : "";
      return `<div class="section-label">${label}</div>${shown.map(mkFn).join("")}${more}`;
    };

    const html =
      section("Tracks",    "tracks",    mkTrack,  5) +
      section("Albums",    "albums",    mkAlbum,  4) +
      section("Artists",   "artists",   mkArtist, 4) +
      section("Playlists", "playlists", mkPl,     4);

    body.innerHTML = html || `<div class="empty">No results.</div>`;

    // Play on click
    body.querySelectorAll(".list-item[data-play]").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-add-q]")) return;
        this._mp("play_media", {
          media_content_id: el.dataset.play,
          media_content_type: "music",
        });
        this._closePanel();
      });
    });

    // Queue add
    body.querySelectorAll("[data-add-q]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._spotify("add_to_queue", { track_uri: btn.dataset.addQ });
      });
    });

    // Show more
    body.querySelectorAll("[data-expand]").forEach(btn => {
      btn.addEventListener("click", () => {
        this._srExpand[btn.dataset.expand] = true;
        this._renderSearch();
      });
    });

    // Restore search focus
    if (this._searchFocused) {
      requestAnimationFrame(() => s.getElementById("search-in")?.focus());
    }
  }

  // ── Queue ─────────────────────────────────────────────────────────────────

  async _loadQueue() {
    const body = this.shadowRoot.getElementById("queue-body");
    if (!body) return;
    body.innerHTML = `<div class="loading">Loading queue…</div>`;
    try {
      const tok = this._hass?.auth?.data?.access_token;
      const r = await fetch("/api/spotify_enhanced/queue",
        { headers: { Authorization: `Bearer ${tok}` } });
      if (!r.ok) throw new Error("queue unavailable");
      const data = await r.json();
      this._renderQueue(body, data);
    } catch {
      body.innerHTML = `<div class="empty">Queue unavailable.<br>Start playback first.</div>`;
    }
  }

  _renderQueue(body, data) {
    const cur = data.currently_playing;
    const q   = data.queue || [];

    const mkItem = (t, isNow = false) => {
      const imgs = t.album?.images || [];
      const artists = (t.artists||[]).map(a=>a.name).join(", ");
      return `
        <div class="list-item${isNow?" now-playing":""}" data-uri="${t.uri}">
          <div class="item-content">
            <img class="item-thumb" src="${imgs[0]?.url||""}" alt="" />
            <div class="item-info">
              <div class="item-title">${t.name}</div>
              <div class="item-sub">${artists}</div>
            </div>
            <span style="font-size:0.72rem;color:var(--secondary-text-color)">${fmt(t.duration_ms/1000)}</span>
          </div>
          <div class="swipe-delete" title="Remove from queue">${icon(MDI.delete, 20)}</div>
        </div>`;
    };

    let html = "";
    if (cur) html += `<div class="queue-now">Now Playing</div>` + mkItem(cur, true);
    if (q.length) html += `<div class="section-label">Next Up</div>` + q.slice(0,30).map(t=>mkItem(t)).join("");
    body.innerHTML = html || `<div class="empty">Queue is empty.</div>`;

    // Bind play and swipe-to-delete
    body.querySelectorAll(".list-item[data-uri]").forEach(el => {
      let startX = 0, dx = 0, swiping = false;

      el.addEventListener("click", (e) => {
        if (el.classList.contains("swiped")) { el.classList.remove("swiped"); return; }
        if (e.target.closest(".swipe-delete")) return;
        this._mp("play_media", { media_content_id: el.dataset.uri, media_content_type: "music" });
      });

      // Swipe left to reveal delete
      el.addEventListener("touchstart", (e) => {
        startX = e.touches[0].clientX; swiping = false;
      }, { passive: true });
      el.addEventListener("touchmove", (e) => {
        dx = e.touches[0].clientX - startX;
        if (dx < -20) swiping = true;
      }, { passive: true });
      el.addEventListener("touchend", () => {
        if (swiping && dx < -40) el.classList.add("swiped");
        else el.classList.remove("swiped");
      });

      el.querySelector(".swipe-delete")?.addEventListener("click", (e) => {
        e.stopPropagation();
        el.style.opacity = "0";
        el.style.transition = "opacity 0.2s";
        // Spotify Web API doesn't have a remove-from-queue endpoint; fade and reload
        setTimeout(() => this._loadQueue(), 250);
      });
    });
  }

  // ── Devices ───────────────────────────────────────────────────────────────

  _renderDevices() {
    const body = this.shadowRoot.getElementById("devices-body");
    if (!body) return;
    const devices = stabiliseDevices(this._devices);
    if (!devices.length) {
      body.innerHTML = `<div class="empty">No Spotify Connect devices found.<br>Open Spotify on a device to see it here.</div>`;
      return;
    }
    body.innerHTML = devices.map(d => `
      <div class="device-item${d.id===this._devId?" active":""}" data-id="${d.id}">
        <div class="device-icon">${icon(MDI.cast, 22)}</div>
        <div class="device-name">${d.name}</div>
        ${d.volume_percent!=null?`<span class="device-vol">${d.volume_percent}%</span>`:""}
        ${d.id===this._devId?`<div class="active-dot"></div>`:""}
      </div>`).join("");
    body.querySelectorAll(".device-item[data-id]").forEach(el =>
      el.addEventListener("click", () => {
        this._spotify("transfer_playback", { device_id: el.dataset.id });
        this._closePanel();
      })
    );
  }

  // ── Lyrics ────────────────────────────────────────────────────────────────

  async _loadLyrics() {
    const body = this.shadowRoot.getElementById("lyrics-body");
    if (!body) return;
    body.innerHTML = `<div class="loading">Loading lyrics…</div>`;
    this._lyricsData = null;

    const trackId = this._trackId;
    if (!trackId) { body.innerHTML = `<div class="empty">No track playing.</div>`; return; }

    try {
      const tok = this._hass?.auth?.data?.access_token;
      // Use the Spotify internal lyrics endpoint via our backend proxy
      const r = await fetch(`/api/spotify_enhanced/lyrics?track_id=${trackId}`,
        { headers: { Authorization: `Bearer ${tok}` } });
      if (!r.ok) throw new Error("no lyrics");
      const data = await r.json();
      if (!data?.lines?.length) throw new Error("empty");
      this._lyricsData = data.lines; // [{startTimeMs, words}]
      this._lyricsScrolled = false;
      this._renderLyrics(body);
    } catch {
      body.innerHTML = `<div class="empty">Lyrics not available for this track.</div>`;
    }
  }

  _renderLyrics(body) {
    if (!body || !this._lyricsData) return;
    body.innerHTML = this._lyricsData.map((line, i) => `
      <div class="lyric-line" data-i="${i}" data-t="${line.startTimeMs}">
        ${line.words || "♪"}
      </div>`).join("");
    body.querySelectorAll(".lyric-line[data-t]").forEach(el => {
      el.addEventListener("click", () => {
        const ms = parseInt(el.dataset.t);
        this._mp("media_seek", { seek_position: round2(ms / 1000) });
      });
    });
    this._highlightLyric();
  }

  _highlightLyric() {
    const body = this.shadowRoot.getElementById("lyrics-body");
    if (!body || !this._lyricsData || !this._prog) return;

    const nowMs = this._prog.current * 1000;
    const lines = body.querySelectorAll(".lyric-line[data-t]");
    let activeEl = null;

    lines.forEach(el => {
      const t = parseInt(el.dataset.t);
      el.classList.remove("active");
      if (t <= nowMs) activeEl = el;
    });

    if (activeEl) {
      activeEl.classList.add("active");
      // Auto-scroll to active line
      if (!this._lyricsScrolled) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }
}

customElements.define("spotify-enhanced-card", SpotifyEnhancedCard);

// ─── MINI CARD ────────────────────────────────────────────────────────────────

class SpotifyMiniCard extends SpotifyBase {
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config = { show_volume: true, ...c };
    this._ready = false; this._build(); this._ready = true;
    if (this._hass) this._onHass(null);
  }

  _build() {
    this.shadowRoot.innerHTML = `
<style>
${CARD_CSS}
ha-card {
  display: flex; align-items: center;
  padding: 10px 12px; gap: 10px; height: auto;
  overflow: hidden;
}
img.mini-art { width: 48px; height: 48px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: var(--secondary-background-color); }
.mini-info { flex: 1; min-width: 0; }
.mini-title { font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--primary-text-color); }
.mini-sub   { font-size: 0.75rem; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.mini-vol   { display: flex; align-items: center; gap: 4px; margin-top: 5px; }
.mini-vol .vol-track { flex: 1; }
.mini-ctrls { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.mini-ctrls .ctrl-btn { width: 36px; height: 36px; }
.mini-ctrls .ctrl-btn.play-pause { width: 44px; height: 44px; }
.mini-ctrls .ctrl-btn.play-pause svg { width: 30px; height: 30px; }
</style>
<ha-card>
  <img class="mini-art" id="art" src="" alt="" />
  <div class="mini-info">
    <div class="mini-title" id="mt">Nothing playing</div>
    <div class="mini-sub"   id="ms"></div>
    <div class="mini-vol" id="mvr">
      <button class="ctrl-btn" id="mute">${icon(MDI.vol_lo,18)}</button>
      <div class="vol-track" id="vt">
        <div class="vol-fill"  id="vf"></div>
        <div class="vol-thumb" id="vh"></div>
      </div>
    </div>
  </div>
  <div class="mini-ctrls">
    <button class="ctrl-btn" id="prev">${icon(MDI.prev,24)}</button>
    <button class="ctrl-btn play-pause" id="play">${icon(MDI.play,30)}</button>
    <button class="ctrl-btn" id="next">${icon(MDI.next,24)}</button>
  </div>
</ha-card>`;
    const s = this.shadowRoot;
    s.getElementById("play").addEventListener("click", () => this._mp(this._playing ? "media_pause" : "media_play"));
    s.getElementById("prev").addEventListener("click", () => this._mp("media_previous_track"));
    s.getElementById("next").addEventListener("click", () => this._mp("media_next_track"));
    s.getElementById("mute").addEventListener("click", () => this._mp("volume_mute", { is_volume_muted: !this._muted }));
    this._vd = new VolumeDrag(
      s.getElementById("vt"), s.getElementById("vf"), s.getElementById("vh"),
      (pct) => this._mp("volume_set", { volume_level: round2(pct) })
    );
  }

  _onHass() {
    const s = this.shadowRoot;
    if (!s.getElementById("art")) return;
    const art = this._art;
    s.getElementById("art").src = art
      ? (art.startsWith("http") ? art : (this._hass?.hassUrl(art) ?? art))
      : "";
    s.getElementById("mt").textContent = this._title || "Nothing playing";
    s.getElementById("ms").textContent = this._artist;
    s.getElementById("play").innerHTML = icon(this._playing ? MDI.pause : MDI.play, 30);
    s.getElementById("mute").innerHTML = icon(this._muted ? MDI.vol_off : MDI.vol_lo, 18);
    s.getElementById("mvr").style.display = this._config.show_volume !== false ? "flex" : "none";
    this._vd?.sync(this._muted ? 0 : this._vol / 100);
  }
}
customElements.define("spotify-mini-card", SpotifyMiniCard);

// ─── DEVICE CARD ─────────────────────────────────────────────────────────────

class SpotifyDeviceCard extends SpotifyBase {
  static getStubConfig() { return { entity: "media_player.spotify_enhanced", title: "Spotify Devices" }; }

  setConfig(c) {
    this._config = { title: "Spotify Devices", ...c };
    this._ready = false; this._build(); this._ready = true;
    if (this._hass) this._onHass(null);
  }

  _build() {
    this.shadowRoot.innerHTML = `
<style>
${CARD_CSS}
ha-card { height: auto; }
.hdr { padding: 14px 16px 8px; font-size: 0.85rem; font-weight: 700; color: var(--secondary-text-color); display: flex; align-items: center; gap: 6px; }
.empty { text-align: center; padding: 24px; color: var(--secondary-text-color); font-size: 0.85rem; }
</style>
<ha-card>
  <div class="hdr">${icon(MDI.cast,16)}&nbsp;${this._config.title}</div>
  <div id="list"><div class="empty">Loading…</div></div>
</ha-card>`;
  }

  _onHass() {
    const list = this.shadowRoot.getElementById("list");
    if (!list) return;
    const devices = stabiliseDevices(this._devices);
    if (!devices.length) { list.innerHTML = `<div class="empty">No devices. Open Spotify on a device.</div>`; return; }
    list.innerHTML = devices.map(d => `
      <div class="device-item${d.id===this._devId?" active":""}" data-id="${d.id}">
        <div class="device-icon">${icon(MDI.cast,22)}</div>
        <div class="device-name">${d.name}</div>
        ${d.volume_percent!=null?`<span class="device-vol">${d.volume_percent}%</span>`:""}
        ${d.id===this._devId?`<div class="active-dot"></div>`:""}
      </div>`).join("");
    list.querySelectorAll(".device-item[data-id]").forEach(el =>
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
    if (this._hass) this._onHass(null);
  }

  _build() {
    this.shadowRoot.innerHTML = `
<style>
${CARD_CSS}
ha-card { height: auto; display: flex; flex-direction: column; }
</style>
<ha-card>
  <div class="search-bar">
    <input class="search-input" id="si" placeholder="Search Spotify…" autocomplete="off" />
    <button class="search-go" id="sg">${icon(MDI.search, 18)}</button>
  </div>
  <div id="body" style="overflow-y:auto;scrollbar-width:thin"></div>
</ha-card>`;
    const go = async () => {
      const q = this.shadowRoot.getElementById("si")?.value?.trim();
      if (!q) return;
      if (q !== this._q) { this._q = q; this._r = null; this._exp = {}; }
      const body = this.shadowRoot.getElementById("body");
      if (!this._r && body) body.innerHTML = `<div class="loading">Searching…</div>`;
      try {
        const tok = this._hass?.auth?.data?.access_token;
        const r = await fetch(`/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`,
          { headers: { Authorization: `Bearer ${tok}` } });
        if (r.ok) { this._r = await r.json(); this._render(); }
        else if (body) body.innerHTML = `<div class="empty">Search failed.</div>`;
      } catch { this.shadowRoot.getElementById("body").innerHTML = `<div class="empty">Search failed.</div>`; }
    };
    this.shadowRoot.getElementById("sg")?.addEventListener("click", go);
    this.shadowRoot.getElementById("si")?.addEventListener("keydown", e => { if (e.key==="Enter") go(); });
    this.shadowRoot.getElementById("si")?.addEventListener("focus", () => { this._focused = true; });
    this.shadowRoot.getElementById("si")?.addEventListener("blur",  () => { this._focused = false; });
  }

  _render() {
    const s = this.shadowRoot, body = s.getElementById("body");
    if (!body || !this._r) return;
    const R = this._r;
    const mk = (t, isTrack) => `
      <div class="list-item" data-play="${t.uri}">
        <div class="item-content">
          <img class="item-thumb${t.images&&!t.album?" circle":""}" src="${t.album?.images?.[0]?.url||t.images?.[0]?.url||""}" alt="" />
          <div class="item-info">
            <div class="item-title">${t.name}</div>
            <div class="item-sub">${(t.artists||[]).map(a=>a.name).join(", ")||t.owner?.display_name||"Artist"}</div>
          </div>
          ${isTrack?`<button class="item-action" data-add-q="${t.uri}">${icon(MDI.add_q,16)}</button>`:""}
        </div>
      </div>`;
    const sec = (label, key, isTrack, n) => {
      const items = R[key]?.items; if (!items?.length) return "";
      const exp = this._exp[key];
      const shown = exp ? items : items.slice(0, n);
      const total = R[key]?.total || items.length;
      const more = !exp && total > n ? `<button class="show-more-btn" data-expand="${key}">Show more ${label.toLowerCase()} (${total})</button>` : "";
      return `<div class="section-label">${label}</div>${shown.map(t=>mk(t,isTrack)).join("")}${more}`;
    };
    const html = sec("Tracks","tracks",true,5)+sec("Albums","albums",false,4)+sec("Artists","artists",false,4)+sec("Playlists","playlists",false,4);
    body.innerHTML = html || `<div class="empty">No results.</div>`;
    body.querySelectorAll(".list-item[data-play]").forEach(el => {
      el.addEventListener("click", e => {
        if (e.target.closest("[data-add-q]")) return;
        this._mp("play_media", { media_content_id: el.dataset.play, media_content_type: "music" });
      });
    });
    body.querySelectorAll("[data-add-q]").forEach(btn => {
      btn.addEventListener("click", e => { e.stopPropagation(); this._spotify("add_to_queue", { track_uri: btn.dataset.addQ }); });
    });
    body.querySelectorAll("[data-expand]").forEach(btn => {
      btn.addEventListener("click", () => { this._exp[btn.dataset.expand] = true; this._render(); });
    });
    if (this._focused) requestAnimationFrame(() => s.getElementById("si")?.focus());
  }

  _onHass() {}
}
customElements.define("spotify-search-card", SpotifySearchCard);

// ─── QUEUE CARD ──────────────────────────────────────────────────────────────

class SpotifyQueueCard extends SpotifyBase {
  constructor() { super(); this._data = null; this._loading = false; this._lastTrackId = ""; }
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config = c;
    this._ready = false; this._build(); this._ready = true;
    if (this._hass) this._onHass(null);
  }

  _build() {
    this.shadowRoot.innerHTML = `
<style>
${CARD_CSS}
ha-card { height: auto; display: flex; flex-direction: column; }
.hdr { padding: 14px 16px 8px; font-size: 0.85rem; font-weight: 700; color: var(--secondary-text-color); display: flex; align-items: center; justify-content: space-between; }
.refresh-btn { appearance: none; background: none; border: none; cursor: pointer; color: var(--secondary-text-color); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.refresh-btn:hover { background: var(--secondary-background-color); }
.body { overflow-y: auto; max-height: 400px; scrollbar-width: thin; scrollbar-color: var(--divider-color) transparent; }
.loading { text-align: center; padding: 22px; color: var(--secondary-text-color); }
.empty   { text-align: center; padding: 28px 16px; color: var(--secondary-text-color); font-size: 0.85rem; }
</style>
<ha-card>
  <div class="hdr">
    <span style="display:flex;align-items:center;gap:6px">${icon(MDI.queue,16)}&nbsp;Queue</span>
    <button class="refresh-btn" id="refresh" title="Refresh">${icon(MDI.refresh,18)}</button>
  </div>
  <div class="body" id="body"><div class="loading">Loading…</div></div>
</ha-card>`;
    this.shadowRoot.getElementById("refresh")?.addEventListener("click", () => this._load());
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
    const item = (t, now = false) => {
      const imgs = t.album?.images || [];
      return `
        <div class="list-item${now?" now-playing":""}" data-uri="${t.uri}">
          <div class="item-content">
            <img class="item-thumb" src="${imgs[0]?.url||""}" alt="" />
            <div class="item-info">
              <div class="item-title">${t.name}</div>
              <div class="item-sub">${(t.artists||[]).map(a=>a.name).join(", ")}</div>
            </div>
            <span style="font-size:0.72rem;color:var(--secondary-text-color)">${fmt(t.duration_ms/1000)}</span>
          </div>
          <div class="swipe-delete">${icon(MDI.delete,20)}</div>
        </div>`;
    };
    let html = "";
    if (cur) html += `<div class="queue-now">Now Playing</div>` + item(cur, true);
    if (q.length) html += `<div class="section-label">Next Up</div>` + q.slice(0,30).map(t=>item(t)).join("");
    body.innerHTML = html || `<div class="empty">Queue is empty.</div>`;
    body.querySelectorAll(".list-item[data-uri]").forEach(el => {
      let sx = 0, dx = 0;
      el.addEventListener("click", e => {
        if (el.classList.contains("swiped")) { el.classList.remove("swiped"); return; }
        if (e.target.closest(".swipe-delete")) return;
        this._mp("play_media", { media_content_id: el.dataset.uri, media_content_type: "music" });
      });
      el.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
      el.addEventListener("touchmove",  e => { dx = e.touches[0].clientX - sx; }, { passive: true });
      el.addEventListener("touchend",   () => { if (dx < -40) el.classList.add("swiped"); else el.classList.remove("swiped"); });
      el.querySelector(".swipe-delete")?.addEventListener("click", e => {
        e.stopPropagation(); el.style.opacity="0"; el.style.transition="opacity 0.2s";
        setTimeout(() => this._load(), 250);
      });
    });
  }

  _onHass() {
    // Auto-reload when track changes
    const tid = this._trackId;
    if (!this._data && !this._loading) { this._load(); return; }
    if (tid && tid !== this._lastTrackId) {
      this._lastTrackId = tid;
      this._load();
    }
  }
}
customElements.define("spotify-queue-card", SpotifyQueueCard);

// ─── LYRICS CARD ─────────────────────────────────────────────────────────────

class SpotifyLyricsCard extends SpotifyBase {
  constructor() { super(); this._data = null; this._lastTrackId = ""; this._prog = null; }
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config = c;
    this._ready = false; this._build(); this._ready = true;
    if (this._hass) this._onHass(null);
  }

  disconnectedCallback() { this._prog?.destroy(); }

  _build() {
    this.shadowRoot.innerHTML = `
<style>
${CARD_CSS}
ha-card { height: auto; display: flex; flex-direction: column; min-height: 200px; }
.hdr { padding: 14px 16px 8px; font-size: 0.85rem; font-weight: 700; color: var(--secondary-text-color); display: flex; align-items: center; gap: 6px; }
.body { overflow-y: auto; max-height: 420px; padding: 6px 0 16px; scrollbar-width: thin; }
.loading { text-align: center; padding: 22px; color: var(--secondary-text-color); }
.empty   { text-align: center; padding: 28px; color: var(--secondary-text-color); font-size: 0.85rem; }
</style>
<ha-card>
  <div class="hdr">${icon(MDI.mic,16)}&nbsp;Lyrics</div>
  <div class="body" id="body"><div class="loading">Loading…</div></div>
</ha-card>`;
    // Progress tracker for lyric highlighting (no DOM elements needed)
    this._prog = new ProgressTracker();
    this._prog.fillEl = null; this._prog.curEl = null; this._prog.durEl = null;
  }

  async _loadLyrics() {
    const body = this.shadowRoot.getElementById("body");
    if (!body) return;
    body.innerHTML = `<div class="loading">Loading lyrics…</div>`;
    this._data = null;
    try {
      const tok = this._hass?.auth?.data?.access_token;
      const r = await fetch(`/api/spotify_enhanced/lyrics?track_id=${this._trackId}`,
        { headers: { Authorization: `Bearer ${tok}` } });
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (!data?.lines?.length) throw new Error();
      this._data = data.lines;
      body.innerHTML = this._data.map((line, i) =>
        `<div class="lyric-line" data-i="${i}" data-t="${line.startTimeMs}">${line.words || "♪"}</div>`
      ).join("");
      body.querySelectorAll(".lyric-line[data-t]").forEach(el => {
        el.addEventListener("click", () =>
          this._mp("media_seek", { seek_position: round2(parseInt(el.dataset.t) / 1000) })
        );
      });
      this._highlight();
    } catch {
      body.innerHTML = `<div class="empty">Lyrics not available for this track.</div>`;
    }
  }

  _highlight() {
    const body = this.shadowRoot.getElementById("body");
    if (!body || !this._data || !this._prog) return;
    const nowMs = this._prog.current * 1000;
    const lines = body.querySelectorAll(".lyric-line[data-t]");
    let active = null;
    lines.forEach(el => { el.classList.remove("active"); if (parseInt(el.dataset.t) <= nowMs) active = el; });
    if (active) {
      active.classList.add("active");
      active.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  _onHass() {
    const so  = this._so;
    const tid = this._trackId;
    if (so) this._prog.sync(so);
    if (tid && tid !== this._lastTrackId) { this._lastTrackId = tid; this._loadLyrics(); }
    else if (this._data) this._highlight();
  }
}
customElements.define("spotify-lyrics-card", SpotifyLyricsCard);

// ─── VISUAL EDITOR ───────────────────────────────────────────────────────────

class SpotifyEnhancedCardEditor extends HTMLElement {
  set hass(h) {
    this._hass = h;
    const p = this.querySelector("ha-entity-picker");
    if (p) p.hass = h;
  }
  setConfig(c) { this._config = c; this._render(); }

  _render() {
    const c = this._config || {};
    const tog = (key, label, def = true) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--divider-color,#eee)">
        <span style="font-size:0.9rem">${label}</span>
        <ha-switch data-key="${key}" ${c[key] !== false && (c[key] !== undefined ? c[key] : def) ? "checked" : ""}></ha-switch>
      </div>`;
    this.innerHTML = `
      <style>:host{display:block;padding:4px 0} ha-entity-picker{display:block;margin-bottom:14px} .sh{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--secondary-text-color);margin:12px 0 4px}</style>
      <ha-entity-picker .hass="${this._hass||null}" .value="${c.entity||""}" .includeDomains="${["media_player"]}" label="Spotify Media Player Entity"></ha-entity-picker>
      <div class="sh">Controls</div>
      ${tog("show_seek",    "Show seek bar")}
      ${tog("show_volume",  "Show volume")}
      ${tog("show_shuffle", "Show shuffle")}
      ${tog("show_repeat",  "Show repeat")}
    `;
    const p = this.querySelector("ha-entity-picker");
    if (p) { p.hass = this._hass; p.addEventListener("value-changed", e => this._set("entity", e.detail.value)); }
    this.querySelectorAll("ha-switch[data-key]").forEach(sw =>
      sw.addEventListener("change", e => this._set(sw.dataset.key, e.target.checked))
    );
  }
  _set(k, v) {
    this._config = { ...this._config, [k]: v };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }
}
customElements.define("spotify-enhanced-card-editor", SpotifyEnhancedCardEditor);

// ─── Registration ─────────────────────────────────────────────────────────────

window.customCards = window.customCards || [];
window.customCards.push(
  { type: "spotify-enhanced-card", name: "Spotify Enhanced — Media Deck",    description: "Full player with art, controls, library, search, queue, devices and lyrics.", preview: true },
  { type: "spotify-mini-card",     name: "Spotify Enhanced — Mini Player",   description: "Compact single-row playback control.",                                         preview: true },
  { type: "spotify-device-card",   name: "Spotify Enhanced — Device Picker", description: "Browse and switch Spotify Connect devices.",                                    preview: true },
  { type: "spotify-search-card",   name: "Spotify Enhanced — Search",        description: "Standalone Spotify search card.",                                               preview: true },
  { type: "spotify-queue-card",    name: "Spotify Enhanced — Queue",         description: "View and manage the playback queue.",                                           preview: true },
  { type: "spotify-lyrics-card",   name: "Spotify Enhanced — Lyrics",        description: "Time-synced lyrics display.",                                                   preview: true },
);

console.info(
  `%c SPOTIFY ENHANCED %c v${VERSION} `,
  "color:#fff;background:#1DB954;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px",
  "color:#1DB954;background:#111;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0"
);
