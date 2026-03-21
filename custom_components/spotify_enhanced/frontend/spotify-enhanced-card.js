/**
 * Spotify Enhanced Card  v1.1.3
 *
 * Design: ports hui-media-control-card CSS verbatim.
 * Colours: read from sensor.spotify_enhanced_background_color
 *          and sensor.spotify_enhanced_foreground_color (set by Node.js
 *          colour service using exact node-vibrant algorithm as HA).
 * No client-side image processing.
 */

const VERSION = "1.1.3";

// ─── Utilities ───────────────────────────────────────────────────────────────

const fmt = (secs) => {
  if (secs == null || isNaN(secs)) return "0:00";
  const t = Math.max(0, Math.floor(secs));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = v => String(v).padStart(2, "0");
  return h ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

const clamp  = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = n => Math.round(n * 100) / 100;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// MDI paths — exact variant names as specified
const P = {
  play:         "M8 5.14v14l11-7z",
  pause:        "M14 19h4V5h-4M6 19h4V5H6v14z",
  next:         "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
  prev:         "M6 6h2v12H6zm3.5 6 8.5 6V6z",
  shuffle:      "M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  shuffle_off:  "M10.72 11.06 8.43 8.77C7.91 9.4 7.47 10.1 7.17 10.86L4.93 8.62C5.5 7.59 6.27 6.67 7.22 5.92L5.03 3.73l1.41-1.41 15.56 15.56-1.41 1.41-2.19-2.19c-.92.68-2.03 1.09-3.4 1.38V20.5h-2v-2.07c-1.33-.2-2.54-.73-3.56-1.52L3 14.5l1-1.73 3.44 1.99c-.04-.25-.07-.5-.07-.76 0-.71.17-1.38.44-1.98l2.91 2.91zM21 5.5l-1 1.73-4.35-2.52-.07.04V7h-2V4.93c-1.4.26-2.54.82-3.45 1.62l1.44 1.44C12.2 7.36 13.05 7 14 7c2.76 0 5 2.24 5 5 0 .28-.03.54-.07.8l1.63.94C20.82 12.62 21 11.83 21 11c0-1.7-.63-3.22-1.64-4.37L21 5.5z",
  repeat:       "M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  repeat_one:   "M13 15V9h-1l-2 1v1h1.5v4M17 17H7v-3l-4 4 4 4v-3h12v-6h-2M7 7h10v3l4-4-4-4v3H5v6h2z",
  repeat_off:   "M6 6h12v3l4-4-4-4v3H4v6h2V6zm14 12H8v-3l-4 4 4 4v-3h14v-6h-2v5z",
  mic_on:       "M12 2C10.31 2 9 3.31 9 5v6c0 1.69 1.31 3 3 3s3-1.31 3-3V5c0-1.69-1.31-3-3-3m5.3 9c-.41 2.3-2.43 4-4.8 4s-4.39-1.7-4.8-4H6c.46 2.86 2.85 5.06 5.75 5.44V20H10v2h4v-2h-1.75v-3.56C15.15 16.06 17.54 13.86 18 11h-1.7M12 4c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5c0-.55.45-1 1-1z",
  mic_off:      "M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28m-4 .17c0-.06.01-.11.01-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18L15 11.17M4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z",
  heart:        "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  heart_out:    "M12.1 18.55l-.1.1-.11-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04 1 3.57 2.36h1.87C13.46 6 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z",
  vol_off:      "M16.5 12c0-1.77-1-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z",
  vol_lo:       "M18.5 12c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03zM5 9v6h4l5 5V4L9 9H5z",
  vol_hi:       "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
  cast:         "M1 18v3h3a3 3 0 0 0-3-3zm0-4v2a7 7 0 0 1 7 7h2c0-5-4-9-9-9zm0-4v2c6.07 0 11 4.93 11 11h2C14 15.93 8.07 10 1 10zm20-7H3C1.9 3 1 3.9 1 5v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
  search:       "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  queue:        "M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z",
  library:      "M14 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 12.5c0 .83-.67 1.5-1.5 1.5S8 15.33 8 14.5V9h3v5.5zM20 6v14H6v2h14c1.1 0 2-.9 2-2V6h-2z",
  close:        "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  dots:         "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  add_q:        "M13 8H3V6h10v2zm0 4H3v-2h10v2zm4 4H3v-2h14v2zm-1 6v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3z",
  delete:       "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  chev_r:       "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  home:         "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  refresh:      "M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  play_box:     "M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 12.5v-7l6 3.5-6 3.5z",
};

const svg = (path, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" style="flex-shrink:0;display:block;pointer-events:none"><path d="${path}"/></svg>`;

// ─── Device stabiliser ────────────────────────────────────────────────────────
const _devOrder = [];
function stabilise(devices) {
  if (!devices?.length) { _devOrder.length = 0; return []; }
  const ids = new Set(devices.map(d => d.id));
  for (let i = _devOrder.length - 1; i >= 0; i--)
    if (!ids.has(_devOrder[i])) _devOrder.splice(i, 1);
  for (const d of devices) if (!_devOrder.includes(d.id)) _devOrder.push(d.id);
  const map = Object.fromEntries(devices.map(d => [d.id, d]));
  return _devOrder.map(id => map[id]).filter(Boolean);
}

// ─── Liked tracker ────────────────────────────────────────────────────────────
const _liked = new Set(), _likedPending = new Set();
async function checkLiked(id, hass) {
  if (!id || _likedPending.has(id)) return;
  _likedPending.add(id);
  try {
    const r = await fetch(`/api/spotify_enhanced/liked?ids=${id}`,
      { headers: { Authorization: `Bearer ${hass?.auth?.data?.access_token}` } });
    if (r.ok) { const d = await r.json(); if (d?.[0]) _liked.add(id); else _liked.delete(id); }
  } catch {} finally { _likedPending.delete(id); }
}
function toggleLiked(id, hass) {
  if (!id) return false;
  if (_liked.has(id)) { _liked.delete(id); hass?.callService("spotify_enhanced","remove_track",{track_id:[id]}); }
  else { _liked.add(id); hass?.callService("spotify_enhanced","save_track",{track_id:[id]}); }
  return _liked.has(id);
}

// ─── Progress tracker (mirrors HA getCurrentProgress exactly) ─────────────────
class ProgressTracker {
  constructor() {
    this._pos=0; this._dur=0; this._updatedAt=0; this._playing=false;
    this._raf=null; this._drag=false; this._dragPct=0;
    this.fillEl=null; this.thumbEl=null; this.curEl=null; this.durEl=null;
  }
  sync(so) {
    if (this._drag) return;
    const a = so?.attributes ?? {};
    this._pos = a.media_position ?? 0;
    this._dur = a.media_duration ?? 0;
    this._playing = so?.state === "playing";
    this._updatedAt = a.media_position_updated_at
      ? new Date(a.media_position_updated_at).getTime() : Date.now();
    if (this._playing) { if (!this._raf) this._raf = requestAnimationFrame(() => this._tick()); }
    else { cancelAnimationFrame(this._raf); this._raf=null; this._paint(this._pos); }
  }
  get current() {
    if (!this._playing) return this._pos;
    return clamp(this._pos + (Date.now()-this._updatedAt)/1000, 0, this._dur||Infinity);
  }
  _tick() {
    this._raf=null; if (!this._playing||this._drag) return;
    this._paint(this.current);
    this._raf=requestAnimationFrame(()=>this._tick());
  }
  _paint(s) {
    const p = this._dur ? clamp((s/this._dur)*100,0,100) : 0;
    if (this.fillEl)  this.fillEl.style.width = `${p}%`;
    if (this.thumbEl) this.thumbEl.style.left = `${p}%`;
    if (this.curEl)   this.curEl.textContent  = fmt(s);
    if (this.durEl)   this.durEl.textContent  = fmt(this._dur);
  }
  startDrag(p) { this._drag=true; this._dragPct=clamp(p,0,1); this._paint(this._dragPct*this._dur); }
  moveDrag(p)  { if(!this._drag) return; this._dragPct=clamp(p,0,1); this._paint(this._dragPct*this._dur); }
  endDrag()    { this._drag=false; this._pos=this._dragPct*this._dur; this._updatedAt=Date.now(); if(this._playing) this._raf=requestAnimationFrame(()=>this._tick()); return this._pos; }
  destroy()    { cancelAnimationFrame(this._raf); this._raf=null; }
}

// ─── Volume drag ──────────────────────────────────────────────────────────────
class VolDrag {
  constructor(track, fill, thumb, onChange) {
    this._t=track; this._f=fill; this._th=thumb; this._cb=onChange; this._p=0; this._drag=false;
    if (!track) return;
    track.addEventListener("pointerdown", e => {
      this._drag=true; track.setPointerCapture(e.pointerId); this._update(e);
      const mv = e=>this._update(e);
      const up = e=>{ this._update(e); this._drag=false; this._cb(this._p); track.removeEventListener("pointermove",mv); track.removeEventListener("pointerup",up); };
      track.addEventListener("pointermove",mv,{passive:true});
      track.addEventListener("pointerup",up,{once:true});
    });
  }
  _update(e) {
    const r=this._t.getBoundingClientRect();
    this._p=clamp((e.clientX-r.left)/r.width,0,1);
    this._r();
  }
  _r() {
    const w=`${this._p*100}%`;
    if(this._f)  this._f.style.width=w;
    if(this._th) this._th.style.left=w;
  }
  sync(p01) { if(this._drag) return; this._p=clamp(p01,0,1); this._r(); }
}

// ─── Marquee ─────────────────────────────────────────────────────────────────
function marqStart(wrap) {
  const inner=wrap?.querySelector(".mq");
  if (!inner) return;
  const ov=inner.scrollWidth-wrap.offsetWidth;
  if (ov<=0) { inner.style.animation="none"; return; }
  const dur=Math.max(4,ov/40);
  inner.style.setProperty("--d",`-${ov}px`);
  inner.style.setProperty("--t",`${dur}s`);
  inner.style.animation="mq var(--t) linear infinite";
}
function marqStop(wrap) { wrap?.querySelector(".mq")?.style.setProperty("animation","none"); }

// ─── Base ────────────────────────────────────────────────────────────────────
class Base extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:"open"});
    this._hass=null; this._config={}; this._ready=false;
  }
  set hass(h) { const p=this._hass; this._hass=h; if(this._ready) this._update(p); }
  setConfig(c) { this._config=c; this._ready=false; this._build(); this._ready=true; if(this._hass) this._update(null); }

  // Entity accessors
  get _so()     { return this._hass?.states?.[this._config?.entity]; }
  get _a()      { return this._so?.attributes??{}; }
  get _state()  { return this._so?.state??"idle"; }
  get _playing(){ return this._state==="playing"; }
  get _title()  { return this._a.media_title??""; }
  get _artist() { return this._a.media_artist??""; }
  get _album()  { return this._a.media_album_name??""; }
  get _art()    { return this._a.entity_picture_local||this._a.entity_picture||""; }
  get _vol()    { return clamp((this._a.volume_level??0)*100,0,100); }
  get _muted()  { return this._a.is_volume_muted??false; }
  get _shuffle(){ return this._a.shuffle??false; }
  get _repeat() { return this._a.repeat??"off"; }
  get _durSecs(){ return this._a.media_duration??0; }
  get _devices(){ return this._a.spotify_devices??[]; }
  get _devId()  { return this._a.device_id??null; }
  get _trackId(){ return this._a.track_id??null; }

  // Read colours from sensors — server-side extracted via node-vibrant
  get _bgColor() {
    // Try the dedicated bg sensor first
    const sensorId = this._config?.entity?.replace("media_player.","sensor.")?.replace(/_player$/,"") + "_background_color";
    // Find the bg sensor by searching common names
    const bgSensor = this._hass?.states?.["sensor.spotify_enhanced_background_color"]
      || this._hass?.states?.["sensor.spotify_enhanced_bg_color"];
    return bgSensor?.state || "";
  }
  get _fgColor() {
    const fgSensor = this._hass?.states?.["sensor.spotify_enhanced_foreground_color"]
      || this._hass?.states?.["sensor.spotify_enhanced_fg_color"];
    return fgSensor?.state || "";
  }

  _call(d,s,data={}) { this._hass?.callService(d,s,data); }
  _spotify(s,d={})   { this._call("spotify_enhanced",s,d); }
  _mp(s,d={})        { this._call("media_player",s,{entity_id:this._config.entity,...d}); }
  _hassUrl(url)      { if(!url) return ""; if(url.startsWith("http")) return url; return this._hass?.hassUrl(url)??url; }

  _build()      {}
  _update(prev) {}
}

