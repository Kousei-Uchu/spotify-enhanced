/**
 * Spotify Enhanced Card  v1.1.3
 * Built on hui-media-control-card source patterns.
 * Colour extraction mirrors HA's exact node-vibrant logic.
 * Lyrics via lrclib.net.
 */
const VERSION = "1.1.3";

// ─── Utilities ───────────────────────────────────────────────────────────────

const fmt = (secs) => {
  if (secs == null || isNaN(secs)) return "0:00";
  const t = Math.max(0, Math.floor(secs));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = v => String(v).padStart(2, "0");
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = n => Math.round(n * 100) / 100;
const debounce = (fn, wait) => {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
};

// ─── MDI icon paths ──────────────────────────────────────────────────────────
// Using exact MDI variant names as specified

const MDI = {
  play:             "M8 5.14v14l11-7z",
  pause:            "M14 19h4V5h-4M6 19h4V5H6v14z",
  next:             "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
  prev:             "M6 6h2v12H6zm3.5 6 8.5 6V6z",
  // mdi:shuffle-disabled
  shuffle_off:      "M10.72 11.06 8.43 8.77C7.91 9.4 7.47 10.1 7.17 10.86L4.93 8.62C5.5 7.59 6.27 6.67 7.22 5.92L5.03 3.73l1.41-1.41 15.56 15.56-1.41 1.41-2.19-2.19c-.92.68-2.03 1.09-3.4 1.38V20.5h-2v-2.07c-1.33-.2-2.54-.73-3.56-1.52L3 14.5l1-1.73 3.44 1.99c-.04-.25-.07-.5-.07-.76 0-.71.17-1.38.44-1.98l2.91 2.91zM21 5.5l-1 1.73-4.35-2.52-.07.04V7h-2V4.93c-1.4.26-2.54.82-3.45 1.62l1.44 1.44C12.2 7.36 13.05 7 14 7c2.76 0 5 2.24 5 5 0 .28-.03.54-.07.8l1.63.94C20.82 12.62 21 11.83 21 11c0-1.7-.63-3.22-1.64-4.37L21 5.5z",
  // mdi:shuffle
  shuffle:          "M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  // mdi:repeat
  repeat:           "M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  // mdi:repeat-once
  repeat_one:       "M13 15V9h-1l-2 1v1h1.5v4M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  // mdi:repeat-off
  repeat_off:       "M6 6h12v3l4-4-4-4v3H4v6h2V6zm14 12H8v-3l-4 4 4 4v-3h14v-6h-2v5z",
  // mdi:microphone-variant
  mic_on:           "M12 2C10.31 2 9 3.31 9 5v6c0 1.69 1.31 3 3 3s3-1.31 3-3V5c0-1.69-1.31-3-3-3m5.3 9c-.41 2.3-2.43 4-4.8 4s-4.39-1.7-4.8-4H6c.46 2.86 2.85 5.06 5.75 5.44V20H10v2h4v-2h-1.75v-3.56C15.15 16.06 17.54 13.86 18 11h-1.7M12 4c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5c0-.55.45-1 1-1z",
  // mdi:microphone-variant-off
  mic_off:          "M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28m-4 .17c0-.06.01-.11.01-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18L15 11.17M4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z",
  // mdi:cards-heart
  heart:            "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  // mdi:cards-heart-outline
  heart_out:        "M12.1 18.55l-.1.1-.11-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04 1 3.57 2.36h1.87C13.46 6 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z",
  vol_off:          "M16.5 12c0-1.77-1-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z",
  vol_lo:           "M18.5 12c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03zM5 9v6h4l5 5V4L9 9H5z",
  vol_hi:           "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
  cast:             "M1 18v3h3a3 3 0 0 0-3-3zm0-4v2a7 7 0 0 1 7 7h2c0-5-4-9-9-9zm0-4v2c6.07 0 11 4.93 11 11h2C14 15.93 8.07 10 1 10zm20-7H3C1.9 3 1 3.9 1 5v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
  search:           "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  queue:            "M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z",
  // mdi:music-box-multiple
  library:          "M14 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 12.5c0 .83-.67 1.5-1.5 1.5S8 15.33 8 14.5V9h3v5.5zM20 6v14H6v2h14c1.1 0 2-.9 2-2V6h-2z",
  close:            "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  dots:             "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  add_q:            "M13 8H3V6h10v2zm0 4H3v-2h10v2zm4 4H3v-2h14v2zm-1 6v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3z",
  delete:           "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  chev_r:           "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  home:             "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  refresh:          "M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  play_box:         "M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 12.5v-7l6 3.5-6 3.5z",
};

const icon = (path, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" style="flex-shrink:0;display:block;pointer-events:none"><path d="${path}"/></svg>`;

// ─── Colour extraction — mirrors HA's node-vibrant customGenerator exactly ───
// We can't import node-vibrant in a plain JS file, so we reimplement the
// algorithm: sort swatches by population, pick background = most popular,
// find foreground = first colour with contrast ratio > 4.5 vs background,
// optionally searching "similar" colours (RGB diff < 150) for one that passes.

const CONTRAST_RATIO_THRESHOLD = 4.5;
const COLOR_SIMILARITY_THRESHOLD = 150;

function getRGBContrastRatio(rgb1, rgb2) {
  // WCAG relative luminance
  const lum = (rgb) => {
    const [r, g, b] = rgb.map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = lum(rgb1), l2 = lum(rgb2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function getYiq(rgb) {
  return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
}

// Quantise image into colour swatches using a simplified median-cut approach
function quantiseImage(imgEl, colorCount = 16) {
  const c = document.createElement("canvas");
  const size = 128;
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.drawImage(imgEl, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  // Build a map of quantised colours → pixel count
  const map = new Map();
  const q = 32; // quantisation step
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue; // skip transparent
    const r = Math.round(data[i]     / q) * q;
    const g = Math.round(data[i + 1] / q) * q;
    const b = Math.round(data[i + 2] / q) * q;
    const key = `${r},${g},${b}`;
    map.set(key, (map.get(key) || 0) + 1);
  }

  // Convert to swatches [{rgb, population}]
  return Array.from(map.entries())
    .map(([key, pop]) => ({ rgb: key.split(",").map(Number), population: pop }))
    .sort((a, b) => b.population - a.population)
    .slice(0, colorCount);
}

async function extractColors(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const swatches = quantiseImage(img);
        if (!swatches.length) { resolve(null); return; }

        // Background = most popular swatch (same as HA customGenerator)
        const bg = swatches[0];
        let fg = null;

        const contrastOk = (rgb) =>
          getRGBContrastRatio(bg.rgb, rgb) > CONTRAST_RATIO_THRESHOLD;

        // Find foreground: iterate remaining swatches, try each and similar ones
        for (let i = 1; i < swatches.length && !fg; i++) {
          if (contrastOk(swatches[i].rgb)) {
            fg = swatches[i].rgb; break;
          }
          // Search similar colours for one with good contrast
          const cur = swatches[i];
          for (let j = i + 1; j < swatches.length; j++) {
            const cmp = swatches[j];
            const diff =
              Math.abs(cur.rgb[0] - cmp.rgb[0]) +
              Math.abs(cur.rgb[1] - cmp.rgb[1]) +
              Math.abs(cur.rgb[2] - cmp.rgb[2]);
            if (diff > COLOR_SIMILARITY_THRESHOLD) continue;
            if (contrastOk(cmp.rgb)) { fg = cmp.rgb; break; }
          }
        }

        // Fallback: use YIQ to pick white or black (same as HA)
        if (!fg) fg = getYiq(bg.rgb) < 200 ? [255, 255, 255] : [0, 0, 0];

        const toHex = (rgb) =>
          "#" + rgb.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
        const toRgb = (rgb) => `rgb(${rgb.map(Math.round).join(",")})`;

        resolve({
          background: { hex: toHex(bg.rgb), rgb: bg.rgb },
          foreground: { hex: toHex(fg),     rgb: fg     },
        });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ─── Device stabiliser ──────────────────────────────────────────────────────

const _devOrder = [];
function stabiliseDevices(devices) {
  if (!devices?.length) { _devOrder.length = 0; return []; }
  const ids = new Set(devices.map(d => d.id));
  for (let i = _devOrder.length - 1; i >= 0; i--)
    if (!ids.has(_devOrder[i])) _devOrder.splice(i, 1);
  for (const d of devices)
    if (!_devOrder.includes(d.id)) _devOrder.push(d.id);
  const map = Object.fromEntries(devices.map(d => [d.id, d]));
  return _devOrder.map(id => map[id]).filter(Boolean);
}

// ─── Liked-songs tracker ────────────────────────────────────────────────────

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
      const d = await r.json();
      if (d?.[0]) _liked.add(trackId); else _liked.delete(trackId);
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

// ─── Progress tracker (mirrors HA getCurrentProgress exactly) ────────────────

class ProgressTracker {
  constructor() {
    this._pos = 0; this._dur = 0; this._updatedAt = 0;
    this._playing = false; this._raf = null;
    this.fillEl = null; this.curEl = null; this.durEl = null; this.thumbEl = null;
    this._drag = false; this._dragPct = 0;
  }

  sync(stateObj) {
    if (this._drag) return;
    const a = stateObj?.attributes ?? {};
    this._pos = a.media_position ?? 0;
    this._dur = a.media_duration ?? 0;
    this._playing = stateObj?.state === "playing";
    this._updatedAt = a.media_position_updated_at
      ? new Date(a.media_position_updated_at).getTime() : Date.now();
    if (this._playing) { if (!this._raf) this._raf = requestAnimationFrame(() => this._tick()); }
    else { cancelAnimationFrame(this._raf); this._raf = null; this._paint(this._pos); }
  }

  get current() {
    if (!this._playing) return this._pos;
    return clamp(this._pos + (Date.now() - this._updatedAt) / 1000, 0, this._dur || Infinity);
  }

  _tick() {
    this._raf = null;
    if (!this._playing || this._drag) return;
    this._paint(this.current);
    this._raf = requestAnimationFrame(() => this._tick());
  }

  _paint(secs) {
    const pct = this._dur ? clamp((secs / this._dur) * 100, 0, 100) : 0;
    if (this.fillEl)  this.fillEl.style.width = `${pct}%`;
    if (this.thumbEl) this.thumbEl.style.left = `${pct}%`;
    if (this.curEl)   this.curEl.textContent  = fmt(secs);
    if (this.durEl)   this.durEl.textContent  = fmt(this._dur);
  }

  startDrag(pct) { this._drag = true; this._dragPct = clamp(pct, 0, 1); this._paint(this._dragPct * this._dur); }
  moveDrag(pct)  { if (!this._drag) return; this._dragPct = clamp(pct, 0, 1); this._paint(this._dragPct * this._dur); }
  endDrag()      {
    this._drag = false; const secs = this._dragPct * this._dur;
    this._pos = secs; this._updatedAt = Date.now();
    if (this._playing) this._raf = requestAnimationFrame(() => this._tick());
    return secs;
  }
  destroy()      { cancelAnimationFrame(this._raf); this._raf = null; }
}

// ─── Volume drag ─────────────────────────────────────────────────────────────

class VolumeDrag {
  constructor(trackEl, fillEl, thumbEl, onChange) {
    this._track = trackEl; this._fill = fillEl; this._thumb = thumbEl;
    this._onChange = onChange; this._pct = 0; this._drag = false;
    if (!trackEl) return;
    trackEl.addEventListener("pointerdown", (e) => {
      this._drag = true; trackEl.setPointerCapture(e.pointerId); this._update(e);
      const mv = e => this._update(e);
      const up = e => { this._update(e); this._drag = false; this._onChange(this._pct); trackEl.removeEventListener("pointermove", mv); trackEl.removeEventListener("pointerup", up); };
      trackEl.addEventListener("pointermove", mv, { passive: true });
      trackEl.addEventListener("pointerup", up, { once: true });
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
  sync(pct01) { if (this._drag) return; this._pct = clamp(pct01, 0, 1); this._render(); }
}

// ─── Marquee ─────────────────────────────────────────────────────────────────

function startMarquee(wrap) {
  const inner = wrap?.querySelector(".mq-inner");
  if (!inner) return;
  const overflow = inner.scrollWidth - wrap.offsetWidth;
  if (overflow <= 0) { inner.style.animation = "none"; return; }
  const dur = Math.max(4, overflow / 40);
  inner.style.setProperty("--mq-dist", `-${overflow}px`);
  inner.style.setProperty("--mq-dur",  `${dur}s`);
  inner.style.animation = "mq-scroll var(--mq-dur) linear infinite";
}
function stopMarquee(wrap) {
  const inner = wrap?.querySelector(".mq-inner");
  if (inner) inner.style.animation = "none";
}

// ─── Base card class ──────────────────────────────────────────────────────────

class SpotifyBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null; this._config = {}; this._ready = false;
  }
  set hass(h) { const p = this._hass; this._hass = h; if (this._ready) this._onHass(p); }
  setConfig(c) { this._config = c; this._ready = false; this._build(); this._ready = true; if (this._hass) this._onHass(null); }

  get _so()      { return this._hass?.states?.[this._config?.entity]; }
  get _attrs()   { return this._so?.attributes ?? {}; }
  get _state()   { return this._so?.state ?? "idle"; }
  get _playing() { return this._state === "playing"; }
  get _title()   { return this._attrs.media_title ?? ""; }
  get _artist()  { return this._attrs.media_artist ?? ""; }
  get _album()   { return this._attrs.media_album_name ?? ""; }
  get _art()     { return this._attrs.entity_picture_local || this._attrs.entity_picture || ""; }
  get _vol()     { return clamp((this._attrs.volume_level ?? 0) * 100, 0, 100); }
  get _muted()   { return this._attrs.is_volume_muted ?? false; }
  get _shuffle() { return this._attrs.shuffle ?? false; }
  get _repeat()  { return this._attrs.repeat ?? "off"; }
  get _durSecs() { return this._attrs.media_duration ?? 0; }
  get _posSecs() { return this._attrs.media_position ?? 0; }
  get _devices() { return this._attrs.spotify_devices ?? []; }
  get _devId()   { return this._attrs.device_id ?? null; }
  get _trackId() { return this._attrs.track_id ?? null; }

  _call(domain, service, data = {}) { this._hass?.callService(domain, service, data); }
  _spotify(s, d = {}) { this._call("spotify_enhanced", s, d); }
  _mp(s, d = {})      { this._call("media_player", s, { entity_id: this._config.entity, ...d }); }

  _hassUrl(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return this._hass?.hassUrl(url) ?? url;
  }

  _build()      {}
  _onHass(prev) {}
}

// ─── Colour mixin — shared by all cards ─────────────────────────────────────

// Each card instance stores its own colours and applies them identically.
// Usage: call _syncColors(artUrl) in _onHass when art changes.

const colorMixin = {
  _initColors() { this._bgHex = ""; this._fgHex = ""; },

  async _syncColors(artUrl) {
    if (!artUrl) { this._bgHex = ""; this._fgHex = ""; this._applyColors(); return; }
    try {
      const colors = await extractColors(this._hassUrl(artUrl));
      if (colors) {
        this._bgHex = colors.background.hex;
        this._fgHex = colors.foreground.hex;
        this._applyColors();
      }
    } catch {}
  },

  // Subclasses override to do something with _bgHex / _fgHex
  _applyColors() {},
};

// ─── Shared CSS ───────────────────────────────────────────────────────────────

const CARD_CSS = `
*, *::before, *::after { box-sizing: border-box; }
@keyframes mq-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(var(--mq-dist, -50%)); }
}

ha-card {
  overflow: hidden; height: 100%; position: relative;
  color: var(--text-primary-color, #fff);
  font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
  user-select: none; -webkit-tap-highlight-color: transparent;
}

/* ── Background layer (identical to HA source) ── */
.background {
  display: flex; position: absolute; top: 0; left: 0;
  height: 100%; width: 100%; transition: filter 0.8s;
}
.color-block {
  background-color: var(--primary-color);
  transition: background-color 0.8s; width: 100%;
}
.color-gradient {
  position: absolute; height: 100%; right: 0;
  opacity: 1; transition: width 0.8s, opacity 0.8s linear 0.8s;
}
.image {
  background-color: var(--primary-color);
  background-position: center; background-size: cover; background-repeat: no-repeat;
  position: absolute; right: 0; height: 100%; opacity: 1;
  transition: width 0.8s, background-image 0.8s, background-color 0.8s, opacity 0.8s linear 0.8s;
}
.no-img {
  background-color: var(--primary-color);
  background-size: initial; background-repeat: no-repeat; background-position: center center;
  position: absolute; right: 0; height: 100%;
  background-image: url("/static/images/card_media_player_bg.png");
  width: 50%; transition: opacity 0.8s, background-color 0.8s;
}
.no-image .image { opacity: 0; }
.off .image, .off .color-gradient { opacity: 0; transition: opacity 0s, width 0.8s; width: 0; }
.unavailable .no-img,
.background:not(.off):not(.no-image) .no-img { opacity: 0; }
.off.background { filter: grayscale(1); }

/* ── Player layer ── */
.player {
  position: relative; padding: 16px; height: 100%;
  box-sizing: border-box; display: flex; flex-direction: column;
  justify-content: space-between;
  transition: color 0.4s, padding 0.4s;
}
.top-info { display: flex; justify-content: space-between; align-items: center; }
.top-left  { display: flex; align-items: center; gap: 2px; }
.top-right { display: flex; align-items: center; gap: 2px; }
.media-info { text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
.media-title { font-size: 1.2em; margin: 0 0 4px; }
.media-desc  { font-size: 0.85em; opacity: 0.8; }
.title-controls { padding-top: 16px; }

/* Marquee */
.mq-wrap  { overflow: hidden; white-space: nowrap; cursor: default; }
.mq-inner { display: inline-block; padding-right: 32px; }

/* ── Control buttons (HA source sizing) ── */
.controls {
  padding: 8px 8px 8px 0; display: flex;
  justify-content: flex-start; align-items: center;
  margin-left: -12px; direction: ltr;
}
.controls > .start { display: flex; align-items: center; flex-grow: 1; }
.controls > .end   { display: flex; align-items: center; }

button {
  appearance: none; background: none; border: none;
  cursor: pointer; color: inherit; padding: 0; margin: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  transition: opacity 0.15s, background 0.18s, transform 0.12s;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
}
button:disabled { opacity: 0.3; pointer-events: none; }

/* All control buttons get a subtle fade bg on hover */
.ctrl-btn {
  width: 44px; height: 44px;
}
.ctrl-btn:hover   { background: rgba(255,255,255,0.12); opacity: 1; }
.ctrl-btn:active  { transform: scale(0.88); }
/* Active state uses icon variant instead of colour — opacity only */
.ctrl-btn.active  { opacity: 1; }

.ctrl-btn.play-pause { width: 56px; height: 56px; }
.ctrl-btn.play-pause svg { width: 40px; height: 40px; }
.ctrl-btn.sm { width: 36px; height: 36px; }
.ctrl-btn.sm svg { width: 22px; height: 22px; }

/* ── Progress bar ── */
.prog-wrap { margin-top: 4px; }
.prog-bar  {
  position: relative; width: 100%; height: 4px;
  background: rgba(255,255,255,0.25); border-radius: 2px;
  cursor: pointer; touch-action: none; transition: height 0.1s;
}
.prog-bar:hover, .prog-bar.drag { height: 6px; }
.prog-fill {
  position: absolute; left: 0; top: 0; height: 100%;
  background: currentColor; border-radius: 2px; pointer-events: none;
}
.prog-thumb {
  position: absolute; top: 50%; left: 0;
  width: 14px; height: 14px; border-radius: 50%;
  background: currentColor; transform: translate(-50%, -50%);
  opacity: 0; transition: opacity 0.15s; pointer-events: none;
}
.prog-bar:hover .prog-thumb, .prog-bar.drag .prog-thumb { opacity: 1; }
.prog-times {
  display: flex; justify-content: space-between;
  font-size: 0.7em; opacity: 0.7; margin-top: 2px;
}

/* ── Volume ── */
.vol-row {
  display: flex; align-items: center; gap: 6px; padding: 2px 0 0;
}
.vol-icon { width: 28px; height: 28px; flex-shrink: 0; opacity: 0.7; }
.vol-icon:hover { opacity: 1; background: rgba(255,255,255,0.12); }
.vol-track {
  flex: 1; height: 3px; background: rgba(255,255,255,0.25);
  border-radius: 2px; cursor: pointer; position: relative;
  touch-action: none; transition: height 0.1s;
}
.vol-track:hover { height: 5px; }
.vol-fill  {
  position: absolute; left: 0; top: 0; height: 100%;
  background: currentColor; border-radius: 2px; pointer-events: none;
}
.vol-thumb {
  position: absolute; top: 50%; left: 0;
  width: 12px; height: 12px; border-radius: 50%;
  background: currentColor; transform: translate(-50%, -50%);
  opacity: 0; transition: opacity 0.15s; pointer-events: none;
}
.vol-track:hover .vol-thumb { opacity: 1; }

/* ── Narrow layout ── */
.player.narrow .ctrl-btn      { width: 40px; height: 40px; }
.player.narrow .ctrl-btn.play-pause { width: 50px; height: 50px; }
.player.narrow .ctrl-btn.play-pause svg { width: 36px; height: 36px; }
.player.no-progress .controls { padding-bottom: 0; }

/* ── Panels ── */
.backdrop {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5);
  z-index: 10; opacity: 0; pointer-events: none;
  transition: opacity 0.25s;
  backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
}
.backdrop.open { opacity: 1; pointer-events: auto; }

.slide-panel {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: var(--card-background-color, #1c1c1e);
  border-radius: 14px 14px 0 0; z-index: 11;
  display: flex; flex-direction: column; overflow: hidden;
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
  will-change: transform;
  /* Max-height set per-panel below */
}
.slide-panel.open { transform: translateY(0); }

#panel-search  { max-height: 70%; }
#panel-queue   { max-height: 70%; }
#panel-lib     { max-height: 80%; }
#panel-devices { max-height: 60%; }
#panel-lyrics  { max-height: 80%; }

.panel-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px 8px; flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.08); min-height: 48px;
}
.panel-title {
  font-size: 0.76rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.7px; color: var(--secondary-text-color, rgba(255,255,255,0.6));
  display: flex; align-items: center; gap: 6px; flex: 1; overflow: hidden;
}
.panel-close {
  width: 30px; height: 30px;
  color: var(--secondary-text-color, rgba(255,255,255,0.6));
}
.panel-close:hover { background: rgba(255,255,255,0.1); }
.panel-body {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent;
}
.panel-body::-webkit-scrollbar { width: 3px; }
.panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }

/* Search bar */
.search-bar { display: flex; gap: 6px; padding: 10px 14px 6px; flex-shrink: 0; }
.search-input {
  flex: 1; background: rgba(255,255,255,0.1);
  border: 1.5px solid rgba(255,255,255,0.15); border-radius: 8px;
  color: currentColor; padding: 8px 10px; font-size: 0.88rem; outline: none;
  transition: border-color 0.15s;
}
.search-input::placeholder { color: rgba(255,255,255,0.4); }
.search-input:focus { border-color: currentColor; }
.search-go {
  background: currentColor !important;
  border-radius: 8px; width: 38px; height: 38px; flex-shrink: 0;
  transition: opacity 0.15s;
}
.search-go svg { filter: invert(1) brightness(0) !important; /* always dark on coloured bg */ }
.search-go:hover { opacity: 0.85; }

/* List items */
.list-item {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 14px; cursor: pointer;
  transition: background 0.1s; position: relative; overflow: hidden;
}
.list-item:hover { background: rgba(255,255,255,0.07); }
.list-item.now-playing { background: rgba(255,255,255,0.12); }

.item-thumb {
  width: 42px; height: 42px; object-fit: cover; flex-shrink: 0;
  background: rgba(255,255,255,0.08);
  border-radius: 4px; /* albums: rounded corners, not circles */
}
.item-thumb.circle { border-radius: 50%; }
.item-ph {
  width: 42px; height: 42px; border-radius: 4px; flex-shrink: 0;
  background: rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.5);
}
.item-info { flex: 1; min-width: 0; }
.item-title { font-size: 0.87rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-sub   { font-size: 0.73rem; opacity: 0.65; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-btn   {
  width: 32px; height: 32px; color: rgba(255,255,255,0.5); flex-shrink: 0;
}
.item-btn:hover { background: rgba(255,255,255,0.1); color: currentColor; }

/* Section label */
.sec-label {
  padding: 10px 14px 3px; font-size: 0.63rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.6;
}

/* Show more */
.show-more-btn {
  display: block; width: 100%; padding: 8px; text-align: center;
  font-size: 0.78rem; opacity: 0.7; background: transparent;
  border: none; cursor: pointer; transition: background 0.15s;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.show-more-btn:hover { background: rgba(255,255,255,0.07); opacity: 1; }

/* Breadcrumb */
.breadcrumb {
  display: flex; align-items: center; gap: 2px;
  padding: 6px 14px 3px; overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap;
}
.breadcrumb::-webkit-scrollbar { display: none; }
.bc-btn {
  font-size: 0.75rem; padding: 3px 6px; border-radius: 6px;
  color: rgba(255,255,255,0.6); white-space: nowrap;
}
.bc-btn:hover { background: rgba(255,255,255,0.08); color: currentColor; }
.bc-btn.last  { color: currentColor; font-weight: 600; }
.bc-sep { opacity: 0.3; font-size: 0.75rem; }

/* Device items */
.device-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; cursor: pointer; transition: background 0.12s;
}
.device-item:hover { background: rgba(255,255,255,0.07); }
.device-item.active { background: rgba(255,255,255,0.12); }
.device-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; opacity: 0.7; flex-shrink: 0; }
.device-name { flex: 1; font-size: 0.9rem; font-weight: 500; }
.device-vol  { font-size: 0.74rem; opacity: 0.65; }
.active-dot  { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

/* Swipe-to-delete */
.swipe-del {
  position: absolute; right: 0; top: 0; bottom: 0;
  background: #c62828; color: #fff; width: 64px;
  display: flex; align-items: center; justify-content: center;
  transform: translateX(100%); transition: transform 0.2s; pointer-events: none;
}
.item-content { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; transition: transform 0.2s; }
.list-item.swiped .swipe-del   { transform: translateX(0); pointer-events: auto; }
.list-item.swiped .item-content{ transform: translateX(-64px); }

/* Queue now label */
.queue-now { padding: 8px 14px 3px; font-size: 0.63rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.7; }

/* Lyrics */
.lyric-line {
  padding: 8px 20px; font-size: 1rem; line-height: 1.5;
  opacity: 0.45; cursor: pointer; transition: opacity 0.3s, font-size 0.25s, font-weight 0.25s;
  border-radius: 6px;
}
.lyric-line.active { opacity: 1; font-size: 1.1rem; font-weight: 700; }
.lyric-line.no-lyrics { opacity: 0.4; cursor: default; font-style: italic; }
.lyric-line:hover:not(.no-lyrics) { background: rgba(255,255,255,0.07); }

.empty   { text-align: center; padding: 28px 16px; opacity: 0.55; font-size: 0.85rem; line-height: 1.6; }
.loading { text-align: center; padding: 22px; opacity: 0.55; font-size: 0.82rem; }
`;

// ─── MAIN CARD ────────────────────────────────────────────────────────────────

class SpotifyEnhancedCard extends SpotifyBase {
  constructor() {
    super();
    Object.assign(this, colorMixin);
    this._initColors();
    this._prog      = null;
    this._volDrag   = null;
    this._resizeObs = null;
    this._narrow    = false;
    this._openPanelId = null;
    this._libStack  = [];
    this._srQuery   = "";
    this._srResults = null;
    this._srExpand  = {};
    this._searchFocused = false;
    this._lyricsData = null;
    this._lastArt    = "";
    this._lastTrack  = "";
  }

  static getConfigElement() { return document.createElement("spotify-enhanced-card-editor"); }
  static getStubConfig()    { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config = {
      show_seek: true, show_volume: true, show_shuffle: true, show_repeat: true, ...c,
    };
    this._ready = false; this._build(); this._ready = true;
    if (this._hass) this._onHass(null);
  }

  connectedCallback() {
    this._attachObserver();
    if (this._prog && this._so) this._prog.sync(this._so);
  }
  disconnectedCallback() {
    this._prog?.destroy();
    this._resizeObs?.disconnect();
  }

  // ── DOM ───────────────────────────────────────────────────────────────────

  _build() {
    this.shadowRoot.innerHTML = `
<style>${CARD_CSS}</style>
<ha-card>

<!-- Background -->
<div class="background no-image off" id="bg">
  <div class="color-block"    id="clr-block"></div>
  <div class="no-img"         id="no-img"></div>
  <div class="image"          id="art-bg"></div>
  <div class="color-gradient" id="clr-grad"></div>
</div>

<!-- Player -->
<div class="player no-progress" id="player">

  <!-- Top row: left=Search,Library,Devices  right=Like,Lyrics,Queue,⋮ -->
  <div class="top-info">
    <div class="top-left">
      <button class="ctrl-btn sm" id="btn-search"  title="Search">${icon(MDI.search, 22)}</button>
      <button class="ctrl-btn sm" id="btn-lib"     title="Library">${icon(MDI.library, 22)}</button>
      <button class="ctrl-btn sm" id="btn-devices" title="Devices">${icon(MDI.cast, 22)}</button>
    </div>
    <div class="top-right">
      <button class="ctrl-btn sm" id="like-btn"    title="Like / Unlike"></button>
      <button class="ctrl-btn sm" id="btn-lyrics"  title="Lyrics">${icon(MDI.mic_on, 22)}</button>
      <button class="ctrl-btn sm" id="btn-queue"   title="Queue">${icon(MDI.queue, 22)}</button>
      <button class="ctrl-btn sm" id="btn-more"    title="More info">${icon(MDI.dots, 22)}</button>
    </div>
  </div>

  <!-- Title + controls -->
  <div id="media-section">
    <div class="title-controls">
      <div class="media-info">
        <div class="media-title">
          <div class="mq-wrap" id="title-wrap">
            <div class="mq-inner" id="title-inner">Nothing playing</div>
          </div>
        </div>
        <div class="media-desc" id="sub-text"></div>
      </div>

      <div class="controls">
        <div class="start">
          <button class="ctrl-btn" id="shuf-btn" title="Shuffle"></button>
          <button class="ctrl-btn" id="prev-btn" title="Previous">${icon(MDI.prev, 30)}</button>
          <button class="ctrl-btn play-pause" id="play-btn" title="Play/Pause"></button>
          <button class="ctrl-btn" id="next-btn" title="Next">${icon(MDI.next, 30)}</button>
          <button class="ctrl-btn" id="rep-btn"  title="Repeat"></button>
        </div>
        <div class="end"></div>
      </div>
    </div>

    <!-- Seek -->
    <div class="prog-wrap" id="prog-wrap">
      <div class="prog-bar" id="prog-bar">
        <div class="prog-fill"  id="prog-fill"></div>
        <div class="prog-thumb" id="prog-thumb"></div>
      </div>
      <div class="prog-times">
        <span id="p-cur">0:00</span>
        <span id="p-dur">0:00</span>
      </div>
    </div>

    <!-- Volume -->
    <div class="vol-row" id="vol-row">
      <button class="vol-icon" id="mute-btn"></button>
      <div class="vol-track" id="vol-track">
        <div class="vol-fill"  id="vol-fill"></div>
        <div class="vol-thumb" id="vol-thumb"></div>
      </div>
    </div>
  </div>
</div>

<!-- Backdrop -->
<div class="backdrop" id="backdrop"></div>

<!-- Search panel -->
<div class="slide-panel" id="panel-search">
  <div class="panel-hdr">
    <div class="panel-title">${icon(MDI.search,15)}&nbsp;Search</div>
    <button class="panel-close" id="close-search">${icon(MDI.close,18)}</button>
  </div>
  <div class="search-bar">
    <input class="search-input" id="search-in" placeholder="Search Spotify…" autocomplete="off" />
    <button class="search-go" id="search-go">${icon(MDI.search,18)}</button>
  </div>
  <div class="panel-body" id="search-body"></div>
</div>

<!-- Library panel -->
<div class="slide-panel" id="panel-lib">
  <div class="panel-hdr">
    <div class="panel-title" id="lib-title">${icon(MDI.library,15)}&nbsp;Library</div>
    <button class="panel-close" id="close-lib">${icon(MDI.close,18)}</button>
  </div>
  <div class="panel-body" id="lib-body"></div>
</div>

<!-- Devices panel -->
<div class="slide-panel" id="panel-devices">
  <div class="panel-hdr">
    <div class="panel-title">${icon(MDI.cast,15)}&nbsp;Devices</div>
    <button class="panel-close" id="close-devices">${icon(MDI.close,18)}</button>
  </div>
  <div class="panel-body" id="devices-body"></div>
</div>

<!-- Queue panel -->
<div class="slide-panel" id="panel-queue">
  <div class="panel-hdr">
    <div class="panel-title">${icon(MDI.queue,15)}&nbsp;Queue</div>
    <button class="panel-close" id="close-queue">${icon(MDI.close,18)}</button>
  </div>
  <div class="panel-body" id="queue-body"><div class="loading">Loading…</div></div>
</div>

<!-- Lyrics panel -->
<div class="slide-panel" id="panel-lyrics">
  <div class="panel-hdr">
    <div class="panel-title">${icon(MDI.mic_on,15)}&nbsp;Lyrics</div>
    <button class="panel-close" id="close-lyrics">${icon(MDI.close,18)}</button>
  </div>
  <div class="panel-body" id="lyrics-body"><div class="loading">Loading…</div></div>
</div>

</ha-card>`;

    this._bindEvents();

    this._prog = new ProgressTracker();
    this._prog.fillEl  = this.shadowRoot.getElementById("prog-fill");
    this._prog.thumbEl = this.shadowRoot.getElementById("prog-thumb");
    this._prog.curEl   = this.shadowRoot.getElementById("p-cur");
    this._prog.durEl   = this.shadowRoot.getElementById("p-dur");
    this._bindSeek();

    this._volDrag = new VolumeDrag(
      this.shadowRoot.getElementById("vol-track"),
      this.shadowRoot.getElementById("vol-fill"),
      this.shadowRoot.getElementById("vol-thumb"),
      pct => this._mp("volume_set", { volume_level: round2(pct) }),
    );

    this._attachObserver();
  }

  _attachObserver() {
    const card = this.shadowRoot?.querySelector("ha-card");
    if (!card) return;
    if (!this._resizeObs) {
      this._resizeObs = new ResizeObserver(debounce(() => this._measureCard(), 250));
    }
    this._resizeObs.observe(card);
  }

  _measureCard() {
    const card = this.shadowRoot?.querySelector("ha-card");
    if (!card) return;
    this._narrow = card.offsetWidth < 350;
    const cardH  = card.offsetHeight;
    // Art image width = card height (square), same as HA source
    const artBg  = this.shadowRoot.getElementById("art-bg");
    const grad   = this.shadowRoot.getElementById("clr-grad");
    if (artBg) artBg.style.width = `${cardH}px`;
    if (grad)  grad.style.width  = `${cardH}px`;
    const player = this.shadowRoot.getElementById("player");
    if (player) player.classList.toggle("narrow", this._narrow);
  }

  // ── Event binding ─────────────────────────────────────────────────────────

  _bindEvents() {
    const s = this.shadowRoot;

    s.getElementById("play-btn").addEventListener("click", () => this._mp(this._playing ? "media_pause" : "media_play"));
    s.getElementById("prev-btn").addEventListener("click", () => this._mp("media_previous_track"));
    s.getElementById("next-btn").addEventListener("click", () => this._mp("media_next_track"));
    s.getElementById("shuf-btn").addEventListener("click", () => this._mp("shuffle_set", { shuffle: !this._shuffle }));
    s.getElementById("rep-btn").addEventListener("click", () => {
      this._mp("repeat_set", { repeat: { off:"all", all:"one", one:"off" }[this._repeat] ?? "off" });
    });
    s.getElementById("mute-btn").addEventListener("click", () => this._mp("volume_mute", { is_volume_muted: !this._muted }));
    s.getElementById("like-btn").addEventListener("click", () => {
      this._paintLike(toggleLiked(this._trackId, this._hass));
    });

    // Panel openers
    s.getElementById("btn-search").addEventListener("click",  () => this._openPanel("search"));
    s.getElementById("btn-lib").addEventListener("click",     () => this._openPanel("lib"));
    s.getElementById("btn-devices").addEventListener("click", () => this._openPanel("devices"));
    s.getElementById("btn-queue").addEventListener("click",   () => this._openPanel("queue"));
    s.getElementById("btn-lyrics").addEventListener("click",  () => this._openPanel("lyrics"));

    // Close buttons — each explicitly calls _closePanel
    for (const id of ["search","lib","devices","queue","lyrics"]) {
      s.getElementById(`close-${id}`)?.addEventListener("click", (e) => {
        e.stopPropagation();
        this._closePanel();
      });
    }
    s.getElementById("backdrop").addEventListener("click", () => this._closePanel());

    s.getElementById("btn-more").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("hass-more-info",
        { detail: { entityId: this._config.entity }, bubbles: true, composed: true }));
    });

    // Search
    const si = s.getElementById("search-in");
    si?.addEventListener("focus", () => { this._searchFocused = true; });
    si?.addEventListener("blur",  () => { this._searchFocused = false; });
    si?.addEventListener("keydown", e => { if (e.key === "Enter") this._doSearch(); });
    s.getElementById("search-go")?.addEventListener("click", () => this._doSearch());

    // Marquee
    const tw = s.getElementById("title-wrap");
    tw?.addEventListener("mouseenter", () => startMarquee(tw));
    tw?.addEventListener("mouseleave", () => stopMarquee(tw));

    // Hover icon preview for shuffle/repeat
    this._bindHoverIcons();
  }

  _bindHoverIcons() {
    const s = this.shadowRoot;

    // Shuffle: hover shows what click will do
    const shuf = s.getElementById("shuf-btn");
    shuf?.addEventListener("mouseenter", () => {
      shuf.innerHTML = icon(this._shuffle ? MDI.shuffle_off : MDI.shuffle, 28);
    });
    shuf?.addEventListener("mouseleave", () => this._paintShuf());

    // Repeat cycles off→all→one→off
    const rep = s.getElementById("rep-btn");
    rep?.addEventListener("mouseenter", () => {
      const next = { off: MDI.repeat, all: MDI.repeat_one, one: MDI.repeat_off }[this._repeat];
      rep.innerHTML = icon(next, 28);
    });
    rep?.addEventListener("mouseleave", () => this._paintRep());

    // Like: hover shows what click will do
    const like = s.getElementById("like-btn");
    like?.addEventListener("mouseenter", () => {
      like.innerHTML = icon(_liked.has(this._trackId) ? MDI.heart_out : MDI.heart, 20);
    });
    like?.addEventListener("mouseleave", () => this._paintLike(_liked.has(this._trackId)));
  }

  _bindSeek() {
    const s = this.shadowRoot;
    const bar = s.getElementById("prog-bar");
    if (!bar) return;
    const pct = e => { const r = bar.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); };
    bar.addEventListener("pointerdown", e => {
      bar.classList.add("drag"); bar.setPointerCapture(e.pointerId);
      this._prog.startDrag(pct(e));
      const mv = e => this._prog.moveDrag(pct(e));
      const up = e => {
        bar.classList.remove("drag");
        const secs = this._prog.endDrag();
        this._mp("media_seek", { seek_position: round2(secs) });
        bar.removeEventListener("pointermove", mv);
        bar.removeEventListener("pointerup", up);
      };
      bar.addEventListener("pointermove", mv, { passive: true });
      bar.addEventListener("pointerup", up, { once: true });
    });
  }

  // ── Panel management ──────────────────────────────────────────────────────

  _openPanel(id) {
    if (this._openPanelId === id) { this._closePanel(); return; }
    const s = this.shadowRoot;
    if (this._openPanelId) s.getElementById(`panel-${this._openPanelId}`)?.classList.remove("open");
    this._openPanelId = id;
    s.getElementById("backdrop").classList.add("open");
    s.getElementById(`panel-${id}`)?.classList.add("open");

    if (id === "queue")   this._loadQueue();
    if (id === "devices") this._renderDevices();
    if (id === "lyrics")  this._loadLyrics();
    if (id === "lib" && !this._libStack.length) this._renderLibRoot();
    if (id === "search") {
      requestAnimationFrame(() => {
        s.getElementById("search-in")?.focus();
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

  // ── Colours ───────────────────────────────────────────────────────────────

  _applyColors() {
    const s  = this.shadowRoot;
    const bg = this._bgHex;
    const fg = this._fgHex;

    // Background elements — same as HA source
    s.getElementById("clr-block")?.style.setProperty("background-color", bg || "");
    s.getElementById("no-img")?.style.setProperty("background-color", bg || "");
    const grad = s.getElementById("clr-grad");
    if (grad) {
      grad.style.backgroundImage = bg
        ? `linear-gradient(to right, ${bg}, ${bg}00)` : "";
    }
    // Foreground — player layer colour (controls, text, icons all inherit this)
    const player = s.getElementById("player");
    if (player) player.style.color = fg || "";
  }

  // ── Update ────────────────────────────────────────────────────────────────

  _onHass(prev) {
    const s   = this.shadowRoot;
    const so  = this._so;
    const art = this._art;
    const isOff = !so || ["off","unavailable","unknown"].includes(this._state);

    // Background layer
    const bg = s.getElementById("bg");
    if (bg) {
      bg.classList.toggle("no-image",   !art);
      bg.classList.toggle("off",        isOff);
      bg.classList.toggle("unavailable",this._state === "unavailable");
    }

    // Art background div (same as HA source — background-image on a div)
    const artBg = s.getElementById("art-bg");
    if (artBg) {
      artBg.style.backgroundImage = art ? `url(${this._hassUrl(art)})` : "";
    }

    // Extract colours when art changes
    if (art !== this._lastArt) {
      this._lastArt = art;
      this._syncColors(art);  // from colorMixin
    }

    // Title
    const ti = s.getElementById("title-inner");
    if (ti) ti.textContent = this._title || "Nothing playing";
    const sub = s.getElementById("sub-text");
    if (sub) sub.textContent = [this._artist, this._album].filter(Boolean).join(" · ");

    // Play button
    s.getElementById("play-btn").innerHTML = icon(this._playing ? MDI.pause : MDI.play, 40);

    // Shuffle / repeat
    this._paintShuf();
    this._paintRep();

    // Shuffle/Repeat visibility
    s.getElementById("shuf-btn").style.visibility = this._config.show_shuffle !== false ? "" : "hidden";
    s.getElementById("rep-btn").style.visibility  = this._config.show_repeat  !== false ? "" : "hidden";

    // Progress
    const showProg = this._config.show_seek !== false
      && !this._narrow
      && (this._playing || this._state === "paused")
      && this._durSecs > 0;
    s.getElementById("prog-wrap").style.display = showProg ? "" : "none";
    s.getElementById("player")?.classList.toggle("no-progress", !showProg);
    if (showProg && so) this._prog.sync(so);

    // Volume
    s.getElementById("vol-row").style.display = this._config.show_volume !== false ? "" : "none";
    s.getElementById("mute-btn").innerHTML = icon(
      this._muted ? MDI.vol_off : this._vol > 50 ? MDI.vol_hi : MDI.vol_lo, 22
    );
    this._volDrag?.sync(this._muted ? 0 : this._vol / 100);

    // Like
    if (this._trackId !== this._lastTrack) {
      this._lastTrack = this._trackId;
      checkLiked(this._trackId, this._hass).then(() => this._paintLike(_liked.has(this._trackId)));
    }
    this._paintLike(_liked.has(this._trackId));

    // Live devices panel
    if (this._openPanelId === "devices") this._renderDevices();

    // Live lyrics highlight
    if (this._openPanelId === "lyrics" && this._lyricsData) this._highlightLyric();

    this._measureCard();
  }

  _paintShuf() {
    const btn = this.shadowRoot.getElementById("shuf-btn");
    if (!btn) return;
    btn.innerHTML = icon(this._shuffle ? MDI.shuffle : MDI.shuffle_off, 28);
    // No colour change — icon variant conveys state
  }

  _paintRep() {
    const btn = this.shadowRoot.getElementById("rep-btn");
    if (!btn) return;
    const ico = { off: MDI.repeat_off, all: MDI.repeat, one: MDI.repeat_one }[this._repeat] ?? MDI.repeat_off;
    btn.innerHTML = icon(ico, 28);
  }

  _paintLike(liked) {
    const btn = this.shadowRoot.getElementById("like-btn");
    if (!btn) return;
    btn.innerHTML = icon(liked ? MDI.heart : MDI.heart_out, 20);
    btn.title     = liked ? "Remove from Liked Songs" : "Save to Liked Songs";
  }

  // ── Library ───────────────────────────────────────────────────────────────

  _renderLibRoot() {
    const body = this.shadowRoot.getElementById("lib-body");
    if (!body) return;
    const roots = [
      ["spotify://category/playlists",       MDI.library, "Playlists",       true],
      ["spotify://category/liked_songs",     MDI.heart,   "Liked Songs",     false],
      ["spotify://category/recently_played", MDI.queue,   "Recently Played", false],
      ["spotify://category/top_tracks",      MDI.play_box,"Top Tracks",      false],
      ["spotify://category/top_artists",     MDI.mic_on,  "Top Artists",     true],
      ["spotify://category/new_releases",    MDI.library, "New Releases",    true],
      ["spotify://category/featured",        MDI.play_box,"Featured",        true],
    ];
    body.innerHTML = roots.map(([id, ico, label, exp]) => `
      <div class="list-item" data-id="${id}" data-exp="${exp}" data-label="${label}">
        <div class="item-content">
          <div class="item-ph">${icon(ico,18)}</div>
          <div class="item-info"><div class="item-title">${label}</div></div>
          ${icon(MDI.chev_r,16)}
        </div>
      </div>`).join("");
    this._bindLibItems(body);
    this._libStack = [];
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
      btn.addEventListener("click", e => {
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
        media_content_id: id, media_content_type: "music",
      });
      body.innerHTML = (r.children || []).map(item => {
        const isArtist = item.media_class === "artist";
        const thumb = item.thumbnail
          ? `<img class="item-thumb${isArtist?" circle":""}" src="${item.thumbnail}" alt="" />`
          : `<div class="item-ph">${icon(MDI.library,16)}</div>`;
        const right = !item.can_expand
          ? `<button class="item-btn" data-add-q="${item.media_content_id}" title="Add to queue">${icon(MDI.add_q,16)}</button>`
          : icon(MDI.chev_r,16);
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
    } catch { body.innerHTML = `<div class="empty">Could not load.</div>`; }
  }

  _updateLibTitle() {
    const el = this.shadowRoot.getElementById("lib-title");
    if (!el) return;
    if (!this._libStack.length) { el.innerHTML = `${icon(MDI.library,15)}&nbsp;Library`; return; }
    const crumbs = [
      `<button class="bc-btn" data-nav="-1">${icon(MDI.home,12)}&nbsp;Library</button>`,
      ...this._libStack.map((p,i) =>
        `<span class="bc-sep">›</span><button class="bc-btn${i===this._libStack.length-1?" last":""}" data-nav="${i}">${p.label}</button>`)
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
        { headers: { Authorization: `Bearer ${tok}` } });
      if (r.ok) { this._srResults = await r.json(); this._renderSearch(); }
      else if (body) body.innerHTML = `<div class="empty">Search failed.</div>`;
    } catch { s.getElementById("search-body").innerHTML = `<div class="empty">Search failed.</div>`; }
  }

  _renderSearch() {
    const s = this.shadowRoot, body = s.getElementById("search-body");
    if (!body || !this._srResults) return;
    const R = this._srResults;

    const mkTrack  = t => `
      <div class="list-item" data-play="${t.uri}">
        <div class="item-content">
          <img class="item-thumb" src="${t.album?.images?.[0]?.url||""}" alt="" />
          <div class="item-info">
            <div class="item-title">${t.name}</div>
            <div class="item-sub">${(t.artists||[]).map(a=>a.name).join(", ")}</div>
          </div>
          <button class="item-btn" data-add-q="${t.uri}" title="Add to queue">${icon(MDI.add_q,16)}</button>
        </div>
      </div>`;
    // Albums: rounded corners (border-radius:4px default), NOT circles
    const mkAlbum  = a => `
      <div class="list-item" data-play="${a.uri}">
        <div class="item-content">
          <img class="item-thumb" src="${a.images?.[0]?.url||""}" alt="" />
          <div class="item-info">
            <div class="item-title">${a.name}</div>
            <div class="item-sub">${(a.artists||[]).map(x=>x.name).join(", ")}</div>
          </div>
        </div>
      </div>`;
    const mkArtist = a => `
      <div class="list-item" data-play="${a.uri}">
        <div class="item-content">
          <img class="item-thumb circle" src="${a.images?.[0]?.url||""}" alt="" />
          <div class="item-info">
            <div class="item-title">${a.name}</div>
            <div class="item-sub">Artist</div>
          </div>
        </div>
      </div>`;
    const mkPl     = p => `
      <div class="list-item" data-play="${p.uri}">
        <div class="item-content">
          <img class="item-thumb" src="${p.images?.[0]?.url||""}" alt="" />
          <div class="item-info">
            <div class="item-title">${p.name}</div>
            <div class="item-sub">Playlist · ${p.owner?.display_name||""}</div>
          </div>
        </div>
      </div>`;

    const section = (label, key, mkFn, n) => {
      const items = R[key]?.items;
      if (!items?.length) return "";
      const shown = this._srExpand[key] ? items : items.slice(0, n);
      const total = R[key]?.total || items.length;
      const more  = !this._srExpand[key] && total > n
        ? `<button class="show-more-btn" data-expand="${key}">Show more ${label.toLowerCase()} (${total})</button>` : "";
      return `<div class="sec-label">${label}</div>${shown.map(mkFn).join("")}${more}`;
    };

    const html =
      section("Tracks","tracks",mkTrack,5) +
      section("Albums","albums",mkAlbum,4) +
      section("Artists","artists",mkArtist,4) +
      section("Playlists","playlists",mkPl,4);
    body.innerHTML = html || `<div class="empty">No results.</div>`;

    body.querySelectorAll(".list-item[data-play]").forEach(el => {
      el.addEventListener("click", e => {
        if (e.target.closest("[data-add-q]")) return;
        this._mp("play_media", { media_content_id: el.dataset.play, media_content_type: "music" });
        this._closePanel();
      });
    });
    body.querySelectorAll("[data-add-q]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        this._spotify("add_to_queue", { track_uri: btn.dataset.addQ });
      });
    });
    body.querySelectorAll("[data-expand]").forEach(btn => {
      btn.addEventListener("click", () => { this._srExpand[btn.dataset.expand] = true; this._renderSearch(); });
    });
    if (this._searchFocused) requestAnimationFrame(() => s.getElementById("search-in")?.focus());
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
      this._renderQueue(body, await r.json());
    } catch { body.innerHTML = `<div class="empty">Queue unavailable. Start playback first.</div>`; }
  }

  _renderQueue(body, data) {
    const cur = data.currently_playing;
    const q   = data.queue || [];
    const mkItem = (t, isNow=false) => {
      const img = t.album?.images?.[0]?.url || "";
      const art = (t.artists||[]).map(a=>a.name).join(", ");
      return `
        <div class="list-item${isNow?" now-playing":""}" data-uri="${t.uri}">
          <div class="item-content">
            <img class="item-thumb" src="${img}" alt="" />
            <div class="item-info">
              <div class="item-title">${t.name}</div>
              <div class="item-sub">${art}</div>
            </div>
            <span style="font-size:0.72rem;opacity:0.6">${fmt(t.duration_ms/1000)}</span>
          </div>
          <div class="swipe-del">${icon(MDI.delete,20)}</div>
        </div>`;
    };
    let html = "";
    if (cur) html += `<div class="queue-now">Now Playing</div>` + mkItem(cur, true);
    if (q.length) html += `<div class="sec-label">Next Up</div>` + q.slice(0,30).map(t=>mkItem(t)).join("");
    body.innerHTML = html || `<div class="empty">Queue is empty.</div>`;

    // Track the queue order for skip-to logic
    const qUris = q.map(t => t.uri);

    body.querySelectorAll(".list-item[data-uri]").forEach((el, idx) => {
      let sx=0, dx=0;
      el.addEventListener("click", async e => {
        if (el.classList.contains("swiped")) { el.classList.remove("swiped"); return; }
        if (e.target.closest(".swipe-del")) return;
        // Skip-to: mute → skip N times → unmute
        const uri = el.dataset.uri;
        const pos = qUris.indexOf(uri);
        if (pos >= 0) {
          const prevVol = this._vol;
          const wasMuted = this._muted;
          if (!wasMuted) this._mp("volume_mute", { is_volume_muted: true });
          for (let i = 0; i <= pos; i++) {
            this._mp("media_next_track");
            await new Promise(r => setTimeout(r, 350));
          }
          if (!wasMuted) {
            await new Promise(r => setTimeout(r, 400));
            this._mp("volume_mute", { is_volume_muted: false });
          }
        }
        this._closePanel();
      });
      el.addEventListener("touchstart", e => { sx=e.touches[0].clientX; }, { passive:true });
      el.addEventListener("touchmove",  e => { dx=e.touches[0].clientX-sx; }, { passive:true });
      el.addEventListener("touchend",   () => { if(dx<-40) el.classList.add("swiped"); else el.classList.remove("swiped"); });
      el.querySelector(".swipe-del")?.addEventListener("click", e => {
        e.stopPropagation(); el.style.opacity="0"; el.style.transition="opacity 0.2s";
        setTimeout(() => this._loadQueue(), 250);
      });
    });
  }

  // ── Devices ───────────────────────────────────────────────────────────────

  _renderDevices() {
    const body = this.shadowRoot.getElementById("devices-body");
    if (!body) return;
    const devices = stabiliseDevices(this._devices);
    if (!devices.length) { body.innerHTML = `<div class="empty">No devices found. Open Spotify on a device.</div>`; return; }
    body.innerHTML = devices.map(d => `
      <div class="device-item${d.id===this._devId?" active":""}" data-id="${d.id}">
        <div class="device-icon">${icon(MDI.cast,22)}</div>
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

  // ── Lyrics via lrclib.net ─────────────────────────────────────────────────

  async _loadLyrics() {
    const body = this.shadowRoot.getElementById("lyrics-body");
    if (!body) return;
    body.innerHTML = `<div class="loading">Loading lyrics…</div>`;
    this._lyricsData = null;

    const title  = this._title;
    const artist = this._artist;
    const album  = this._album;
    const durSec = this._durSecs;

    if (!title || !artist) { body.innerHTML = `<div class="empty">No track playing.</div>`; return; }

    try {
      // lrclib.net API — free, no auth required
      const params = new URLSearchParams({
        track_name:   title,
        artist_name:  artist,
        album_name:   album || "",
        duration:     Math.round(durSec),
      });
      const r = await fetch(`https://lrclib.net/api/get?${params}`);
      if (!r.ok) throw new Error("not found");
      const data = await r.json();

      // Prefer synced lyrics (LRC format), fall back to plain text
      if (data.syncedLyrics) {
        // Parse LRC: [mm:ss.xx] text
        const lines = data.syncedLyrics.split("\n").map(line => {
          const m = line.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)/);
          if (!m) return null;
          const startMs = (parseInt(m[1]) * 60 + parseFloat(m[2])) * 1000;
          return { startMs, words: m[3].trim() };
        }).filter(Boolean);
        this._lyricsData = lines;
        this._renderLyrics(body, lines, true);
      } else if (data.plainLyrics) {
        // Plain lyrics — no timestamps, just display
        const lines = data.plainLyrics.split("\n").map(w => ({ startMs: null, words: w }));
        this._lyricsData = null; // no syncing for plain lyrics
        body.innerHTML = lines.map(l =>
          l.words
            ? `<div class="lyric-line no-lyrics">${l.words}</div>`
            : `<div style="height:8px"></div>`
        ).join("");
      } else {
        throw new Error("empty");
      }
    } catch {
      body.innerHTML = `<div class="empty">${icon(MDI.mic_off,28)}<br><br>Lyrics not available for this track.</div>`;
    }
  }

  _renderLyrics(body, lines, synced) {
    body.innerHTML = lines.map((l, i) =>
      `<div class="lyric-line${l.words?"":" no-lyrics"}" data-i="${i}" data-t="${l.startMs??""}">${l.words||"♪"}</div>`
    ).join("");
    body.querySelectorAll(".lyric-line[data-t]").forEach(el => {
      if (!el.dataset.t) return;
      el.addEventListener("click", () =>
        this._mp("media_seek", { seek_position: round2(parseInt(el.dataset.t) / 1000) })
      );
    });
    this._highlightLyric();
  }

  _highlightLyric() {
    const body = this.shadowRoot.getElementById("lyrics-body");
    if (!body || !this._lyricsData || !this._prog) return;
    const nowMs = this._prog.current * 1000;
    const lines = body.querySelectorAll(".lyric-line[data-t]");
    let active = null;
    lines.forEach(el => { el.classList.remove("active"); if (el.dataset.t && parseInt(el.dataset.t) <= nowMs) active = el; });
    if (active) { active.classList.add("active"); active.scrollIntoView({ behavior:"smooth", block:"center" }); }
  }
}

customElements.define("spotify-enhanced-card", SpotifyEnhancedCard);

// ─── MINI CARD ────────────────────────────────────────────────────────────────

class SpotifyMiniCard extends SpotifyBase {
  constructor() { super(); Object.assign(this, colorMixin); this._initColors(); this._lastArt = ""; }
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
  display: flex; align-items: center; padding: 10px 12px; gap: 10px;
  height: auto; overflow: hidden;
}
.art { width: 48px; height: 48px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: rgba(255,255,255,0.08); }
.info { flex: 1; min-width: 0; }
.mt { font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms { font-size: 0.74rem; opacity: 0.65; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.vrow { display: flex; align-items: center; gap: 4px; margin-top: 5px; }
.vrow .vol-track { flex: 1; }
.ctrls { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.cb { width: 36px; height: 36px; }
.pb { width: 44px; height: 44px; }
.pb svg { width: 30px; height: 30px; }
</style>
<ha-card>
  <img class="art" id="art" src="" alt="" />
  <div class="info">
    <div class="mt" id="mt">Nothing playing</div>
    <div class="ms" id="ms"></div>
    <div class="vrow" id="vrow">
      <button class="ctrl-btn cb" id="mute">${icon(MDI.vol_lo,18)}</button>
      <div class="vol-track" id="vt"><div class="vol-fill" id="vf"></div><div class="vol-thumb" id="vh"></div></div>
    </div>
  </div>
  <div class="ctrls">
    <button class="ctrl-btn cb" id="prev">${icon(MDI.prev,22)}</button>
    <button class="ctrl-btn pb" id="play">${icon(MDI.play,30)}</button>
    <button class="ctrl-btn cb" id="next">${icon(MDI.next,22)}</button>
  </div>
</ha-card>`;
    const s = this.shadowRoot;
    s.getElementById("play").addEventListener("click", () => this._mp(this._playing?"media_pause":"media_play"));
    s.getElementById("prev").addEventListener("click", () => this._mp("media_previous_track"));
    s.getElementById("next").addEventListener("click", () => this._mp("media_next_track"));
    s.getElementById("mute").addEventListener("click", () => this._mp("volume_mute", { is_volume_muted: !this._muted }));
    this._vd = new VolumeDrag(
      s.getElementById("vt"), s.getElementById("vf"), s.getElementById("vh"),
      pct => this._mp("volume_set", { volume_level: round2(pct) })
    );
  }

  _applyColors() {
    const player = this.shadowRoot.querySelector("ha-card");
    if (player) player.style.backgroundColor = this._bgHex || "";
    // Foreground applied via color on ha-card
    const s = this.shadowRoot.querySelector(".info");
    if (s) s.style.color = this._fgHex || "";
    const c = this.shadowRoot.querySelector(".ctrls");
    if (c) c.style.color = this._fgHex || "";
  }

  _onHass() {
    const s   = this.shadowRoot;
    const art = this._art;
    if (art !== this._lastArt) { this._lastArt = art; this._syncColors(art); }
    s.getElementById("art").src = this._hassUrl(art);
    s.getElementById("mt").textContent = this._title || "Nothing playing";
    s.getElementById("ms").textContent = this._artist;
    s.getElementById("play").innerHTML  = icon(this._playing?MDI.pause:MDI.play, 30);
    s.getElementById("mute").innerHTML  = icon(this._muted?MDI.vol_off:MDI.vol_lo, 18);
    s.getElementById("vrow").style.display = this._config.show_volume!==false?"flex":"none";
    this._vd?.sync(this._muted?0:this._vol/100);
  }
}
customElements.define("spotify-mini-card", SpotifyMiniCard);

// ─── DEVICE CARD ─────────────────────────────────────────────────────────────

class SpotifyDeviceCard extends SpotifyBase {
  constructor() { super(); Object.assign(this, colorMixin); this._initColors(); this._lastArt=""; }
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
.hdr { padding: 14px 14px 8px; font-size: 0.82rem; font-weight: 700; opacity: 0.7; display: flex; align-items: center; gap: 6px; }
.empty { text-align: center; padding: 24px; opacity: 0.55; font-size: 0.85rem; }
</style>
<ha-card>
  <div class="background no-image off" id="bg">
    <div class="color-block" id="clr-block"></div>
    <div class="no-img" id="no-img"></div>
    <div class="image" id="art-bg"></div>
    <div class="color-gradient" id="clr-grad"></div>
  </div>
  <div style="position:relative;z-index:1">
    <div class="hdr">${icon(MDI.cast,16)}&nbsp;${this._config.title}</div>
    <div id="list"><div class="empty">Loading…</div></div>
  </div>
</ha-card>`;
  }

  _applyColors() {
    const s = this.shadowRoot;
    const bg = this._bgHex, fg = this._fgHex;
    s.getElementById("clr-block")?.style.setProperty("background-color", bg||"");
    s.getElementById("no-img")?.style.setProperty("background-color", bg||"");
    const grad = s.getElementById("clr-grad");
    if (grad) grad.style.backgroundImage = bg ? `linear-gradient(to right, ${bg}, ${bg}00)` : "";
    const inner = s.querySelector("[style*='z-index']");
    if (inner) inner.style.color = fg||"";
  }

  _onHass() {
    const s   = this.shadowRoot;
    const art = this._art;
    if (art !== this._lastArt) {
      this._lastArt = art;
      s.getElementById("bg")?.classList.toggle("no-image", !art);
      s.getElementById("bg")?.classList.remove("off");
      s.getElementById("art-bg").style.backgroundImage = art ? `url(${this._hassUrl(art)})` : "";
      this._syncColors(art);
    }
    const list = s.getElementById("list");
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
  constructor() {
    super(); Object.assign(this, colorMixin); this._initColors();
    this._q=""; this._r=null; this._exp={}; this._focused=false; this._lastArt="";
  }
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
ha-card { height: auto; display: flex; flex-direction: column; max-height: 600px; }
.inner { position: relative; z-index: 1; display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
.results { overflow-y: auto; flex: 1; scrollbar-width: thin; }
</style>
<ha-card>
  <div class="background no-image off" id="bg">
    <div class="color-block" id="clr-block"></div>
    <div class="no-img" id="no-img"></div>
    <div class="image" id="art-bg"></div>
    <div class="color-gradient" id="clr-grad"></div>
  </div>
  <div class="inner">
    <div class="search-bar">
      <input class="search-input" id="si" placeholder="Search Spotify…" autocomplete="off" />
      <button class="search-go" id="sg">${icon(MDI.search,18)}</button>
    </div>
    <div class="results" id="body"></div>
  </div>
</ha-card>`;

    const go = async () => {
      const q = this.shadowRoot.getElementById("si")?.value?.trim();
      if (!q) return;
      if (q!==this._q) { this._q=q; this._r=null; this._exp={}; }
      const body = this.shadowRoot.getElementById("body");
      if (!this._r && body) body.innerHTML = `<div class="loading">Searching…</div>`;
      try {
        const tok = this._hass?.auth?.data?.access_token;
        const r = await fetch(`/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`,
          { headers: { Authorization: `Bearer ${tok}` } });
        if (r.ok) { this._r = await r.json(); this._render(); }
        else body.innerHTML = `<div class="empty">Search failed.</div>`;
      } catch { this.shadowRoot.getElementById("body").innerHTML = `<div class="empty">Search failed.</div>`; }
    };
    this.shadowRoot.getElementById("sg")?.addEventListener("click", go);
    this.shadowRoot.getElementById("si")?.addEventListener("keydown", e => { if(e.key==="Enter") go(); });
    this.shadowRoot.getElementById("si")?.addEventListener("focus", () => { this._focused=true; });
    this.shadowRoot.getElementById("si")?.addEventListener("blur",  () => { this._focused=false; });
  }

  _applyColors() {
    const s = this.shadowRoot;
    const bg=this._bgHex, fg=this._fgHex;
    s.getElementById("clr-block")?.style.setProperty("background-color", bg||"");
    s.getElementById("no-img")?.style.setProperty("background-color", bg||"");
    const grad = s.getElementById("clr-grad");
    if (grad) grad.style.backgroundImage = bg ? `linear-gradient(to right, ${bg}, ${bg}00)` : "";
    s.querySelector(".inner").style.color = fg||"";
  }

  _render() {
    const s=this.shadowRoot, body=s.getElementById("body");
    if (!body||!this._r) return;
    const R=this._r;
    const mk=(t,isTrack,isArtist)=>`
      <div class="list-item" data-play="${t.uri}">
        <div class="item-content">
          <img class="item-thumb${isArtist?" circle":""}" src="${t.album?.images?.[0]?.url||t.images?.[0]?.url||""}" alt="" />
          <div class="item-info">
            <div class="item-title">${t.name}</div>
            <div class="item-sub">${(t.artists||[]).map(a=>a.name).join(", ")||t.owner?.display_name||""}</div>
          </div>
          ${isTrack?`<button class="item-btn" data-add-q="${t.uri}">${icon(MDI.add_q,16)}</button>`:""}
        </div>
      </div>`;
    const sec=(label,key,isTrack,isArtist,n)=>{
      const items=R[key]?.items; if(!items?.length) return "";
      const shown=this._exp[key]?items:items.slice(0,n);
      const total=R[key]?.total||items.length;
      const more=!this._exp[key]&&total>n?`<button class="show-more-btn" data-expand="${key}">Show more ${label.toLowerCase()} (${total})</button>`:"";
      return `<div class="sec-label">${label}</div>${shown.map(t=>mk(t,isTrack,isArtist)).join("")}${more}`;
    };
    const html=sec("Tracks","tracks",true,false,5)+sec("Albums","albums",false,false,4)+sec("Artists","artists",false,true,4)+sec("Playlists","playlists",false,false,4);
    body.innerHTML=html||`<div class="empty">No results.</div>`;
    body.querySelectorAll(".list-item[data-play]").forEach(el=>el.addEventListener("click",e=>{
      if(e.target.closest("[data-add-q]")) return;
      this._mp("play_media",{media_content_id:el.dataset.play,media_content_type:"music"});
    }));
    body.querySelectorAll("[data-add-q]").forEach(btn=>btn.addEventListener("click",e=>{
      e.stopPropagation(); this._spotify("add_to_queue",{track_uri:btn.dataset.addQ});
    }));
    body.querySelectorAll("[data-expand]").forEach(btn=>btn.addEventListener("click",()=>{ this._exp[btn.dataset.expand]=true; this._render(); }));
    if(this._focused) requestAnimationFrame(()=>s.getElementById("si")?.focus());
  }

  _onHass() {
    const art = this._art;
    if (art !== this._lastArt) {
      this._lastArt = art;
      const bg = this.shadowRoot.getElementById("bg");
      if (bg) { bg.classList.toggle("no-image",!art); bg.classList.remove("off"); }
      this.shadowRoot.getElementById("art-bg").style.backgroundImage = art?`url(${this._hassUrl(art)})`:"";
      this._syncColors(art);
    }
  }
}
customElements.define("spotify-search-card", SpotifySearchCard);

// ─── QUEUE CARD ──────────────────────────────────────────────────────────────

class SpotifyQueueCard extends SpotifyBase {
  constructor() {
    super(); Object.assign(this, colorMixin); this._initColors();
    this._data=null; this._loading=false; this._lastTrack=""; this._lastArt="";
  }
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config=c; this._ready=false; this._build(); this._ready=true;
    if(this._hass) this._onHass(null);
  }

  _build() {
    this.shadowRoot.innerHTML=`
<style>
${CARD_CSS}
ha-card { height: auto; display: flex; flex-direction: column; max-height: 600px; }
.inner { position: relative; z-index:1; display: flex; flex-direction: column; flex:1; min-height:0; overflow:hidden; }
.hdr { padding: 14px 14px 8px; font-size:0.82rem; font-weight:700; opacity:0.7; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
.body { overflow-y:auto; flex:1; scrollbar-width:thin; }
.rb { width:30px; height:30px; }
.rb:hover { background: rgba(255,255,255,0.1); }
</style>
<ha-card>
  <div class="background no-image off" id="bg">
    <div class="color-block" id="clr-block"></div>
    <div class="no-img" id="no-img"></div>
    <div class="image" id="art-bg"></div>
    <div class="color-gradient" id="clr-grad"></div>
  </div>
  <div class="inner">
    <div class="hdr">
      <span style="display:flex;align-items:center;gap:6px">${icon(MDI.queue,16)}&nbsp;Queue</span>
      <button class="ctrl-btn rb" id="reload" title="Refresh">${icon(MDI.refresh,18)}</button>
    </div>
    <div class="body" id="body"><div class="loading">Loading…</div></div>
  </div>
</ha-card>`;
    this.shadowRoot.getElementById("reload")?.addEventListener("click", ()=>this._load());
  }

  _applyColors() {
    const s=this.shadowRoot, bg=this._bgHex, fg=this._fgHex;
    s.getElementById("clr-block")?.style.setProperty("background-color",bg||"");
    s.getElementById("no-img")?.style.setProperty("background-color",bg||"");
    const grad=s.getElementById("clr-grad");
    if(grad) grad.style.backgroundImage=bg?`linear-gradient(to right, ${bg}, ${bg}00)`:"";
    s.querySelector(".inner").style.color=fg||"";
  }

  async _load() {
    if(this._loading) return; this._loading=true;
    const body=this.shadowRoot.getElementById("body");
    if(body) body.innerHTML=`<div class="loading">Loading…</div>`;
    try {
      const tok=this._hass?.auth?.data?.access_token;
      const r=await fetch("/api/spotify_enhanced/queue",{headers:{Authorization:`Bearer ${tok}`}});
      if(!r.ok) throw new Error();
      this._data=await r.json(); this._render();
    } catch { if(body) body.innerHTML=`<div class="empty">Queue unavailable. Start playback first.</div>`; }
    finally { this._loading=false; }
  }

  _render() {
    const body=this.shadowRoot.getElementById("body");
    if(!body||!this._data) return;
    const cur=this._data.currently_playing, q=this._data.queue||[];
    const qUris=q.map(t=>t.uri);
    const item=(t,now=false)=>{
      const img=t.album?.images?.[0]?.url||"";
      return `<div class="list-item${now?" now-playing":""}" data-uri="${t.uri}">
        <div class="item-content">
          <img class="item-thumb" src="${img}" alt="" />
          <div class="item-info">
            <div class="item-title">${t.name}</div>
            <div class="item-sub">${(t.artists||[]).map(a=>a.name).join(", ")}</div>
          </div>
          <span style="font-size:0.72rem;opacity:0.6">${fmt(t.duration_ms/1000)}</span>
        </div>
        <div class="swipe-del">${icon(MDI.delete,20)}</div>
      </div>`;
    };
    let html="";
    if(cur) html+=`<div class="queue-now">Now Playing</div>`+item(cur,true);
    if(q.length) html+=`<div class="sec-label">Next Up</div>`+q.slice(0,30).map(t=>item(t)).join("");
    body.innerHTML=html||`<div class="empty">Queue is empty.</div>`;
    body.querySelectorAll(".list-item[data-uri]").forEach(el=>{
      let sx=0,dx=0;
      el.addEventListener("click", async e=>{
        if(el.classList.contains("swiped")){ el.classList.remove("swiped"); return; }
        if(e.target.closest(".swipe-del")) return;
        const uri=el.dataset.uri, pos=qUris.indexOf(uri);
        if(pos>=0){
          const wasMuted=this._muted;
          if(!wasMuted) this._mp("volume_mute",{is_volume_muted:true});
          for(let i=0;i<=pos;i++){ this._mp("media_next_track"); await new Promise(r=>setTimeout(r,350)); }
          if(!wasMuted){ await new Promise(r=>setTimeout(r,400)); this._mp("volume_mute",{is_volume_muted:false}); }
        }
      });
      el.addEventListener("touchstart",e=>{ sx=e.touches[0].clientX; },{passive:true});
      el.addEventListener("touchmove", e=>{ dx=e.touches[0].clientX-sx; },{passive:true});
      el.addEventListener("touchend",  ()=>{ if(dx<-40) el.classList.add("swiped"); else el.classList.remove("swiped"); });
      el.querySelector(".swipe-del")?.addEventListener("click",e=>{
        e.stopPropagation(); el.style.opacity="0"; el.style.transition="opacity 0.2s";
        setTimeout(()=>this._load(),250);
      });
    });
  }

  _onHass() {
    const art=this._art;
    if(art!==this._lastArt){
      this._lastArt=art;
      const bg=this.shadowRoot.getElementById("bg");
      if(bg){ bg.classList.toggle("no-image",!art); bg.classList.remove("off"); }
      this.shadowRoot.getElementById("art-bg").style.backgroundImage=art?`url(${this._hassUrl(art)})`:"";
      this._syncColors(art);
    }
    const tid=this._trackId;
    if(!this._data&&!this._loading){ this._load(); return; }
    if(tid&&tid!==this._lastTrack){ this._lastTrack=tid; this._load(); }
  }
}
customElements.define("spotify-queue-card", SpotifyQueueCard);

// ─── LYRICS CARD ─────────────────────────────────────────────────────────────

class SpotifyLyricsCard extends SpotifyBase {
  constructor() {
    super(); Object.assign(this, colorMixin); this._initColors();
    this._data=null; this._lastTrack=""; this._lastArt="";
    this._prog=new ProgressTracker();
    this._prog.fillEl=null; this._prog.curEl=null; this._prog.durEl=null; this._prog.thumbEl=null;
  }
  static getStubConfig() { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config=c; this._ready=false; this._build(); this._ready=true;
    if(this._hass) this._onHass(null);
  }
  disconnectedCallback() { this._prog?.destroy(); }

  _build() {
    this.shadowRoot.innerHTML=`
<style>
${CARD_CSS}
ha-card { height: auto; display: flex; flex-direction: column; max-height: 500px; }
.inner { position:relative; z-index:1; display:flex; flex-direction:column; flex:1; min-height:0; overflow:hidden; }
.hdr { padding:14px 14px 8px; font-size:0.82rem; font-weight:700; opacity:0.7; display:flex; align-items:center; gap:6px; flex-shrink:0; }
.body { overflow-y:auto; flex:1; padding:6px 0 16px; scrollbar-width:thin; }
</style>
<ha-card>
  <div class="background no-image off" id="bg">
    <div class="color-block" id="clr-block"></div>
    <div class="no-img" id="no-img"></div>
    <div class="image" id="art-bg"></div>
    <div class="color-gradient" id="clr-grad"></div>
  </div>
  <div class="inner">
    <div class="hdr">${icon(MDI.mic_on,16)}&nbsp;Lyrics</div>
    <div class="body" id="body"><div class="loading">Loading…</div></div>
  </div>
</ha-card>`;
  }

  _applyColors() {
    const s=this.shadowRoot, bg=this._bgHex, fg=this._fgHex;
    s.getElementById("clr-block")?.style.setProperty("background-color",bg||"");
    s.getElementById("no-img")?.style.setProperty("background-color",bg||"");
    const grad=s.getElementById("clr-grad");
    if(grad) grad.style.backgroundImage=bg?`linear-gradient(to right, ${bg}, ${bg}00)`:"";
    s.querySelector(".inner").style.color=fg||"";
  }

  async _loadLyrics() {
    const body=this.shadowRoot.getElementById("body");
    if(!body) return;
    body.innerHTML=`<div class="loading">Loading lyrics…</div>`;
    this._data=null;
    const title=this._title, artist=this._artist, album=this._album, dur=this._durSecs;
    if(!title||!artist){ body.innerHTML=`<div class="empty">No track playing.</div>`; return; }
    try {
      const params=new URLSearchParams({ track_name:title, artist_name:artist, album_name:album||"", duration:Math.round(dur) });
      const r=await fetch(`https://lrclib.net/api/get?${params}`);
      if(!r.ok) throw new Error();
      const data=await r.json();
      if(data.syncedLyrics){
        const lines=data.syncedLyrics.split("\n").map(line=>{
          const m=line.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)/);
          if(!m) return null;
          return { startMs:(parseInt(m[1])*60+parseFloat(m[2]))*1000, words:m[3].trim() };
        }).filter(Boolean);
        this._data=lines;
        body.innerHTML=lines.map((l,i)=>
          `<div class="lyric-line${l.words?"":" no-lyrics"}" data-i="${i}" data-t="${l.startMs}">${l.words||"♪"}</div>`
        ).join("");
        body.querySelectorAll(".lyric-line[data-t]").forEach(el=>{
          el.addEventListener("click",()=>this._mp("media_seek",{seek_position:round2(parseInt(el.dataset.t)/1000)}));
        });
        this._highlight();
      } else if(data.plainLyrics){
        this._data=null;
        body.innerHTML=data.plainLyrics.split("\n").map(l=>
          l?`<div class="lyric-line no-lyrics">${l}</div>`:`<div style="height:8px"></div>`
        ).join("");
      } else throw new Error();
    } catch {
      body.innerHTML=`<div class="empty">${icon(MDI.mic_off,28)}<br><br>Lyrics not available.</div>`;
    }
  }

  _highlight() {
    const body=this.shadowRoot.getElementById("body");
    if(!body||!this._data||!this._prog) return;
    const nowMs=this._prog.current*1000;
    const lines=body.querySelectorAll(".lyric-line[data-t]");
    let active=null;
    lines.forEach(el=>{ el.classList.remove("active"); if(parseInt(el.dataset.t)<=nowMs) active=el; });
    if(active){ active.classList.add("active"); active.scrollIntoView({behavior:"smooth",block:"center"}); }
  }

  _onHass() {
    const so=this._so, art=this._art, tid=this._trackId;
    if(so) this._prog.sync(so);
    if(art!==this._lastArt){
      this._lastArt=art;
      const bg=this.shadowRoot.getElementById("bg");
      if(bg){ bg.classList.toggle("no-image",!art); bg.classList.remove("off"); }
      this.shadowRoot.getElementById("art-bg").style.backgroundImage=art?`url(${this._hassUrl(art)})`:"";
      this._syncColors(art);
    }
    if(tid&&tid!==this._lastTrack){ this._lastTrack=tid; this._loadLyrics(); }
    else if(this._data) this._highlight();
  }
}
customElements.define("spotify-lyrics-card", SpotifyLyricsCard);

// ─── VISUAL EDITOR ───────────────────────────────────────────────────────────

class SpotifyEnhancedCardEditor extends HTMLElement {
  set hass(h) { this._hass=h; const p=this.querySelector("ha-entity-picker"); if(p) p.hass=h; }
  setConfig(c) { this._config=c; this._render(); }
  _render() {
    const c=this._config||{};
    const tog=(key,label,def=true)=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--divider-color,#eee)">
        <span style="font-size:0.9rem">${label}</span>
        <ha-switch data-key="${key}" ${c[key]!==false&&(c[key]!==undefined?c[key]:def)?"checked":""}></ha-switch>
      </div>`;
    this.innerHTML=`
      <style>:host{display:block;padding:4px 0} ha-entity-picker{display:block;margin-bottom:14px} .sh{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--secondary-text-color);margin:12px 0 4px}</style>
      <ha-entity-picker .hass="${this._hass||null}" .value="${c.entity||""}" .includeDomains="${["media_player"]}" label="Spotify Media Player Entity"></ha-entity-picker>
      <div class="sh">Controls</div>
      ${tog("show_seek","Show seek bar")}
      ${tog("show_volume","Show volume")}
      ${tog("show_shuffle","Show shuffle")}
      ${tog("show_repeat","Show repeat")}
    `;
    const p=this.querySelector("ha-entity-picker");
    if(p){ p.hass=this._hass; p.addEventListener("value-changed",e=>this._set("entity",e.detail.value)); }
    this.querySelectorAll("ha-switch[data-key]").forEach(sw=>sw.addEventListener("change",e=>this._set(sw.dataset.key,e.target.checked)));
  }
  _set(k,v) { this._config={...this._config,[k]:v}; this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config}})); }
}
customElements.define("spotify-enhanced-card-editor", SpotifyEnhancedCardEditor);

// ─── Registration ─────────────────────────────────────────────────────────────

window.customCards=window.customCards||[];
window.customCards.push(
  {type:"spotify-enhanced-card", name:"Spotify Enhanced — Media Deck",    description:"Full player with art, controls, library, search, queue, devices and lyrics.", preview:true},
  {type:"spotify-mini-card",     name:"Spotify Enhanced — Mini Player",   description:"Compact single-row playback control.",                                         preview:true},
  {type:"spotify-device-card",   name:"Spotify Enhanced — Device Picker", description:"Browse and switch Spotify Connect devices.",                                    preview:true},
  {type:"spotify-search-card",   name:"Spotify Enhanced — Search",        description:"Standalone Spotify search card.",                                               preview:true},
  {type:"spotify-queue-card",    name:"Spotify Enhanced — Queue",         description:"View and manage the playback queue.",                                           preview:true},
  {type:"spotify-lyrics-card",   name:"Spotify Enhanced — Lyrics",        description:"Time-synced lyrics display.",                                                   preview:true},
);

console.info(
  `%c SPOTIFY ENHANCED %c v${VERSION} `,
  "color:#fff;background:#1DB954;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px",
  "color:#1DB954;background:#111;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0"
);