// ─── CSS — verbatim from hui-media-control-card.styles ──────────────────────
// We copy HA's exact selectors and values, then add our extensions below.

const HA_CSS = `
  @keyframes mq { 0%{transform:translateX(0)} 100%{transform:translateX(var(--d,-50%))} }

  ha-card { overflow: hidden; height: 100%; }

  .background {
    display: flex; position: absolute;
    top: 0; left: 0; height: 100%; width: 100%;
    transition: filter 0.8s;
  }
  .color-block {
    background-color: var(--primary-color);
    transition: background-color 0.8s; width: 100%;
  }
  .color-gradient {
    position: absolute;
    background-image: linear-gradient(to right, var(--primary-color), transparent);
    height: 100%; right: 0; opacity: 1;
    transition: width 0.8s, opacity 0.8s linear 0.8s;
  }
  .image {
    background-color: var(--primary-color);
    background-position: center; background-size: cover; background-repeat: no-repeat;
    position: absolute; right: 0; height: 100%; opacity: 1;
    transition: width 0.8s, background-image 0.8s, background-color 0.8s,
                background-size 0.8s, opacity 0.8s linear 0.8s;
  }
  .no-image .image { opacity: 0; }
  .no-img {
    background-color: var(--primary-color);
    background-size: initial; background-repeat: no-repeat;
    background-position: center center; padding-bottom: 0;
    position: absolute; right: 0; height: 100%;
    background-image: url("/static/images/card_media_player_bg.png");
    width: 50%; transition: opacity 0.8s, background-color 0.8s;
  }
  .off .image, .off .color-gradient {
    opacity: 0; transition: opacity 0s, width 0.8s; width: 0;
  }
  .unavailable .no-img,
  .background:not(.off):not(.no-image) .no-img { opacity: 0; }
  .player {
    position: relative; padding: 16px; height: 100%; box-sizing: border-box;
    display: flex; flex-direction: column; justify-content: space-between;
    color: var(--text-primary-color);
    transition-property: color, padding; transition-duration: 0.4s;
  }
  .controls {
    padding: 8px 8px 8px 0; display: flex; justify-content: flex-start;
    align-items: center; transition: padding, color; transition-duration: 0.4s;
    margin-left: -12px; margin-inline-start: -12px; margin-inline-end: initial;
    padding-inline-start: 0; padding-inline-end: 8px; direction: ltr;
  }
  .controls > div { display: flex; align-items: center; }
  .controls > .start { flex-grow: 1; }
  .top-info { display: flex; justify-content: space-between; }
  .media-info { text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
  .media-title-text { font-size: 1.2em; margin: 0 0 4px; }
  .title-controls { padding-top: 16px; }
  .no-image .controls { padding: 0; }
  .off.background { filter: grayscale(1); }
  .narrow .controls, .no-progress .controls { padding-bottom: 0; }
  .no-progress.player:not(.no-controls) { padding-bottom: 0px; }

  /* ── Icon buttons — matching HA's ha-icon-button sizing exactly ── */
  .ctrl {
    --size: 44px; --icon: 30px;
    width: var(--size); height: var(--size); border-radius: 50%;
    appearance: none; background: none; border: none;
    cursor: pointer; color: inherit; padding: 0; margin: 0;
    display: inline-flex; align-items: center; justify-content: center;
    transition: opacity 0.15s, background 0.18s, transform 0.1s;
    -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  }
  .ctrl svg { width: var(--icon); height: var(--icon); }
  .ctrl:hover  { background: rgba(255,255,255,0.12); opacity: 1; }
  .ctrl:active { transform: scale(0.88); }

  /* Play/pause — matches HA's 56px / 40px */
  .ctrl.pp { --size: 56px; --icon: 40px; }
  .narrow .ctrl    { --size: 40px; --icon: 28px; }
  .narrow .ctrl.pp { --size: 50px; --icon: 36px; }

  /* Secondary (sm) — browse, queue, etc */
  .ctrl.sm { --size: 36px; --icon: 22px; }

  /* Progress bar — replaces mwc-linear-progress */
  .prog-wrap { width: 100%; margin-top: 4px; }
  .prog-bar {
    position: relative; width: 100%; height: 4px;
    background: rgba(200,200,200,0.5); border-radius: 2px;
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
    background: currentColor; transform: translate(-50%,-50%);
    opacity: 0; transition: opacity 0.15s; pointer-events: none;
  }
  .prog-bar:hover .prog-thumb, .prog-bar.drag .prog-thumb { opacity: 1; }
  .prog-times {
    display: flex; justify-content: space-between;
    font-size: 0.7em; opacity: 0.7; margin-top: 2px;
  }

  /* Volume */
  .vol-row { display: flex; align-items: center; gap: 6px; padding: 2px 0 0; }
  .vol-icon { --size: 28px; --icon: 20px; }
  .vol-track {
    flex: 1; height: 4px; background: rgba(200,200,200,0.5);
    border-radius: 2px; cursor: pointer; position: relative;
    touch-action: none; transition: height 0.1s;
  }
  .vol-track:hover { height: 6px; }
  .vol-fill  { position: absolute; left: 0; top: 0; height: 100%; background: currentColor; border-radius: 2px; pointer-events: none; }
  .vol-thumb { position: absolute; top: 50%; left: 0; width: 12px; height: 12px; border-radius: 50%; background: currentColor; transform: translate(-50%,-50%); opacity: 0; transition: opacity 0.15s; pointer-events: none; }
  .vol-track:hover .vol-thumb { opacity: 1; }

  /* Marquee */
  .mq-wrap { overflow: hidden; white-space: nowrap; }
  .mq { display: inline-block; padding-right: 32px; }

  /* Panels */
  .backdrop {
    position: absolute; inset: 0; background: rgba(0,0,0,0.52);
    z-index: 10; opacity: 0; pointer-events: none; transition: opacity 0.25s;
    backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  }
  .backdrop.open { opacity: 1; pointer-events: auto; }
  .panel {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: var(--card-background-color, #1c1c1e);
    border-radius: 14px 14px 0 0; z-index: 11;
    display: flex; flex-direction: column; overflow: hidden;
    transform: translateY(100%);
    transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
    will-change: transform;
  }
  .panel.open { transform: translateY(0); }
  #panel-search, #panel-queue  { max-height: 70%; }
  #panel-lib, #panel-lyrics    { max-height: 80%; }
  #panel-devices               { max-height: 60%; }

  .ph {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px 8px; flex-shrink: 0;
    border-bottom: 1px solid rgba(255,255,255,0.1); min-height: 48px;
  }
  .pt {
    font-size: 0.76rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.7px; opacity: 0.6;
    display: flex; align-items: center; gap: 6px; flex: 1; overflow: hidden;
  }
  .pc { width: 30px; height: 30px; opacity: 0.6; }
  .pc:hover { background: rgba(255,255,255,0.1); opacity: 1; }
  .pb-body {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent;
  }
  .pb-body::-webkit-scrollbar { width: 3px; }
  .pb-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }

  /* Search bar */
  .sbar { display: flex; gap: 6px; padding: 10px 14px 6px; flex-shrink: 0; }
  .sinput {
    flex: 1; background: rgba(255,255,255,0.1);
    border: 1.5px solid rgba(255,255,255,0.2); border-radius: 8px;
    color: currentColor; padding: 8px 10px; font-size: 0.88rem; outline: none;
    transition: border-color 0.15s;
  }
  .sinput::placeholder { color: rgba(255,255,255,0.4); }
  .sinput:focus { border-color: currentColor; }
  .sgo {
    background: currentColor !important;
    border: none; border-radius: 8px; width: 38px; height: 38px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: opacity 0.15s;
  }
  .sgo:active { opacity: 0.7; }
  .sgo svg { filter: invert(1) brightness(0); }

  /* List items */
  .item {
    display: flex; align-items: center; gap: 10px; padding: 7px 14px;
    cursor: pointer; transition: background 0.1s; position: relative; overflow: hidden;
  }
  .item:hover { background: rgba(255,255,255,0.08); }
  .item.now   { background: rgba(255,255,255,0.12); }
  .ithumb {
    width: 42px; height: 42px; object-fit: cover; flex-shrink: 0;
    background: rgba(255,255,255,0.1); border-radius: 4px;
  }
  .ithumb.circle { border-radius: 50%; }
  .iph {
    width: 42px; height: 42px; border-radius: 4px; flex-shrink: 0;
    background: rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center; opacity: 0.6;
  }
  .iinfo { flex: 1; min-width: 0; }
  .ititle { font-size: 0.87rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .isub   { font-size: 0.73rem; opacity: 0.65; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ibtn   { width: 30px; height: 30px; opacity: 0.6; flex-shrink: 0; border-radius: 50%; }
  .ibtn:hover { background: rgba(255,255,255,0.1); opacity: 1; }

  /* Breadcrumb */
  .bc { display: flex; align-items: center; gap: 2px; padding: 6px 14px 3px; overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap; }
  .bc::-webkit-scrollbar { display: none; }
  .bcc { font-size: 0.75rem; padding: 3px 6px; border-radius: 6px; opacity: 0.6; white-space: nowrap; }
  .bcc:hover { background: rgba(255,255,255,0.08); opacity: 1; }
  .bcc.last { opacity: 1; font-weight: 600; }
  .bcs { opacity: 0.3; font-size: 0.75rem; }

  /* Section label */
  .slabel { padding: 10px 14px 3px; font-size: 0.63rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.55; }

  /* Show more */
  .smore { display: block; width: 100%; padding: 8px; text-align: center; font-size: 0.78rem; opacity: 0.7; background: transparent; border: none; cursor: pointer; border-top: 1px solid rgba(255,255,255,0.08); }
  .smore:hover { background: rgba(255,255,255,0.07); opacity: 1; }

  /* Devices */
  .devitem { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; transition: background 0.12s; }
  .devitem:hover  { background: rgba(255,255,255,0.08); }
  .devitem.active { background: rgba(255,255,255,0.14); }
  .devicon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; opacity: 0.7; flex-shrink: 0; }
  .devname { flex: 1; font-size: 0.9rem; font-weight: 500; }
  .devvol  { font-size: 0.74rem; opacity: 0.65; }
  .devdot  { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

  /* Swipe-to-delete */
  .sdel { position: absolute; right: 0; top: 0; bottom: 0; background: #c62828; color: #fff; width: 64px; display: flex; align-items: center; justify-content: center; transform: translateX(100%); transition: transform 0.2s; pointer-events: none; }
  .ic   { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; transition: transform 0.2s; }
  .item.swiped .sdel { transform: translateX(0); pointer-events: auto; }
  .item.swiped .ic   { transform: translateX(-64px); }

  /* Queue now label */
  .qnow { padding: 8px 14px 3px; font-size: 0.63rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.55; }

  /* Lyrics */
  .lline { padding: 8px 20px; font-size: 1rem; line-height: 1.5; opacity: 0.35; cursor: pointer; transition: opacity 0.3s, font-size 0.25s, font-weight 0.25s; border-radius: 6px; }
  .lline.on { opacity: 1; font-size: 1.1rem; font-weight: 700; }
  .lline.plain { opacity: 0.45; cursor: default; }
  .lline:hover:not(.plain) { background: rgba(255,255,255,0.07); }

  .empty   { text-align: center; padding: 28px 16px; opacity: 0.5; font-size: 0.85rem; line-height: 1.6; }
  .loading { text-align: center; padding: 22px; opacity: 0.5; font-size: 0.82rem; }

  *, *::before, *::after { box-sizing: border-box; }
  button { -webkit-tap-highlight-color: transparent; }
`;

// ─── Helpers to apply colours (server-side extracted) ───────────────────────

function applyColours(s, bg, fg, cardHeight) {
  // Mirrors HA source: color-block bg, no-img bg, gradient, image width, player colour
  const block = s.getElementById("color-block");
  const noimg = s.getElementById("no-img");
  const grad  = s.getElementById("color-gradient");
  const image = s.getElementById("image");
  const player= s.getElementById("player");

  if (block) block.style.backgroundColor = bg || "";
  if (noimg) noimg.style.backgroundColor = bg || "";
  if (grad && bg) {
    grad.style.backgroundImage = `linear-gradient(to right, ${bg}, ${bg}00)`;
    grad.style.width = `${cardHeight}px`;
  }
  if (image) {
    image.style.width = `${cardHeight}px`;
    if (bg) image.style.backgroundColor = bg;
  }
  if (player) player.style.color = fg || "";
}

// ─── MAIN CARD ────────────────────────────────────────────────────────────────

class SpotifyEnhancedCard extends Base {
  constructor() {
    super();
    this._prog=null; this._vd=null; this._ro=null;
    this._narrow=false; this._cardH=0;
    this._openId=null;
    this._libStack=[]; this._srQ=""; this._srR=null; this._srX={};
    this._searchFocused=false;
    this._lyricsData=null; this._lastTrack=""; this._lastArt="";
  }

  static getConfigElement() { return document.createElement("spotify-enhanced-card-editor"); }
  static getStubConfig()    { return { entity: "media_player.spotify_enhanced" }; }

  setConfig(c) {
    this._config = { show_seek:true, show_volume:true, show_shuffle:true, show_repeat:true, ...c };
    this._ready=false; this._build(); this._ready=true;
    if (this._hass) this._update(null);
  }

  connectedCallback() { this._attachRO(); if(this._prog&&this._so) this._prog.sync(this._so); }
  disconnectedCallback() { this._prog?.destroy(); this._ro?.disconnect(); }

  _build() {
    const s=this.shadowRoot;
    s.innerHTML=`<style>${HA_CSS}</style><ha-card>

<!-- HA-identical background layer -->
<div class="background no-image off" id="bg">
  <div class="color-block" id="color-block"></div>
  <div class="no-img"      id="no-img"></div>
  <div class="image"       id="image"></div>
  <div class="color-gradient" id="color-gradient"></div>
</div>

<!-- Player layer — same structure as HA card -->
<div class="player no-progress" id="player">

  <!-- Top row: left=Search,Library,Devices | right=Like,Lyrics,Queue,⋮ -->
  <div class="top-info">
    <div style="display:flex;align-items:center;gap:2px">
      <button class="ctrl sm" id="btn-search"  title="Search">${svg(P.search)}</button>
      <button class="ctrl sm" id="btn-lib"     title="Library">${svg(P.library)}</button>
      <button class="ctrl sm" id="btn-devices" title="Devices">${svg(P.cast)}</button>
    </div>
    <div style="display:flex;align-items:center;gap:2px">
      <button class="ctrl sm" id="like-btn"   title="Like"></button>
      <button class="ctrl sm" id="btn-lyrics" title="Lyrics">${svg(P.mic_on)}</button>
      <button class="ctrl sm" id="btn-queue"  title="Queue">${svg(P.queue)}</button>
      <button class="ctrl sm" id="btn-more"   title="More info">${svg(P.dots)}</button>
    </div>
  </div>

  <!-- Media info + controls — matches HA layout exactly -->
  <div>
    <div class="title-controls">
      <div class="media-info">
        <div class="media-title-text">
          <div class="mq-wrap" id="mq-wrap"><div class="mq" id="mq-inner">Nothing playing</div></div>
        </div>
        <div id="sub" style="font-size:0.85em;opacity:0.8"></div>
      </div>

      <div class="controls">
        <div class="start">
          <button class="ctrl" id="shuf-btn" title="Shuffle"></button>
          <button class="ctrl" id="prev-btn" title="Previous">${svg(P.prev,30)}</button>
          <button class="ctrl pp" id="play-btn" title="Play/Pause"></button>
          <button class="ctrl" id="next-btn" title="Next">${svg(P.next,30)}</button>
          <button class="ctrl" id="rep-btn"  title="Repeat"></button>
        </div>
        <div class="end">
          <!-- end is intentionally empty; secondary actions are in top-info -->
        </div>
      </div>
    </div>

    <!-- Progress — matches HA's mwc-linear-progress position -->
    <div class="prog-wrap" id="prog-wrap">
      <div class="prog-bar" id="prog-bar">
        <div class="prog-fill"  id="prog-fill"></div>
        <div class="prog-thumb" id="prog-thumb"></div>
      </div>
      <div class="prog-times"><span id="pcur">0:00</span><span id="pdur">0:00</span></div>
    </div>

    <!-- Volume -->
    <div class="vol-row" id="vol-row">
      <button class="ctrl vol-icon" id="mute-btn"></button>
      <div class="vol-track" id="vol-track">
        <div class="vol-fill"  id="vol-fill"></div>
        <div class="vol-thumb" id="vol-thumb"></div>
      </div>
    </div>
  </div>
</div>

<div class="backdrop" id="bd"></div>

<!-- Search panel -->
<div class="panel" id="panel-search">
  <div class="ph"><div class="pt">${svg(P.search,15)}&nbsp;Search</div><button class="ctrl sm pc" id="cls-search">${svg(P.close,18)}</button></div>
  <div class="sbar"><input class="sinput" id="si" placeholder="Search Spotify…" autocomplete="off"/><button class="sgo" id="sg">${svg(P.search,18)}</button></div>
  <div class="pb-body" id="sb"></div>
</div>

<!-- Library panel -->
<div class="panel" id="panel-lib">
  <div class="ph"><div class="pt" id="lib-title">${svg(P.library,15)}&nbsp;Library</div><button class="ctrl sm pc" id="cls-lib">${svg(P.close,18)}</button></div>
  <div class="pb-body" id="lb"></div>
</div>

<!-- Devices panel -->
<div class="panel" id="panel-devices">
  <div class="ph"><div class="pt">${svg(P.cast,15)}&nbsp;Devices</div><button class="ctrl sm pc" id="cls-devices">${svg(P.close,18)}</button></div>
  <div class="pb-body" id="db"></div>
</div>

<!-- Queue panel -->
<div class="panel" id="panel-queue">
  <div class="ph"><div class="pt">${svg(P.queue,15)}&nbsp;Queue</div><button class="ctrl sm pc" id="cls-queue">${svg(P.close,18)}</button></div>
  <div class="pb-body" id="qb"><div class="loading">Loading…</div></div>
</div>

<!-- Lyrics panel -->
<div class="panel" id="panel-lyrics">
  <div class="ph"><div class="pt">${svg(P.mic_on,15)}&nbsp;Lyrics</div><button class="ctrl sm pc" id="cls-lyrics">${svg(P.close,18)}</button></div>
  <div class="pb-body" id="lyb"><div class="loading">Loading…</div></div>
</div>

</ha-card>`;

    // Progress tracker
    this._prog=new ProgressTracker();
    this._prog.fillEl =s.getElementById("prog-fill");
    this._prog.thumbEl=s.getElementById("prog-thumb");
    this._prog.curEl  =s.getElementById("pcur");
    this._prog.durEl  =s.getElementById("pdur");

    // Volume drag
    this._vd=new VolDrag(
      s.getElementById("vol-track"),
      s.getElementById("vol-fill"),
      s.getElementById("vol-thumb"),
      p=>this._mp("volume_set",{volume_level:round2(p)})
    );

    this._bindSeek();
    this._bindButtons();
    this._attachRO();
  }

  _attachRO() {
    const card=this.shadowRoot?.querySelector("ha-card");
    if(!card) return;
    if(!this._ro) this._ro=new ResizeObserver(debounce(()=>this._measure(),250));
    this._ro.observe(card);
  }

  _measure() {
    const card=this.shadowRoot?.querySelector("ha-card");
    if(!card) return;
    this._narrow = card.offsetWidth < 350;
    this._cardH  = card.offsetHeight;
    const p=this.shadowRoot.getElementById("player");
    if(p) p.classList.toggle("narrow",this._narrow);
    applyColours(this.shadowRoot, this._bgColor, this._fgColor, this._cardH);
  }

  _bindSeek() {
    const bar=this.shadowRoot.getElementById("prog-bar");
    if(!bar) return;
    const pct=e=>{ const r=bar.getBoundingClientRect(); return clamp((e.clientX-r.left)/r.width,0,1); };
    bar.addEventListener("pointerdown",e=>{
      bar.classList.add("drag"); bar.setPointerCapture(e.pointerId);
      this._prog.startDrag(pct(e));
      const mv=e=>this._prog.moveDrag(pct(e));
      const up=e=>{ bar.classList.remove("drag"); const s=this._prog.endDrag(); this._mp("media_seek",{seek_position:round2(s)}); bar.removeEventListener("pointermove",mv); bar.removeEventListener("pointerup",up); };
      bar.addEventListener("pointermove",mv,{passive:true});
      bar.addEventListener("pointerup",up,{once:true});
    });
  }

  _bindButtons() {
    const s=this.shadowRoot;
    s.getElementById("play-btn").addEventListener("click",()=>this._mp(this._playing?"media_pause":"media_play"));
    s.getElementById("prev-btn").addEventListener("click",()=>this._mp("media_previous_track"));
    s.getElementById("next-btn").addEventListener("click",()=>this._mp("media_next_track"));
    s.getElementById("shuf-btn").addEventListener("click",()=>this._mp("shuffle_set",{shuffle:!this._shuffle}));
    s.getElementById("rep-btn").addEventListener("click",()=>this._mp("repeat_set",{repeat:{off:"all",all:"one",one:"off"}[this._repeat]??"off"}));
    s.getElementById("mute-btn").addEventListener("click",()=>this._mp("volume_mute",{is_volume_muted:!this._muted}));
    s.getElementById("like-btn").addEventListener("click",()=>this._paintLike(toggleLiked(this._trackId,this._hass)));
    s.getElementById("btn-more").addEventListener("click",()=>this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:this._config.entity},bubbles:true,composed:true})));

    // Panel openers
    for(const[id,panel]of[["btn-search","search"],["btn-lib","lib"],["btn-devices","devices"],["btn-queue","queue"],["btn-lyrics","lyrics"]]) {
      s.getElementById(id).addEventListener("click",()=>this._open(panel));
    }
    // Close buttons — each stops propagation to prevent stuck state
    for(const p of["search","lib","devices","queue","lyrics"]) {
      s.getElementById(`cls-${p}`).addEventListener("click",e=>{ e.stopPropagation(); this._close(); });
    }
    s.getElementById("bd").addEventListener("click",()=>this._close());

    // Search
    const si=s.getElementById("si");
    si?.addEventListener("focus",()=>{ this._searchFocused=true; });
    si?.addEventListener("blur", ()=>{ this._searchFocused=false; });
    si?.addEventListener("keydown",e=>{ if(e.key==="Enter") this._search(); });
    s.getElementById("sg")?.addEventListener("click",()=>this._search());

    // Hover icon preview for toggle buttons
    const shuf=s.getElementById("shuf-btn");
    shuf.addEventListener("mouseenter",()=>{ shuf.innerHTML=svg(this._shuffle?P.shuffle_off:P.shuffle,28); });
    shuf.addEventListener("mouseleave",()=>this._paintShuf());

    const rep=s.getElementById("rep-btn");
    rep.addEventListener("mouseenter",()=>{ rep.innerHTML=svg({off:P.repeat,all:P.repeat_one,one:P.repeat_off}[this._repeat]??P.repeat_off,28); });
    rep.addEventListener("mouseleave",()=>this._paintRep());

    const like=s.getElementById("like-btn");
    like.addEventListener("mouseenter",()=>{ like.innerHTML=svg(_liked.has(this._trackId)?P.heart_out:P.heart,20); });
    like.addEventListener("mouseleave",()=>this._paintLike(_liked.has(this._trackId)));

    // Marquee
    const mw=s.getElementById("mq-wrap");
    mw?.addEventListener("mouseenter",()=>marqStart(mw));
    mw?.addEventListener("mouseleave",()=>marqStop(mw));
  }

  _open(id) {
    if(this._openId===id){ this._close(); return; }
    const s=this.shadowRoot;
    if(this._openId) s.getElementById(`panel-${this._openId}`)?.classList.remove("open");
    this._openId=id;
    s.getElementById("bd").classList.add("open");
    s.getElementById(`panel-${id}`)?.classList.add("open");
    if(id==="queue")   this._loadQueue();
    if(id==="devices") this._renderDevices();
    if(id==="lyrics")  this._loadLyrics();
    if(id==="lib"&&!this._libStack.length) this._renderLibRoot();
    if(id==="search")  requestAnimationFrame(()=>{ s.getElementById("si")?.focus(); if(this._srR) this._renderSearch(); });
  }

  _close() {
    const s=this.shadowRoot;
    if(this._openId) { s.getElementById(`panel-${this._openId}`)?.classList.remove("open"); this._openId=null; }
    s.getElementById("bd").classList.remove("open");
  }

  // ── Main update ────────────────────────────────────────────────────────────

  _update(prev) {
    const s=this.shadowRoot;
    if(!s.getElementById("play-btn")) return;

    const so=this._so, art=this._art;
    const isOff=!so||["off","unavailable","unknown"].includes(this._state);

    // Background — same class logic as HA source
    const bg=s.getElementById("bg");
    if(bg){
      bg.classList.toggle("no-image",!art);
      bg.classList.toggle("off",isOff);
      bg.classList.toggle("unavailable",this._state==="unavailable");
    }
    // Image div background-image (HA uses this, not an <img> tag)
    const imgEl=s.getElementById("image");
    if(imgEl) imgEl.style.backgroundImage = art?`url(${this._hassUrl(art)})`:"none";

    // Apply colours from sensors (server-side node-vibrant)
    const bgC=this._bgColor, fgC=this._fgColor;
    if(bgC!==this._lastBg||fgC!==this._lastFg||this._cardH!==this._lastH){
      this._lastBg=bgC; this._lastFg=fgC; this._lastH=this._cardH;
      applyColours(s, bgC, fgC, this._cardH);
    }

    // Title / artist
    const mi=s.getElementById("mq-inner");
    if(mi) mi.textContent=this._title||"Nothing playing";
    const sub=s.getElementById("sub");
    if(sub) sub.textContent=[this._artist,this._album].filter(Boolean).join(" · ");

    // Controls
    s.getElementById("play-btn").innerHTML=svg(this._playing?P.pause:P.play,40);
    this._paintShuf(); this._paintRep();
    s.getElementById("shuf-btn").style.visibility=this._config.show_shuffle!==false?"":"hidden";
    s.getElementById("rep-btn").style.visibility =this._config.show_repeat!==false?"":"hidden";

    // Progress
    const showP=this._config.show_seek!==false&&!this._narrow&&(this._playing||this._state==="paused")&&this._durSecs>0;
    s.getElementById("prog-wrap").style.display=showP?"":"none";
    s.getElementById("player")?.classList.toggle("no-progress",!showP);
    if(showP&&so) this._prog.sync(so);

    // Volume
    s.getElementById("vol-row").style.display=this._config.show_volume!==false?"":"none";
    s.getElementById("mute-btn").innerHTML=svg(this._muted?P.vol_off:this._vol>50?P.vol_hi:P.vol_lo,22);
    this._vd?.sync(this._muted?0:this._vol/100);

    // Like
    if(this._trackId!==this._lastTrack){
      this._lastTrack=this._trackId;
      checkLiked(this._trackId,this._hass).then(()=>this._paintLike(_liked.has(this._trackId)));
    }
    this._paintLike(_liked.has(this._trackId));

    // Live panels
    if(this._openId==="devices") this._renderDevices();
    if(this._openId==="lyrics"&&this._lyricsData) this._highlightLyric();

    this._measure();
  }

  _paintShuf() { const b=this.shadowRoot.getElementById("shuf-btn"); if(b) b.innerHTML=svg(this._shuffle?P.shuffle:P.shuffle_off,28); }
  _paintRep()  { const b=this.shadowRoot.getElementById("rep-btn");  if(b) b.innerHTML=svg({off:P.repeat_off,all:P.repeat,one:P.repeat_one}[this._repeat]??P.repeat_off,28); }
  _paintLike(liked) {
    const b=this.shadowRoot.getElementById("like-btn");
    if(!b) return;
    b.innerHTML=svg(liked?P.heart:P.heart_out,20);
    b.title=liked?"Remove from Liked Songs":"Save to Liked Songs";
  }

  // ── Library ────────────────────────────────────────────────────────────────
  _renderLibRoot() {
    const body=this.shadowRoot.getElementById("lb");
    if(!body) return;
    const roots=[
      ["spotify://category/playlists",      P.library,"Playlists",      true],
      ["spotify://category/liked_songs",    P.heart,  "Liked Songs",    false],
      ["spotify://category/recently_played",P.queue,  "Recently Played",false],
      ["spotify://category/top_tracks",     P.play_box,"Top Tracks",    false],
      ["spotify://category/top_artists",    P.mic_on, "Top Artists",    true],
      ["spotify://category/new_releases",   P.library,"New Releases",   true],
      ["spotify://category/featured",       P.play_box,"Featured",      true],
    ];
    body.innerHTML=roots.map(([id,ico,label,exp])=>`
      <div class="item" data-id="${id}" data-exp="${exp}" data-label="${label}">
        <div class="ic"><div class="iph">${svg(ico,18)}</div><div class="iinfo"><div class="ititle">${label}</div></div>${svg(P.chev_r,16)}</div>
      </div>`).join("");
    this._bindLib(body); this._libStack=[]; this._updateLibTitle();
  }

  _bindLib(c) {
    c.querySelectorAll(".item[data-id]").forEach(el=>{
      el.addEventListener("click",async()=>{
        const{id,exp,label}=el.dataset;
        if(exp==="true"){ this._libStack.push({label,id}); this._updateLibTitle(); await this._browseLib(id); }
        else { this._mp("play_media",{media_content_id:id,media_content_type:"music"}); this._close(); }
      });
    });
    c.querySelectorAll("[data-aq]").forEach(b=>b.addEventListener("click",e=>{
      e.stopPropagation(); this._spotify("add_to_queue",{track_uri:b.dataset.aq});
    }));
  }

  async _browseLib(id) {
    const body=this.shadowRoot.getElementById("lb");
    if(!body) return;
    body.innerHTML=`<div class="loading">Loading…</div>`;
    try {
      const r=await this._hass.callWS({type:"media_player/browse_media",entity_id:this._config.entity,media_content_id:id,media_content_type:"music"});
      body.innerHTML=(r.children||[]).map(item=>{
        const isA=item.media_class==="artist";
        const th=item.thumbnail?`<img class="ithumb${isA?" circle":""}" src="${item.thumbnail}" alt=""/>`:`<div class="iph">${svg(P.library,16)}</div>`;
        const rt=!item.can_expand?`<button class="ctrl sm ibtn" data-aq="${item.media_content_id}" title="Queue">${svg(P.add_q,16)}</button>`:svg(P.chev_r,16);
        return `<div class="item" data-id="${item.media_content_id}" data-exp="${item.can_expand}" data-label="${(item.title||"").replace(/"/g,"&quot;")}">
          <div class="ic">${th}<div class="iinfo"><div class="ititle">${item.title||""}</div>${item.media_class?`<div class="isub">${item.media_class}</div>`:""}</div>${rt}</div>
        </div>`;
      }).join("")||`<div class="empty">Nothing here.</div>`;
      this._bindLib(body);
    } catch { body.innerHTML=`<div class="empty">Could not load.</div>`; }
  }

  _updateLibTitle() {
    const el=this.shadowRoot.getElementById("lib-title");
    if(!el) return;
    if(!this._libStack.length){ el.innerHTML=`${svg(P.library,15)}&nbsp;Library`; return; }
    const crumbs=[`<button class="bcc" data-nav="-1">${svg(P.home,12)}&nbsp;Library</button>`,...this._libStack.map((p,i)=>`<span class="bcs">›</span><button class="bcc${i===this._libStack.length-1?" last":""}" data-nav="${i}">${p.label}</button>`)].join("");
    el.innerHTML=`<div style="display:flex;align-items:center;gap:2px;overflow:hidden;flex-wrap:nowrap">${crumbs}</div>`;
    el.querySelectorAll(".bcc[data-nav]").forEach(b=>b.addEventListener("click",async()=>{
      const nav=parseInt(b.dataset.nav);
      if(nav===-1){ this._libStack=[]; this._renderLibRoot(); return; }
      const t=this._libStack[nav]; this._libStack=this._libStack.slice(0,nav); this._updateLibTitle(); await this._browseLib(t.id);
    }));
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  async _search() {
    const s=this.shadowRoot, q=s.getElementById("si")?.value?.trim();
    if(!q) return;
    if(q!==this._srQ){ this._srQ=q; this._srR=null; this._srX={}; }
    const body=s.getElementById("sb");
    if(!this._srR&&body) body.innerHTML=`<div class="loading">Searching…</div>`;
    try {
      const tok=this._hass?.auth?.data?.access_token;
      const r=await fetch(`/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`,{headers:{Authorization:`Bearer ${tok}`}});
      if(r.ok){ this._srR=await r.json(); this._renderSearch(); }
      else if(body) body.innerHTML=`<div class="empty">Search failed.</div>`;
    } catch { s.getElementById("sb").innerHTML=`<div class="empty">Search failed.</div>`; }
  }

  _renderSearch() {
    const s=this.shadowRoot, body=s.getElementById("sb");
    if(!body||!this._srR) return;
    const R=this._srR;
    const mkT=t=>`<div class="item" data-play="${t.uri}"><div class="ic"><img class="ithumb" src="${t.album?.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div><button class="ctrl sm ibtn" data-aq="${t.uri}" title="Queue">${svg(P.add_q,16)}</button></div></div>`;
    const mkA=a=>`<div class="item" data-play="${a.uri}"><div class="ic"><img class="ithumb" src="${a.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">${(a.artists||[]).map(x=>x.name).join(", ")}</div></div></div></div>`;
    const mkAr=a=>`<div class="item" data-play="${a.uri}"><div class="ic"><img class="ithumb circle" src="${a.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">Artist</div></div></div></div>`;
    const mkP=p=>`<div class="item" data-play="${p.uri}"><div class="ic"><img class="ithumb" src="${p.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${p.name}</div><div class="isub">Playlist · ${p.owner?.display_name||""}</div></div></div></div>`;
    const sec=(label,key,mkFn,n)=>{
      const items=R[key]?.items; if(!items?.length) return "";
      const shown=this._srX[key]?items:items.slice(0,n);
      const total=R[key]?.total||items.length;
      const more=!this._srX[key]&&total>n?`<button class="smore" data-ex="${key}">Show more ${label.toLowerCase()} (${total})</button>`:"";
      return `<div class="slabel">${label}</div>${shown.map(mkFn).join("")}${more}`;
    };
    const html=sec("Tracks","tracks",mkT,5)+sec("Albums","albums",mkA,4)+sec("Artists","artists",mkAr,4)+sec("Playlists","playlists",mkP,4);
    body.innerHTML=html||`<div class="empty">No results.</div>`;
    body.querySelectorAll(".item[data-play]").forEach(el=>el.addEventListener("click",e=>{
      if(e.target.closest("[data-aq]")) return;
      this._mp("play_media",{media_content_id:el.dataset.play,media_content_type:"music"}); this._close();
    }));
    body.querySelectorAll("[data-aq]").forEach(b=>b.addEventListener("click",e=>{ e.stopPropagation(); this._spotify("add_to_queue",{track_uri:b.dataset.aq}); }));
    body.querySelectorAll("[data-ex]").forEach(b=>b.addEventListener("click",()=>{ this._srX[b.dataset.ex]=true; this._renderSearch(); }));
    if(this._searchFocused) requestAnimationFrame(()=>s.getElementById("si")?.focus());
  }

  // ── Queue ──────────────────────────────────────────────────────────────────
  async _loadQueue() {
    const body=this.shadowRoot.getElementById("qb");
    if(!body) return;
    body.innerHTML=`<div class="loading">Loading queue…</div>`;
    try {
      const tok=this._hass?.auth?.data?.access_token;
      const r=await fetch("/api/spotify_enhanced/queue",{headers:{Authorization:`Bearer ${tok}`}});
      if(!r.ok) throw new Error();
      this._renderQueue(body,await r.json());
    } catch { body.innerHTML=`<div class="empty">Queue unavailable. Start playback first.</div>`; }
  }

  _renderQueue(body,data) {
    const cur=data.currently_playing, q=data.queue||[], qUris=q.map(t=>t.uri);
    const mk=(t,now=false)=>`
      <div class="item${now?" now":""}" data-uri="${t.uri}">
        <div class="ic">
          <img class="ithumb" src="${t.album?.images?.[0]?.url||""}" alt=""/>
          <div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div>
          <span style="font-size:0.72rem;opacity:0.6">${fmt(t.duration_ms/1000)}</span>
        </div>
        <div class="sdel">${svg(P.delete,20)}</div>
      </div>`;
    let html="";
    if(cur) html+=`<div class="qnow">Now Playing</div>`+mk(cur,true);
    if(q.length) html+=`<div class="slabel">Next Up</div>`+q.slice(0,30).map(t=>mk(t)).join("");
    body.innerHTML=html||`<div class="empty">Queue is empty.</div>`;
    body.querySelectorAll(".item[data-uri]").forEach(el=>{
      let sx=0,dx=0;
      el.addEventListener("click",async e=>{
        if(el.classList.contains("swiped")){ el.classList.remove("swiped"); return; }
        if(e.target.closest(".sdel")) return;
        const pos=qUris.indexOf(el.dataset.uri);
        if(pos>=0){
          const was=this._muted;
          if(!was) this._mp("volume_mute",{is_volume_muted:true});
          for(let i=0;i<=pos;i++){ this._mp("media_next_track"); await new Promise(r=>setTimeout(r,350)); }
          if(!was){ await new Promise(r=>setTimeout(r,400)); this._mp("volume_mute",{is_volume_muted:false}); }
        }
        this._close();
      });
      el.addEventListener("touchstart",e=>{ sx=e.touches[0].clientX; },{passive:true});
      el.addEventListener("touchmove", e=>{ dx=e.touches[0].clientX-sx; },{passive:true});
      el.addEventListener("touchend",  ()=>{ if(dx<-40) el.classList.add("swiped"); else el.classList.remove("swiped"); });
      el.querySelector(".sdel")?.addEventListener("click",e=>{ e.stopPropagation(); el.style.opacity="0"; el.style.transition="opacity 0.2s"; setTimeout(()=>this._loadQueue(),250); });
    });
  }

  // ── Devices ────────────────────────────────────────────────────────────────
  _renderDevices() {
    const body=this.shadowRoot.getElementById("db");
    if(!body) return;
    const devs=stabilise(this._devices);
    if(!devs.length){ body.innerHTML=`<div class="empty">No devices found. Open Spotify on a device.</div>`; return; }
    body.innerHTML=devs.map(d=>`
      <div class="devitem${d.id===this._devId?" active":""}" data-id="${d.id}">
        <div class="devicon">${svg(P.cast,22)}</div>
        <div class="devname">${d.name}</div>
        ${d.volume_percent!=null?`<span class="devvol">${d.volume_percent}%</span>`:""}
        ${d.id===this._devId?`<div class="devdot"></div>`:""}
      </div>`).join("");
    body.querySelectorAll(".devitem[data-id]").forEach(el=>el.addEventListener("click",()=>{ this._spotify("transfer_playback",{device_id:el.dataset.id}); this._close(); }));
  }

  // ── Lyrics (lrclib.net) ────────────────────────────────────────────────────
  async _loadLyrics() {
    const body=this.shadowRoot.getElementById("lyb");
    if(!body) return;
    body.innerHTML=`<div class="loading">Loading lyrics…</div>`;
    this._lyricsData=null;
    if(!this._title||!this._artist){ body.innerHTML=`<div class="empty">No track playing.</div>`; return; }
    try {
      const p=new URLSearchParams({track_name:this._title,artist_name:this._artist,album_name:this._album||"",duration:Math.round(this._durSecs)});
      const r=await fetch(`https://lrclib.net/api/get?${p}`);
      if(!r.ok) throw new Error();
      const data=await r.json();
      if(data.syncedLyrics){
        const lines=data.syncedLyrics.split("\n").map(l=>{ const m=l.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)/); return m?{ms:(parseInt(m[1])*60+parseFloat(m[2]))*1000,words:m[3].trim()}:null; }).filter(Boolean);
        this._lyricsData=lines;
        body.innerHTML=lines.map((l,i)=>`<div class="lline${l.words?"":" plain"}" data-i="${i}" data-t="${l.ms}">${l.words||"♪"}</div>`).join("");
        body.querySelectorAll(".lline[data-t]").forEach(el=>el.addEventListener("click",()=>this._mp("media_seek",{seek_position:round2(parseInt(el.dataset.t)/1000)})));
        this._highlightLyric();
      } else if(data.plainLyrics){
        this._lyricsData=null;
        body.innerHTML=data.plainLyrics.split("\n").map(l=>l?`<div class="lline plain">${l}</div>`:`<div style="height:8px"></div>`).join("");
      } else throw new Error();
    } catch { body.innerHTML=`<div class="empty">${svg(P.mic_off,28)}<br><br>Lyrics not available for this track.</div>`; }
  }

  _highlightLyric() {
    const body=this.shadowRoot.getElementById("lyb");
    if(!body||!this._lyricsData||!this._prog) return;
    const nowMs=this._prog.current*1000;
    const lines=body.querySelectorAll(".lline[data-t]");
    let active=null;
    lines.forEach(el=>{ el.classList.remove("on"); if(parseInt(el.dataset.t)<=nowMs) active=el; });
    if(active){ active.classList.add("on"); active.scrollIntoView({behavior:"smooth",block:"center"}); }
  }
}

customElements.define("spotify-enhanced-card", SpotifyEnhancedCard);

// ─── MINI CARD ────────────────────────────────────────────────────────────────

class SpotifyMiniCard extends Base {
  static getStubConfig() { return { entity:"media_player.spotify_enhanced" }; }
  setConfig(c) { this._config={show_volume:true,...c}; this._ready=false; this._build(); this._ready=true; if(this._hass) this._update(null); }

  _build() {
    this.shadowRoot.innerHTML=`<style>${HA_CSS}
      ha-card { display:flex; align-items:center; padding:10px 12px; gap:10px; height:auto; overflow:hidden; }
      .art { width:48px; height:48px; border-radius:4px; object-fit:cover; flex-shrink:0; background:rgba(255,255,255,0.1); }
      .inf { flex:1; min-width:0; }
      .tt  { font-size:0.9rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ss  { font-size:0.74rem; opacity:0.65; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .vr  { display:flex; align-items:center; gap:4px; margin-top:5px; }
      .vr .vol-track { flex:1; }
      .ctrls { display:flex; align-items:center; gap:2px; flex-shrink:0; }
      .cb   { --size:36px; --icon:22px; }
      .cbpp { --size:44px; --icon:30px; }
    </style>
    <ha-card>
      <img class="art" id="art" src="" alt=""/>
      <div class="inf">
        <div class="tt" id="tt">Nothing playing</div>
        <div class="ss" id="ss"></div>
        <div class="vr" id="vr">
          <button class="ctrl cb vol-icon" id="mute">${svg(P.vol_lo,18)}</button>
          <div class="vol-track" id="vt"><div class="vol-fill" id="vf"></div><div class="vol-thumb" id="vh"></div></div>
        </div>
      </div>
      <div class="ctrls">
        <button class="ctrl cb" id="prev">${svg(P.prev,22)}</button>
        <button class="ctrl cbpp" id="play">${svg(P.play,30)}</button>
        <button class="ctrl cb" id="next">${svg(P.next,22)}</button>
      </div>
    </ha-card>`;
    const s=this.shadowRoot;
    s.getElementById("play").addEventListener("click",()=>this._mp(this._playing?"media_pause":"media_play"));
    s.getElementById("prev").addEventListener("click",()=>this._mp("media_previous_track"));
    s.getElementById("next").addEventListener("click",()=>this._mp("media_next_track"));
    s.getElementById("mute").addEventListener("click",()=>this._mp("volume_mute",{is_volume_muted:!this._muted}));
    this._vd=new VolDrag(s.getElementById("vt"),s.getElementById("vf"),s.getElementById("vh"),p=>this._mp("volume_set",{volume_level:round2(p)}));
  }

  _update() {
    const s=this.shadowRoot;
    if(!s.getElementById("art")) return;
    const art=this._art;
    s.getElementById("art").src=this._hassUrl(art);
    s.getElementById("tt").textContent=this._title||"Nothing playing";
    s.getElementById("ss").textContent=this._artist;
    s.getElementById("play").innerHTML=svg(this._playing?P.pause:P.play,30);
    s.getElementById("mute").innerHTML=svg(this._muted?P.vol_off:P.vol_lo,18);
    s.getElementById("vr").style.display=this._config.show_volume!==false?"flex":"none";
    this._vd?.sync(this._muted?0:this._vol/100);
    // Apply server-side colours
    const card=this.shadowRoot.querySelector("ha-card");
    if(card&&this._bgColor) card.style.backgroundColor=this._bgColor;
    const inf=s.querySelector(".inf"), ctrls=s.querySelector(".ctrls");
    if(this._fgColor){ if(inf) inf.style.color=this._fgColor; if(ctrls) ctrls.style.color=this._fgColor; }
  }
}
customElements.define("spotify-mini-card", SpotifyMiniCard);

// ─── DEVICE CARD ─────────────────────────────────────────────────────────────

class SpotifyDeviceCard extends Base {
  static getStubConfig() { return {entity:"media_player.spotify_enhanced",title:"Spotify Devices"}; }
  setConfig(c) { this._config={title:"Spotify Devices",...c}; this._ready=false; this._build(); this._ready=true; if(this._hass) this._update(null); }

  _build() {
    this.shadowRoot.innerHTML=`<style>${HA_CSS}
      ha-card { height:auto; }
      .hdr { padding:14px 14px 8px; font-size:0.82rem; font-weight:700; opacity:0.7; display:flex; align-items:center; gap:6px; }
      .empty { text-align:center; padding:24px; opacity:0.5; font-size:0.85rem; }
    </style>
    <ha-card>
      <div class="background no-image off" id="bg">
        <div class="color-block" id="color-block"></div>
        <div class="no-img" id="no-img"></div>
        <div class="image" id="image"></div>
        <div class="color-gradient" id="color-gradient"></div>
      </div>
      <div style="position:relative;z-index:1">
        <div class="hdr">${svg(P.cast,16)}&nbsp;${this._config.title}</div>
        <div id="list"><div class="empty">Loading…</div></div>
      </div>
    </ha-card>`;
  }

  _update() {
    const s=this.shadowRoot;
    // Colours from sensors
    const bg=this._bgColor, fg=this._fgColor;
    const card=s.querySelector("ha-card"); if(card&&bg) card.style.backgroundColor=bg;
    s.getElementById("color-block")?.style.setProperty("background-color",bg||"");
    s.getElementById("no-img")?.style.setProperty("background-color",bg||"");
    const grad=s.getElementById("color-gradient");
    if(grad&&bg) grad.style.backgroundImage=`linear-gradient(to right, ${bg}, ${bg}00)`;
    const inner=s.querySelector("[style*='z-index']");
    if(inner&&fg) inner.style.color=fg;
    const art=this._art;
    const imgEl=s.getElementById("image");
    if(imgEl){ imgEl.style.backgroundImage=art?`url(${this._hassUrl(art)})`:"none"; }
    const bgEl=s.getElementById("bg");
    if(bgEl){ bgEl.classList.toggle("no-image",!art); bgEl.classList.remove("off"); }

    const list=s.getElementById("list");
    if(!list) return;
    const devs=stabilise(this._devices);
    if(!devs.length){ list.innerHTML=`<div class="empty">No devices. Open Spotify on a device.</div>`; return; }
    list.innerHTML=devs.map(d=>`
      <div class="devitem${d.id===this._devId?" active":""}" data-id="${d.id}">
        <div class="devicon">${svg(P.cast,22)}</div>
        <div class="devname">${d.name}</div>
        ${d.volume_percent!=null?`<span class="devvol">${d.volume_percent}%</span>`:""}
        ${d.id===this._devId?`<div class="devdot"></div>`:""}
      </div>`).join("");
    list.querySelectorAll(".devitem[data-id]").forEach(el=>el.addEventListener("click",()=>this._spotify("transfer_playback",{device_id:el.dataset.id})));
  }
}
customElements.define("spotify-device-card", SpotifyDeviceCard);

// ─── SEARCH CARD ─────────────────────────────────────────────────────────────

class SpotifySearchCard extends Base {
  constructor() { super(); this._q=""; this._r=null; this._x={}; this._focused=false; }
  static getStubConfig() { return {entity:"media_player.spotify_enhanced"}; }
  setConfig(c) { this._config=c; this._ready=false; this._build(); this._ready=true; if(this._hass) this._update(null); }

  _build() {
    this.shadowRoot.innerHTML=`<style>${HA_CSS}
      ha-card { height:auto; display:flex; flex-direction:column; max-height:600px; }
      .inner { position:relative; z-index:1; display:flex; flex-direction:column; flex:1; min-height:0; overflow:hidden; }
      .results { overflow-y:auto; flex:1; scrollbar-width:thin; }
    </style>
    <ha-card>
      <div class="background no-image off" id="bg">
        <div class="color-block" id="color-block"></div>
        <div class="no-img" id="no-img"></div>
        <div class="image" id="image"></div>
        <div class="color-gradient" id="color-gradient"></div>
      </div>
      <div class="inner">
        <div class="sbar"><input class="sinput" id="si" placeholder="Search Spotify…" autocomplete="off"/><button class="sgo" id="sg">${svg(P.search,18)}</button></div>
        <div class="results" id="body"></div>
      </div>
    </ha-card>`;
    const go=async()=>{
      const q=this.shadowRoot.getElementById("si")?.value?.trim();
      if(!q) return;
      if(q!==this._q){ this._q=q; this._r=null; this._x={}; }
      const body=this.shadowRoot.getElementById("body");
      if(!this._r&&body) body.innerHTML=`<div class="loading">Searching…</div>`;
      try {
        const tok=this._hass?.auth?.data?.access_token;
        const r=await fetch(`/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`,{headers:{Authorization:`Bearer ${tok}`}});
        if(r.ok){ this._r=await r.json(); this._renderResults(); }
        else body.innerHTML=`<div class="empty">Search failed.</div>`;
      } catch { this.shadowRoot.getElementById("body").innerHTML=`<div class="empty">Search failed.</div>`; }
    };
    this.shadowRoot.getElementById("sg")?.addEventListener("click",go);
    this.shadowRoot.getElementById("si")?.addEventListener("keydown",e=>{ if(e.key==="Enter") go(); });
    this.shadowRoot.getElementById("si")?.addEventListener("focus",()=>{ this._focused=true; });
    this.shadowRoot.getElementById("si")?.addEventListener("blur", ()=>{ this._focused=false; });
  }

  _renderResults() {
    const s=this.shadowRoot, body=s.getElementById("body");
    if(!body||!this._r) return;
    const R=this._r;
    const mkT=t=>`<div class="item" data-play="${t.uri}"><div class="ic"><img class="ithumb" src="${t.album?.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div><button class="ctrl sm ibtn" data-aq="${t.uri}">${svg(P.add_q,16)}</button></div></div>`;
    const mkA=a=>`<div class="item" data-play="${a.uri}"><div class="ic"><img class="ithumb" src="${a.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">${(a.artists||[]).map(x=>x.name).join(", ")}</div></div></div></div>`;
    const mkAr=a=>`<div class="item" data-play="${a.uri}"><div class="ic"><img class="ithumb circle" src="${a.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">Artist</div></div></div></div>`;
    const mkP=p=>`<div class="item" data-play="${p.uri}"><div class="ic"><img class="ithumb" src="${p.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${p.name}</div><div class="isub">Playlist · ${p.owner?.display_name||""}</div></div></div></div>`;
    const sec=(label,key,mk,n)=>{
      const items=R[key]?.items; if(!items?.length) return "";
      const shown=this._x[key]?items:items.slice(0,n);
      const total=R[key]?.total||items.length;
      const more=!this._x[key]&&total>n?`<button class="smore" data-ex="${key}">Show more ${label.toLowerCase()} (${total})</button>`:"";
      return `<div class="slabel">${label}</div>${shown.map(mk).join("")}${more}`;
    };
    const html=sec("Tracks","tracks",mkT,5)+sec("Albums","albums",mkA,4)+sec("Artists","artists",mkAr,4)+sec("Playlists","playlists",mkP,4);
    body.innerHTML=html||`<div class="empty">No results.</div>`;
    body.querySelectorAll(".item[data-play]").forEach(el=>el.addEventListener("click",e=>{ if(e.target.closest("[data-aq]")) return; this._mp("play_media",{media_content_id:el.dataset.play,media_content_type:"music"}); }));
    body.querySelectorAll("[data-aq]").forEach(b=>b.addEventListener("click",e=>{ e.stopPropagation(); this._spotify("add_to_queue",{track_uri:b.dataset.aq}); }));
    body.querySelectorAll("[data-ex]").forEach(b=>b.addEventListener("click",()=>{ this._x[b.dataset.ex]=true; this._renderResults(); }));
    if(this._focused) requestAnimationFrame(()=>s.getElementById("si")?.focus());
  }

  _update() {
    const s=this.shadowRoot, bg=this._bgColor, fg=this._fgColor;
    const art=this._art;
    s.getElementById("color-block")?.style.setProperty("background-color",bg||"");
    s.getElementById("no-img")?.style.setProperty("background-color",bg||"");
    const grad=s.getElementById("color-gradient");
    if(grad&&bg) grad.style.backgroundImage=`linear-gradient(to right, ${bg}, ${bg}00)`;
    const imgEl=s.getElementById("image");
    if(imgEl) imgEl.style.backgroundImage=art?`url(${this._hassUrl(art)})`:"none";
    const bgEl=s.getElementById("bg");
    if(bgEl){ bgEl.classList.toggle("no-image",!art); bgEl.classList.remove("off"); }
    const inner=s.querySelector(".inner");
    if(inner&&fg) inner.style.color=fg;
  }
}
customElements.define("spotify-search-card", SpotifySearchCard);

// ─── QUEUE CARD ───────────────────────────────────────────────────────────────

class SpotifyQueueCard extends Base {
  constructor() { super(); this._data=null; this._loading=false; this._lastTrack=""; }
  static getStubConfig() { return {entity:"media_player.spotify_enhanced"}; }
  setConfig(c) { this._config=c; this._ready=false; this._build(); this._ready=true; if(this._hass) this._update(null); }

  _build() {
    this.shadowRoot.innerHTML=`<style>${HA_CSS}
      ha-card { height:auto; display:flex; flex-direction:column; max-height:600px; }
      .inner { position:relative; z-index:1; display:flex; flex-direction:column; flex:1; min-height:0; overflow:hidden; }
      .hdr  { padding:14px 14px 8px; font-size:0.82rem; font-weight:700; opacity:0.7; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
      .body { overflow-y:auto; flex:1; scrollbar-width:thin; }
    </style>
    <ha-card>
      <div class="background no-image off" id="bg">
        <div class="color-block" id="color-block"></div>
        <div class="no-img" id="no-img"></div>
        <div class="image" id="image"></div>
        <div class="color-gradient" id="color-gradient"></div>
      </div>
      <div class="inner">
        <div class="hdr">
          <span style="display:flex;align-items:center;gap:6px">${svg(P.queue,16)}&nbsp;Queue</span>
          <button class="ctrl sm" id="reload" title="Refresh">${svg(P.refresh,18)}</button>
        </div>
        <div class="body" id="body"><div class="loading">Loading…</div></div>
      </div>
    </ha-card>`;
    this.shadowRoot.getElementById("reload")?.addEventListener("click",()=>this._load());
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
    const cur=this._data.currently_playing, q=this._data.queue||[], qUris=q.map(t=>t.uri);
    const mk=(t,now=false)=>`
      <div class="item${now?" now":""}" data-uri="${t.uri}">
        <div class="ic"><img class="ithumb" src="${t.album?.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div><span style="font-size:0.72rem;opacity:0.6">${fmt(t.duration_ms/1000)}</span></div>
        <div class="sdel">${svg(P.delete,20)}</div>
      </div>`;
    let html="";
    if(cur) html+=`<div class="qnow">Now Playing</div>`+mk(cur,true);
    if(q.length) html+=`<div class="slabel">Next Up</div>`+q.slice(0,30).map(t=>mk(t)).join("");
    body.innerHTML=html||`<div class="empty">Queue is empty.</div>`;
    body.querySelectorAll(".item[data-uri]").forEach(el=>{
      let sx=0,dx=0;
      el.addEventListener("click",async e=>{
        if(el.classList.contains("swiped")){ el.classList.remove("swiped"); return; }
        if(e.target.closest(".sdel")) return;
        const pos=qUris.indexOf(el.dataset.uri);
        if(pos>=0){
          const was=this._muted;
          if(!was) this._mp("volume_mute",{is_volume_muted:true});
          for(let i=0;i<=pos;i++){ this._mp("media_next_track"); await new Promise(r=>setTimeout(r,350)); }
          if(!was){ await new Promise(r=>setTimeout(r,400)); this._mp("volume_mute",{is_volume_muted:false}); }
        }
      });
      el.addEventListener("touchstart",e=>{ sx=e.touches[0].clientX; },{passive:true});
      el.addEventListener("touchmove", e=>{ dx=e.touches[0].clientX-sx; },{passive:true});
      el.addEventListener("touchend",  ()=>{ if(dx<-40) el.classList.add("swiped"); else el.classList.remove("swiped"); });
      el.querySelector(".sdel")?.addEventListener("click",e=>{ e.stopPropagation(); el.style.opacity="0"; el.style.transition="opacity 0.2s"; setTimeout(()=>this._load(),250); });
    });
  }

  _update() {
    const s=this.shadowRoot, bg=this._bgColor, fg=this._fgColor, art=this._art;
    s.getElementById("color-block")?.style.setProperty("background-color",bg||"");
    s.getElementById("no-img")?.style.setProperty("background-color",bg||"");
    const grad=s.getElementById("color-gradient");
    if(grad&&bg) grad.style.backgroundImage=`linear-gradient(to right, ${bg}, ${bg}00)`;
    const imgEl=s.getElementById("image");
    if(imgEl) imgEl.style.backgroundImage=art?`url(${this._hassUrl(art)})`:"none";
    const bgEl=s.getElementById("bg");
    if(bgEl){ bgEl.classList.toggle("no-image",!art); bgEl.classList.remove("off"); }
    const inner=s.querySelector(".inner");
    if(inner&&fg) inner.style.color=fg;
    const tid=this._trackId;
    if(!this._data&&!this._loading){ this._load(); return; }
    if(tid&&tid!==this._lastTrack){ this._lastTrack=tid; this._load(); }
  }
}
customElements.define("spotify-queue-card", SpotifyQueueCard);

// ─── LYRICS CARD ─────────────────────────────────────────────────────────────

class SpotifyLyricsCard extends Base {
  constructor() { super(); this._data=null; this._lastTrack=""; this._prog=new ProgressTracker(); }
  static getStubConfig() { return {entity:"media_player.spotify_enhanced"}; }
  setConfig(c) { this._config=c; this._ready=false; this._build(); this._ready=true; if(this._hass) this._update(null); }
  disconnectedCallback() { this._prog?.destroy(); }

  _build() {
    this.shadowRoot.innerHTML=`<style>${HA_CSS}
      ha-card { height:auto; display:flex; flex-direction:column; max-height:500px; }
      .inner { position:relative; z-index:1; display:flex; flex-direction:column; flex:1; min-height:0; overflow:hidden; }
      .hdr  { padding:14px 14px 8px; font-size:0.82rem; font-weight:700; opacity:0.7; display:flex; align-items:center; gap:6px; flex-shrink:0; }
      .body { overflow-y:auto; flex:1; padding:6px 0 16px; scrollbar-width:thin; }
    </style>
    <ha-card>
      <div class="background no-image off" id="bg">
        <div class="color-block" id="color-block"></div>
        <div class="no-img" id="no-img"></div>
        <div class="image" id="image"></div>
        <div class="color-gradient" id="color-gradient"></div>
      </div>
      <div class="inner">
        <div class="hdr">${svg(P.mic_on,16)}&nbsp;Lyrics</div>
        <div class="body" id="body"><div class="loading">Loading…</div></div>
      </div>
    </ha-card>`;
  }

  async _loadLyrics() {
    const body=this.shadowRoot.getElementById("body");
    if(!body) return;
    body.innerHTML=`<div class="loading">Loading lyrics…</div>`;
    this._data=null;
    if(!this._title||!this._artist){ body.innerHTML=`<div class="empty">No track playing.</div>`; return; }
    try {
      const p=new URLSearchParams({track_name:this._title,artist_name:this._artist,album_name:this._album||"",duration:Math.round(this._durSecs)});
      const r=await fetch(`https://lrclib.net/api/get?${p}`);
      if(!r.ok) throw new Error();
      const data=await r.json();
      if(data.syncedLyrics){
        const lines=data.syncedLyrics.split("\n").map(l=>{ const m=l.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)/); return m?{ms:(parseInt(m[1])*60+parseFloat(m[2]))*1000,words:m[3].trim()}:null; }).filter(Boolean);
        this._data=lines;
        body.innerHTML=lines.map((l,i)=>`<div class="lline${l.words?"":" plain"}" data-i="${i}" data-t="${l.ms}">${l.words||"♪"}</div>`).join("");
        body.querySelectorAll(".lline[data-t]").forEach(el=>el.addEventListener("click",()=>this._mp("media_seek",{seek_position:round2(parseInt(el.dataset.t)/1000)})));
        this._highlight();
      } else if(data.plainLyrics){
        this._data=null;
        body.innerHTML=data.plainLyrics.split("\n").map(l=>l?`<div class="lline plain">${l}</div>`:`<div style="height:8px"></div>`).join("");
      } else throw new Error();
    } catch { body.innerHTML=`<div class="empty">${svg(P.mic_off,28)}<br><br>Lyrics not available.</div>`; }
  }

  _highlight() {
    const body=this.shadowRoot.getElementById("body");
    if(!body||!this._data||!this._prog) return;
    const nowMs=this._prog.current*1000;
    const lines=body.querySelectorAll(".lline[data-t]");
    let active=null;
    lines.forEach(el=>{ el.classList.remove("on"); if(parseInt(el.dataset.t)<=nowMs) active=el; });
    if(active){ active.classList.add("on"); active.scrollIntoView({behavior:"smooth",block:"center"}); }
  }

  _update() {
    const s=this.shadowRoot, bg=this._bgColor, fg=this._fgColor, art=this._art, so=this._so, tid=this._trackId;
    s.getElementById("color-block")?.style.setProperty("background-color",bg||"");
    s.getElementById("no-img")?.style.setProperty("background-color",bg||"");
    const grad=s.getElementById("color-gradient");
    if(grad&&bg) grad.style.backgroundImage=`linear-gradient(to right, ${bg}, ${bg}00)`;
    const imgEl=s.getElementById("image");
    if(imgEl) imgEl.style.backgroundImage=art?`url(${this._hassUrl(art)})`:"none";
    const bgEl=s.getElementById("bg");
    if(bgEl){ bgEl.classList.toggle("no-image",!art); bgEl.classList.remove("off"); }
    const inner=s.querySelector(".inner");
    if(inner&&fg) inner.style.color=fg;
    if(so) this._prog.sync(so);
    if(tid&&tid!==this._lastTrack){ this._lastTrack=tid; this._loadLyrics(); }
    else if(this._data) this._highlight();
  }
}
customElements.define("spotify-lyrics-card", SpotifyLyricsCard);

// ─── VISUAL EDITOR ────────────────────────────────────────────────────────────

class SpotifyEnhancedCardEditor extends HTMLElement {
  set hass(h) { this._hass=h; const p=this.querySelector("ha-entity-picker"); if(p) p.hass=h; }
  setConfig(c) { this._config=c; this._render(); }
  _render() {
    const c=this._config||{};
    const tog=(k,label,def=true)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--divider-color,#eee)"><span>${label}</span><ha-switch data-key="${k}" ${c[k]!==false&&(c[k]!==undefined?c[k]:def)?"checked":""}></ha-switch></div>`;
    this.innerHTML=`<style>:host{display:block;padding:4px 0} ha-entity-picker{display:block;margin-bottom:14px} .sh{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--secondary-text-color);margin:12px 0 4px}</style>
      <ha-entity-picker .hass="${this._hass||null}" .value="${c.entity||""}" .includeDomains="${["media_player"]}" label="Spotify Media Player Entity"></ha-entity-picker>
      <div class="sh">Controls</div>
      ${tog("show_seek","Show seek bar")}${tog("show_volume","Show volume")}${tog("show_shuffle","Show shuffle")}${tog("show_repeat","Show repeat")}`;
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
  {type:"spotify-enhanced-card", name:"Spotify Enhanced — Media Deck",    description:"Full player. Colours via server-side node-vibrant (identical to HA).", preview:true},
  {type:"spotify-mini-card",     name:"Spotify Enhanced — Mini Player",   description:"Compact single-row playback control.",                                   preview:true},
  {type:"spotify-device-card",   name:"Spotify Enhanced — Device Picker", description:"Browse and switch Spotify Connect devices.",                              preview:true},
  {type:"spotify-search-card",   name:"Spotify Enhanced — Search",        description:"Standalone Spotify search.",                                              preview:true},
  {type:"spotify-queue-card",    name:"Spotify Enhanced — Queue",         description:"Queue viewer with swipe-to-remove.",                                      preview:true},
  {type:"spotify-lyrics-card",   name:"Spotify Enhanced — Lyrics",        description:"Time-synced lyrics via lrclib.net.",                                      preview:true},
);

console.info(
  `%c SPOTIFY ENHANCED %c v${VERSION} `,
  "color:#fff;background:#1DB954;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px",
  "color:#1DB954;background:#111;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0"
);
