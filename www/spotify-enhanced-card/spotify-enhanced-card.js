/**
 * Spotify Enhanced Card v1.1.0
 * Three cards in one file:
 *   spotify-enhanced-card  — Full deck
 *   spotify-mini-card      — Mini player
 *   spotify-device-card    — Device picker
 */
const VERSION = "1.1.0";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (ms) => {
  if (ms == null) return "0:00";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const debounce = (fn, ms) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

// MDI icon SVG path data (inline so no external font needed)
const MDI = {
  play:        "M8,5.14V19.14L19,12.14L8,5.14Z",
  pause:       "M14,19H18V5H14M6,19H10V5H6V19Z",
  skip_next:   "M6,18L14.5,12L6,6V18M16,6V18H18V6H16Z",
  skip_prev:   "M6,18V6H8V18H6M9.5,12L18,18V6L9.5,12Z",
  shuffle:     "M14.83,13.41L13.42,14.82L16.55,17.95L14.5,20H20V14.5L17.96,16.54L14.83,13.41M14.5,4L16.54,6.04L4,18.59L5.41,20L17.96,17.54L20,9.5L17.95,9.5L14.5,4M10.59,9.17L5.41,4L4,5.41L9.17,10.58L10.59,9.17Z",
  repeat:      "M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z",
  repeat_one:  "M13,15V9H12L10,10V11H11.5V15M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z",
  volume_low:  "M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.77 18.5,12M5,9V15H9L14,20V4L9,9H5Z",
  volume_high: "M3,9V15H7L12,20V4L7,9H3M16,7.97V16C17.5,15.29 18.5,13.77 18.5,12C18.5,10.23 17.5,8.71 16,7.97M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18.01,19.86 21,16.28 21,12C21,7.72 18.01,4.14 14,3.23Z",
  volume_mute: "M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18.01,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.52C15.58,18.04 14.83,18.45 14,18.7V20.76C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M12,4L9.91,6.09L12,8.18V4Z",
  heart:       "M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z",
  heart_off:   "M23,7.1L21.6,5.7L19.4,7.9L17.2,5.7L15.8,7.1L18,9.3L15.8,11.5L17.2,12.9L19.4,10.7L21.6,12.9L23,11.5L20.8,9.3L23,7.1M2,8.5C2,12.27 5.4,15.36 10.55,20.03L12,21.35L13.45,20.03C14.3,19.26 15.09,18.5 15.82,17.77L5.26,7.21C4.5,7.67 4,8.5 4,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C16.97,3 17.43,3.07 17.87,3.2L16.38,4.69C16.09,4.62 15.8,4.59 15.5,4.59C14.03,4.59 12.72,5.29 11.9,6.36C11.08,5.29 9.77,4.59 8.3,4.59C5.64,4.59 3.5,6.73 3.5,9.39C3.5,12.95 6.75,15.83 11.61,20.22L12,20.56L12.39,20.22C13.26,19.44 14.07,18.7 14.82,17.97",
  magnify:     "M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",
  playlist:    "M3,10H21V12H3V10M3,6H21V8H3V6M3,14H15V16H3V14M3,18H15V20H3V18M19,14V20L23,17L19,14Z",
  cast:        "M1,10V12A9,9 0 0,1 10,21H12C12,14.92 7.07,10 1,10M1,14V16A5,5 0 0,1 6,21H8A7,7 0 0,0 1,14M1,18V21H4A3,3 0 0,0 1,18M21,3H3C1.89,3 1,3.89 1,5V8H3V5H21V19H14V21H21A2,2 0 0,0 23,19V5C23,3.89 22.1,3 21,3Z",
  robot:       "M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z",
  music:       "M12,3V13.55C11.41,13.21 10.73,13 10,13A4,4 0 0,0 6,17A4,4 0 0,0 10,21A4,4 0 0,0 14,17V7H18V3H12Z",
  close:       "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
  chevron_right: "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
  home:        "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",
  microphone:  "M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z",
  queue:       "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",
};

const icon = (path, size = 20, color = "currentColor") =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}"><path d="${path}"/></svg>`;

// ─── Base class ─────────────────────────────────────────────────────────────

class SpotifyBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
    this._onHass();
  }

  get _state() {
    return this._hass?.states[this._config?.entity];
  }

  get _attr() {
    return this._state?.attributes ?? {};
  }

  get _playing() { return this._state?.state === "playing"; }
  get _title()   { return this._attr.media_title ?? "Nothing playing"; }
  get _artist()  { return this._attr.media_artist ?? ""; }
  get _album()   { return this._attr.media_album_name ?? ""; }
  get _art()     { return this._attr.entity_picture ?? ""; }
  get _vol()     { return (this._attr.volume_level ?? 0) * 100; }
  get _shuffle() { return this._attr.shuffle ?? false; }
  get _repeat()  { return this._attr.repeat ?? "off"; }
  get _progMs()  { return (this._attr.media_position ?? 0) * 1000; }
  get _durMs()   { return (this._attr.media_duration ?? 0) * 1000; }
  get _pct()     { return this._durMs ? (this._progMs / this._durMs) * 100 : 0; }
  get _devices() { return this._attr.spotify_devices ?? []; }
  get _devId()   { return this._attr.device_id ?? null; }
  get _isDJ()    { return this._attr.is_dj ?? false; }
  get _trackId() { return this._attr.track_id ?? null; }

  call(domain_service, data = {}) {
    const [domain, service] = domain_service.split(".");
    this._hass?.callService(domain, service, data);
  }

  spotify(service, data = {}) {
    this._hass?.callService("spotify_enhanced", service, data);
  }

  _onHass() {}
}

// ─── Shared stylesheet (uses HA CSS variables = theme-aware) ────────────────

const sharedCSS = (accent) => `
  :host {
    --se-accent: ${accent || "var(--primary-color)"};
    --se-bg: var(--card-background-color, #1a1a2e);
    --se-bg2: var(--secondary-background-color, #252538);
    --se-bg3: var(--divider-color, #333350);
    --se-text: var(--primary-text-color, #ffffff);
    --se-text2: var(--secondary-text-color, #aaaacc);
    --se-radius: var(--ha-card-border-radius, 12px);
    display: block;
  }
  ha-card {
    background: var(--se-bg);
    border-radius: var(--se-radius);
    overflow: hidden;
    color: var(--se-text);
    font-family: var(--paper-font-body1_-_font-family, sans-serif);
    user-select: none;
  }
  button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--se-text2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, opacity 0.15s, transform 0.1s;
    padding: 0;
  }
  button:hover { color: var(--se-text); opacity: 0.9; }
  button.active { color: var(--se-accent); }
  button:active { transform: scale(0.92); }
  input[type=range] {
    -webkit-appearance: none;
    width: 100%;
    height: 3px;
    border-radius: 2px;
    background: var(--se-bg3);
    outline: none;
    cursor: pointer;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: var(--se-text);
    cursor: pointer;
  }
  .progress-track {
    position: relative;
    height: 3px;
    background: var(--se-bg3);
    border-radius: 2px;
    cursor: pointer;
    overflow: visible;
  }
  .progress-fill {
    height: 100%;
    background: var(--se-accent);
    border-radius: 2px;
    pointer-events: none;
    position: relative;
  }
  .progress-fill::after {
    content: '';
    position: absolute;
    right: -5px; top: 50%;
    transform: translateY(-50%);
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--se-text);
    opacity: 0;
    transition: opacity 0.15s;
  }
  .progress-track:hover .progress-fill::after { opacity: 1; }
  .times { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--se-text2); margin-top: 3px; }
`;

// ─── Full Deck Card ──────────────────────────────────────────────────────────

class SpotifyEnhancedCard extends SpotifyBase {
  constructor() {
    super();
    this._tab = "player";
    this._libraryStack = [];   // [{title, id}]
    this._libraryItems = null; // null = not loaded, [] = loaded
    this._searchQuery = "";
    this._searchResults = null;
    this._progTimer = null;
    this._localProg = 0;
    this._localProgTs = 0;
    this._djHoldTimer = null;
    this._djHoldActive = false;
    this._rendered = false;
  }

  static getConfigElement() { return document.createElement("spotify-enhanced-card-editor"); }

  static getStubConfig() {
    return {
      entity: "media_player.spotify_enhanced",
      show_seek: true, show_volume: true, show_shuffle: true, show_repeat: true,
      show_library: true, show_search: true, show_devices: true, show_dj: true,
    };
  }

  setConfig(config) {
    this._config = {
      show_seek: true, show_volume: true, show_shuffle: true, show_repeat: true,
      show_library: true, show_search: true, show_devices: true, show_dj: true,
      ...config,
    };
    this._rendered = false;
    this._buildDOM();
  }

  disconnectedCallback() {
    clearInterval(this._progTimer);
    this._progTimer = null;
  }

  _buildDOM() {
    const s = this.shadowRoot;
    s.innerHTML = `
      <style>
        ${sharedCSS(this._config.accent_color)}

        .art-wrap {
          position: relative;
          background: var(--se-bg2);
          overflow: hidden;
        }
        .art-wrap img {
          width: 100%;
          display: block;
          aspect-ratio: 1;
          object-fit: cover;
          transition: opacity 0.3s;
        }
        .art-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%);
          pointer-events: none;
        }
        .art-info {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 12px 14px;
        }
        .art-info .track {
          font-size: 1.1rem; font-weight: 700;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          line-height: 1.2;
        }
        .art-info .artist {
          font-size: 0.82rem; color: var(--se-text2); margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dj-badge {
          display: inline-flex; align-items: center; gap: 4px;
          background: var(--se-accent); color: var(--card-background-color, #000);
          font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.6px; padding: 2px 7px; border-radius: 20px;
          margin-bottom: 4px;
        }
        .like-btn {
          position: absolute; top: 10px; right: 10px;
          background: rgba(0,0,0,0.35); border-radius: 50%;
          width: 34px; height: 34px;
        }
        .like-btn:hover { background: rgba(0,0,0,0.55); }
        .progress-section { padding: 10px 14px 2px; }
        .controls { padding: 8px 14px 10px; }
        .ctrl-row { display: flex; align-items: center; justify-content: space-between; }
        .ctrl-btn { width: 42px; height: 42px; border-radius: 50%; }
        .play-btn {
          width: 52px; height: 52px; border-radius: 50%;
          background: var(--se-text) !important;
          color: var(--se-bg) !important;
        }
        .play-btn:hover { background: var(--se-accent) !important; }
        .vol-row {
          display: flex; align-items: center; gap: 8px;
          padding: 0 14px 10px;
        }
        .vol-icon { flex-shrink: 0; width: 20px; }
        .tabs {
          display: flex; border-top: 1px solid var(--se-bg3);
        }
        .tab {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          gap: 2px; padding: 8px 4px 6px;
          font-size: 0.68rem; border-radius: 0;
          color: var(--se-text2); transition: background 0.15s, color 0.15s;
        }
        .tab:hover { background: var(--se-bg2); }
        .tab.active { color: var(--se-accent); }
        .tab svg { flex-shrink: 0; }
        .panel {
          max-height: 300px; overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--se-bg3) transparent;
        }
        .panel::-webkit-scrollbar { width: 3px; }
        .panel::-webkit-scrollbar-thumb { background: var(--se-bg3); }

        /* Player tab */
        .dj-panel { padding: 10px 14px 6px; }
        .dj-label {
          font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.8px; color: var(--se-accent); margin-bottom: 8px;
          display: flex; align-items: center; gap: 5px;
        }
        .dj-actions { display: flex; gap: 8px; margin-bottom: 8px; }
        .dj-btn {
          flex: 1; padding: 9px 0; border-radius: 8px;
          font-size: 0.8rem; font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          color: var(--se-text);
        }
        .dj-btn-primary { background: var(--se-accent) !important; color: var(--card-background-color, #000) !important; }
        .dj-btn-secondary { background: var(--se-bg2) !important; }
        .dj-btn:hover { opacity: 0.85; }

        /* DJ skip/request — tap vs hold */
        .dj-skip-hold {
          width: 100%; padding: 10px; border-radius: 8px;
          background: var(--se-bg2) !important;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 6px;
        }
        .dj-skip-hold .hint {
          font-size: 0.68rem; color: var(--se-text2); text-align: right; line-height: 1.3;
        }
        .dj-request-row { display: flex; gap: 6px; }
        .dj-request-input {
          flex: 1; background: var(--se-bg2); border: 1px solid var(--se-bg3);
          border-radius: 8px; color: var(--se-text); padding: 7px 10px;
          font-size: 0.82rem; outline: none;
          transition: border-color 0.15s;
        }
        .dj-request-input:focus { border-color: var(--se-accent); }
        .dj-request-btn {
          background: var(--se-accent) !important;
          color: var(--card-background-color, #000) !important;
          border-radius: 8px; padding: 7px 12px;
          font-size: 0.8rem; font-weight: 700;
        }

        /* Search */
        .search-bar { display: flex; gap: 6px; padding: 10px 14px 6px; }
        .search-input {
          flex: 1; background: var(--se-bg2); border: 1px solid var(--se-bg3);
          border-radius: 8px; color: var(--se-text); padding: 7px 10px;
          font-size: 0.85rem; outline: none; transition: border-color 0.15s;
        }
        .search-input:focus { border-color: var(--se-accent); }
        .search-go {
          background: var(--se-accent) !important; color: var(--card-background-color, #000) !important;
          border-radius: 8px; padding: 7px 13px;
          font-size: 0.8rem; font-weight: 700;
        }
        .section-label {
          padding: 8px 14px 3px;
          font-size: 0.66rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.8px; color: var(--se-text2);
        }

        /* List items */
        .item {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 14px; cursor: pointer;
          transition: background 0.1s;
        }
        .item:hover { background: var(--se-bg2); }
        .thumb {
          width: 42px; height: 42px; border-radius: 4px;
          object-fit: cover; flex-shrink: 0;
          background: var(--se-bg3);
        }
        .thumb-round { border-radius: 50%; }
        .thumb-placeholder {
          width: 42px; height: 42px; border-radius: 4px;
          background: var(--se-bg3); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: var(--se-text2);
        }
        .item-info { flex: 1; min-width: 0; }
        .item-title {
          font-size: 0.85rem; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .item-sub {
          font-size: 0.72rem; color: var(--se-text2); margin-top: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .item-action {
          width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
          color: var(--se-text2);
        }
        .item-action:hover { color: var(--se-text); background: var(--se-bg3); }

        /* Breadcrumb */
        .breadcrumb {
          display: flex; align-items: center; flex-wrap: nowrap;
          gap: 2px; padding: 8px 14px 3px;
          overflow-x: auto; scrollbar-width: none;
        }
        .breadcrumb::-webkit-scrollbar { display: none; }
        .crumb {
          font-size: 0.75rem; color: var(--se-text2);
          padding: 2px 4px; border-radius: 4px; white-space: nowrap;
        }
        .crumb:hover { color: var(--se-text); background: var(--se-bg2); }
        .crumb.active { color: var(--se-text); font-weight: 600; }
        .crumb-sep { color: var(--se-bg3); flex-shrink: 0; }

        /* Devices */
        .device-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 14px; cursor: pointer;
          transition: background 0.12s;
        }
        .device-item:hover { background: var(--se-bg2); }
        .device-item.active { background: color-mix(in srgb, var(--se-accent) 12%, transparent); }
        .device-icon { width: 36px; height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .device-name { flex: 1; font-size: 0.88rem; font-weight: 500; }
        .device-vol { font-size: 0.75rem; color: var(--se-text2); }
        .active-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--se-accent); }
        .empty { text-align: center; padding: 24px 14px; color: var(--se-text2); font-size: 0.82rem; line-height: 1.5; }
        .loading { text-align: center; padding: 18px; color: var(--se-text2); font-size: 0.8rem; }
      </style>

      <ha-card>
        <!-- Art -->
        <div class="art-wrap">
          <img id="art" src="" alt="" />
          <div class="art-overlay"></div>
          <div class="art-info">
            <div id="dj-badge" class="dj-badge" style="display:none">
              ${icon(MDI.robot, 11)} DJ
            </div>
            <div id="track" class="track">Nothing playing</div>
            <div id="artist" class="artist"></div>
          </div>
          <button id="like" class="like-btn" title="Save to Liked Songs">
            ${icon(MDI.heart, 16)}
          </button>
        </div>

        <!-- Progress -->
        <div id="seek-wrap" class="progress-section">
          <div class="progress-track" id="prog-track">
            <div class="progress-fill" id="prog-fill" style="width:0%"></div>
          </div>
          <div class="times">
            <span id="prog-cur">0:00</span>
            <span id="prog-dur">0:00</span>
          </div>
        </div>

        <!-- Controls -->
        <div class="controls">
          <div class="ctrl-row">
            <button id="shuffle" class="ctrl-btn" title="Shuffle">${icon(MDI.shuffle,20)}</button>
            <button id="prev"    class="ctrl-btn" title="Previous">${icon(MDI.skip_prev,22)}</button>
            <button id="play"    class="play-btn" title="Play/Pause">${icon(MDI.play,26)}</button>
            <button id="next"    class="ctrl-btn" title="Next">${icon(MDI.skip_next,22)}</button>
            <button id="repeat"  class="ctrl-btn" title="Repeat">${icon(MDI.repeat,20)}</button>
          </div>
        </div>

        <!-- Volume -->
        <div id="vol-wrap" class="vol-row">
          <button id="mute" class="vol-icon" title="Mute">${icon(MDI.volume_low,18)}</button>
          <input id="vol" type="range" min="0" max="100" value="50" />
        </div>

        <!-- Tabs -->
        <div class="tabs" id="tabs">
          <button class="tab active" data-tab="player" id="tab-player">
            ${icon(MDI.music,16)}<span>Now Playing</span>
          </button>
          <button class="tab" data-tab="library" id="tab-library">
            ${icon(MDI.playlist,16)}<span>Library</span>
          </button>
          <button class="tab" data-tab="search" id="tab-search">
            ${icon(MDI.magnify,16)}<span>Search</span>
          </button>
          <button class="tab" data-tab="devices" id="tab-devices">
            ${icon(MDI.cast,16)}<span>Devices</span>
          </button>
        </div>

        <!-- Panel content -->
        <div class="panel" id="panel"></div>
      </ha-card>
    `;

    this._bindStaticEvents();
    this._rendered = true;
  }

  _bindStaticEvents() {
    const s = this.shadowRoot;
    const eid = () => this._config.entity;

    s.getElementById("play").addEventListener("click", () => {
      this.call(this._playing ? "media_player.media_pause" : "media_player.media_play", { entity_id: eid() });
    });
    s.getElementById("prev").addEventListener("click", () =>
      this.call("media_player.media_previous_track", { entity_id: eid() }));
    s.getElementById("next").addEventListener("click", () =>
      this.call("media_player.media_next_track", { entity_id: eid() }));
    s.getElementById("shuffle").addEventListener("click", () =>
      this.call("media_player.shuffle_set", { entity_id: eid(), shuffle: !this._shuffle }));
    s.getElementById("repeat").addEventListener("click", () => {
      const modes = ["off", "all", "one"];
      this.call("media_player.repeat_set", { entity_id: eid(), repeat: modes[(modes.indexOf(this._repeat) + 1) % 3] });
    });
    s.getElementById("like").addEventListener("click", () => {
      if (this._trackId) this.spotify("save_track", { track_id: [this._trackId] });
    });
    s.getElementById("mute").addEventListener("click", () =>
      this.call("media_player.volume_mute", { entity_id: eid(), is_volume_muted: !this._attr.is_volume_muted }));
    s.getElementById("vol").addEventListener("input", debounce((e) =>
      this.call("media_player.volume_set", { entity_id: eid(), volume_level: e.target.value / 100 }), 180));

    s.getElementById("prog-track").addEventListener("click", (e) => {
      if (!this._config.show_seek || !this._durMs) return;
      const r = e.currentTarget.getBoundingClientRect();
      this.call("media_player.media_seek", { entity_id: eid(), seek_position: ((e.clientX - r.left) / r.width) * this._durMs / 1000 });
    });

    s.querySelectorAll(".tab").forEach(t => {
      t.addEventListener("click", () => {
        this._tab = t.dataset.tab;
        s.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
        if (this._tab === "library" && this._libraryItems === null && this._libraryStack.length === 0) {
          this._libraryItems = "root";
        }
        this._renderPanel();
      });
    });
  }

  _onHass() {
    if (!this._rendered) return;
    this._syncControls();
    this._syncProgress();
    this._renderPanel();
  }

  _syncControls() {
    const s = this.shadowRoot;

    const art = s.getElementById("art");
    if (art && art.src !== this._art) art.src = this._art;
    s.getElementById("track").textContent = this._title;
    s.getElementById("artist").textContent = this._artist;
    s.getElementById("dj-badge").style.display = this._isDJ ? "inline-flex" : "none";

    const playBtn = s.getElementById("play");
    if (playBtn) {
      playBtn.innerHTML = icon(this._playing ? MDI.pause : MDI.play, 26);
    }
    s.getElementById("shuffle")?.classList.toggle("active", this._shuffle);
    const rb = s.getElementById("repeat");
    if (rb) {
      rb.classList.toggle("active", this._repeat !== "off");
      rb.innerHTML = icon(this._repeat === "one" ? MDI.repeat_one : MDI.repeat, 20);
    }

    const vol = s.getElementById("vol");
    if (vol && !vol.matches(":active")) vol.value = this._vol;

    // Show/hide optional sections
    s.getElementById("seek-wrap").style.display = this._config.show_seek ? "" : "none";
    s.getElementById("vol-wrap").style.display = this._config.show_volume ? "" : "none";

    const show = { shuffle: "show_shuffle", repeat: "show_repeat" };
    for (const [id, cfg] of Object.entries(show)) {
      const el = s.getElementById(id);
      if (el) el.style.visibility = this._config[cfg] !== false ? "visible" : "hidden";
    }

    // Tab visibility
    const tabs = { library: "show_library", search: "show_search", devices: "show_devices" };
    for (const [id, cfg] of Object.entries(tabs)) {
      s.getElementById(`tab-${id}`).style.display = this._config[cfg] !== false ? "" : "none";
    }
  }

  _syncProgress() {
    this._localProg = this._progMs;
    this._localProgTs = Date.now();
    if (this._playing) {
      if (!this._progTimer) {
        this._progTimer = setInterval(() => this._tickProg(), 500);
      }
    } else {
      clearInterval(this._progTimer);
      this._progTimer = null;
      this._updateProgBar(this._progMs);
    }
  }

  _tickProg() {
    const now = Date.now();
    this._localProg = Math.min(this._localProg + (now - this._localProgTs), this._durMs || 0);
    this._localProgTs = now;
    this._updateProgBar(this._localProg);
  }

  _updateProgBar(ms) {
    const s = this.shadowRoot;
    const pct = this._durMs ? (ms / this._durMs) * 100 : 0;
    s.getElementById("prog-fill")?.style.setProperty("width", `${pct}%`);
    s.getElementById("prog-cur").textContent = fmt(ms);
    s.getElementById("prog-dur").textContent = fmt(this._durMs);
  }

  _renderPanel() {
    const panel = this.shadowRoot.getElementById("panel");
    if (!panel) return;
    if (this._tab === "player")  { panel.innerHTML = this._playerHtml(); this._bindPlayerEvents(); }
    if (this._tab === "library") { panel.innerHTML = this._libraryHtml(); this._bindLibraryEvents(); }
    if (this._tab === "search")  { panel.innerHTML = this._searchHtml();  this._bindSearchEvents(); }
    if (this._tab === "devices") { panel.innerHTML = this._devicesHtml(); this._bindDeviceEvents(); }
  }

  // ── Player tab ──────────────────────────────────────────────────────────

  _playerHtml() {
    if (!this._config.show_dj) return `<div style="height:6px"></div>`;
    return `
      <div class="dj-panel">
        <div class="dj-label">${icon(MDI.robot, 13)} Spotify DJ</div>
        <div class="dj-actions">
          <button class="dj-btn dj-btn-primary" id="dj-start">
            ${icon(MDI.play, 14)} Start DJ
          </button>
        </div>
        <!-- Tap to skip section, hold to open request -->
        <button class="dj-skip-hold" id="dj-skip-hold" title="Tap: skip section · Hold: make a request">
          <div style="display:flex;align-items:center;gap:8px;color:var(--se-text)">
            ${icon(MDI.skip_next, 18)}
            <span style="font-size:0.82rem;font-weight:600">Skip Section</span>
          </div>
          <span class="hint">Tap to skip<br>Hold to request</span>
        </button>
        <div id="dj-request-wrap" style="display:none" class="dj-request-row">
          <input id="dj-req-input" class="dj-request-input" placeholder="Request something…" />
          <button id="dj-req-btn" class="dj-request-btn">${icon(MDI.microphone, 14)}</button>
        </div>
      </div>
    `;
  }

  _bindPlayerEvents() {
    const s = this.shadowRoot;
    s.getElementById("dj-start")?.addEventListener("click", () => this.spotify("start_dj"));

    // Tap = skip section, hold (500ms) = show request input
    const skipHold = s.getElementById("dj-skip-hold");
    if (!skipHold) return;

    skipHold.addEventListener("pointerdown", () => {
      this._djHoldActive = false;
      this._djHoldTimer = setTimeout(() => {
        this._djHoldActive = true;
        const wrap = s.getElementById("dj-request-wrap");
        if (wrap) {
          wrap.style.display = "flex";
          s.getElementById("dj-req-input")?.focus();
        }
      }, 500);
    });

    skipHold.addEventListener("pointerup", () => {
      clearTimeout(this._djHoldTimer);
      if (!this._djHoldActive) {
        this.spotify("dj_next_section");
      }
    });

    skipHold.addEventListener("pointerleave", () => clearTimeout(this._djHoldTimer));

    s.getElementById("dj-req-btn")?.addEventListener("click", () => {
      const val = s.getElementById("dj-req-input")?.value?.trim();
      if (val) {
        this.spotify("dj_request", { request_text: val });
        s.getElementById("dj-req-input").value = "";
        s.getElementById("dj-request-wrap").style.display = "none";
      }
    });

    s.getElementById("dj-req-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") s.getElementById("dj-req-btn")?.click();
      if (e.key === "Escape") {
        s.getElementById("dj-request-wrap").style.display = "none";
      }
    });
  }

  // ── Library tab ─────────────────────────────────────────────────────────

  _libraryHtml() {
    if (this._libraryItems === null || this._libraryItems === "root") {
      // Root menu
      const roots = [
        ["spotify://category/playlists",       "Playlists",       MDI.playlist, true],
        ["spotify://category/liked_songs",     "Liked Songs",     MDI.heart,    false],
        ["spotify://category/recently_played", "Recently Played", MDI.queue,    false],
        ["spotify://category/top_tracks",      "Top Tracks",      MDI.music,    false],
        ["spotify://category/top_artists",     "Top Artists",     MDI.microphone, true],
        ["spotify://category/new_releases",    "New Releases",    MDI.music,    true],
        ["spotify://category/featured",        "Featured",        MDI.music,    true],
      ];
      return roots.map(([id, title, ico, expand]) => `
        <div class="item" data-id="${id}" data-expand="${expand}" data-title="${title}">
          <div class="thumb-placeholder">${icon(ico, 18)}</div>
          <div class="item-info"><div class="item-title">${title}</div></div>
          ${icon(MDI.chevron_right, 16)}
        </div>
      `).join("");
    }

    if (this._libraryItems === "loading") {
      return `<div class="loading">Loading…</div>`;
    }

    const crumbs = [
      `<button class="crumb" data-nav="-1">${icon(MDI.home, 12)} Library</button>`,
      ...this._libraryStack.map((p, i) =>
        `<span class="crumb-sep">${icon(MDI.chevron_right, 10)}</span>
         <button class="crumb ${i === this._libraryStack.length - 1 ? "active" : ""}" data-nav="${i}">${p.title}</button>`
      ),
    ].join("");

    const items = (this._libraryItems || []).map(item => {
      const thumb = item.thumbnail
        ? `<img class="thumb${item.media_class === "artist" ? " thumb-round" : ""}" src="${item.thumbnail}" />`
        : `<div class="thumb-placeholder">${icon(MDI.music, 16)}</div>`;
      const queue_btn = item.can_play && !item.can_expand
        ? `<button class="item-action" data-queue="${item.media_content_id}" title="Add to queue">${icon(MDI.queue, 14)}</button>`
        : item.can_expand ? icon(MDI.chevron_right, 16) : "";
      return `
        <div class="item"
          data-id="${item.media_content_id}"
          data-expand="${item.can_expand}"
          data-play="${item.can_play}"
          data-title="${(item.title || "").replace(/"/g, "&quot;")}">
          ${thumb}
          <div class="item-info">
            <div class="item-title">${item.title || ""}</div>
            ${item.media_class ? `<div class="item-sub">${item.media_class}</div>` : ""}
          </div>
          ${queue_btn}
        </div>
      `;
    }).join("") || `<div class="empty">Nothing here.</div>`;

    return `<div class="breadcrumb">${crumbs}</div>${items}`;
  }

  _bindLibraryEvents() {
    const s = this.shadowRoot;

    s.querySelectorAll("[data-queue]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        this.spotify("add_to_queue", { track_uri: btn.dataset.queue });
      });
    });

    s.querySelectorAll(".item[data-id]").forEach(el => {
      el.addEventListener("click", async () => {
        const { id, expand, play, title } = el.dataset;
        if (expand === "true") {
          this._libraryStack.push({ title, id });
          this._libraryItems = "loading";
          this._renderPanel();
          try {
            const r = await this._hass.callWS({
              type: "media_player/browse_media",
              entity_id: this._config.entity,
              media_content_id: id,
              media_content_type: "music",
            });
            this._libraryItems = r.children || [];
          } catch {
            this._libraryItems = [];
          }
          this._renderPanel();
        } else if (play === "true") {
          this.call("media_player.play_media", {
            entity_id: this._config.entity,
            media_content_id: id,
            media_content_type: "music",
          });
        }
      });
    });

    s.querySelectorAll(".crumb[data-nav]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const nav = parseInt(btn.dataset.nav);
        if (nav === -1) {
          this._libraryStack = [];
          this._libraryItems = "root";
          this._renderPanel();
          return;
        }
        const target = this._libraryStack[nav];
        this._libraryStack = this._libraryStack.slice(0, nav);
        this._libraryItems = "loading";
        this._renderPanel();
        try {
          const r = await this._hass.callWS({
            type: "media_player/browse_media",
            entity_id: this._config.entity,
            media_content_id: target.id,
            media_content_type: "music",
          });
          this._libraryItems = r.children || [];
        } catch {
          this._libraryItems = [];
        }
        this._renderPanel();
      });
    });
  }

  // ── Search tab ──────────────────────────────────────────────────────────

  _searchHtml() {
    let results = "";
    if (this._searchResults) {
      const r = this._searchResults;
      const track = t => `
        <div class="item" data-play="${t.uri}">
          <img class="thumb" src="${t.album?.images?.[0]?.url || ""}" />
          <div class="item-info">
            <div class="item-title">${t.name}</div>
            <div class="item-sub">${(t.artists || []).map(a => a.name).join(", ")}</div>
          </div>
          <button class="item-action" data-queue="${t.uri}" title="Queue">${icon(MDI.queue, 14)}</button>
        </div>`;
      const album = a => `
        <div class="item" data-play="${a.uri}">
          <img class="thumb" src="${a.images?.[0]?.url || ""}" />
          <div class="item-info">
            <div class="item-title">${a.name}</div>
            <div class="item-sub">${(a.artists || []).map(x => x.name).join(", ")}</div>
          </div>
        </div>`;
      const artist = a => `
        <div class="item" data-play="${a.uri}">
          <img class="thumb thumb-round" src="${a.images?.[0]?.url || ""}" />
          <div class="item-info">
            <div class="item-title">${a.name}</div>
            <div class="item-sub">Artist</div>
          </div>
        </div>`;
      const playlist = p => `
        <div class="item" data-play="${p.uri}">
          <img class="thumb" src="${p.images?.[0]?.url || ""}" />
          <div class="item-info">
            <div class="item-title">${p.name}</div>
            <div class="item-sub">Playlist · ${p.owner?.display_name || ""}</div>
          </div>
        </div>`;

      if (r.tracks?.items?.length)    results += `<div class="section-label">Tracks</div>` + r.tracks.items.slice(0,5).map(track).join("");
      if (r.albums?.items?.length)    results += `<div class="section-label">Albums</div>` + r.albums.items.slice(0,3).map(album).join("");
      if (r.artists?.items?.length)   results += `<div class="section-label">Artists</div>` + r.artists.items.slice(0,3).map(artist).join("");
      if (r.playlists?.items?.length) results += `<div class="section-label">Playlists</div>` + r.playlists.items.slice(0,3).map(playlist).join("");
      if (!results) results = `<div class="empty">No results found.</div>`;
    }
    return `
      <div class="search-bar">
        <input id="search-in" class="search-input" placeholder="Search Spotify…" value="${this._searchQuery}" />
        <button id="search-go" class="search-go">${icon(MDI.magnify, 16)}</button>
      </div>
      <div id="search-results">${results}</div>
    `;
  }

  _bindSearchEvents() {
    const s = this.shadowRoot;
    const doSearch = async () => {
      const q = s.getElementById("search-in")?.value?.trim();
      if (!q) return;
      this._searchQuery = q;
      s.getElementById("search-results").innerHTML = `<div class="loading">Searching…</div>`;
      try {
        const resp = await fetch(
          `/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`,
          { headers: { Authorization: `Bearer ${this._hass.auth.data.access_token}` } }
        );
        this._searchResults = resp.ok ? await resp.json() : null;
      } catch { this._searchResults = null; }
      this._renderPanel();
    };
    s.getElementById("search-go")?.addEventListener("click", doSearch);
    s.getElementById("search-in")?.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });

    s.querySelectorAll("[data-play]").forEach(el => {
      el.addEventListener("click", e => {
        if (e.target.closest("[data-queue]")) return;
        this.call("media_player.play_media", {
          entity_id: this._config.entity,
          media_content_id: el.dataset.play,
          media_content_type: "music",
        });
      });
    });
    s.querySelectorAll("[data-queue]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        this.spotify("add_to_queue", { track_uri: btn.dataset.queue });
      });
    });
  }

  // ── Devices tab ─────────────────────────────────────────────────────────

  _devicesHtml() {
    if (!this._devices.length)
      return `<div class="empty">No Spotify Connect devices found.<br>Open Spotify on a device to see it here.</div>`;

    const typeIcon = (t) => ({
      Computer: MDI.music, Smartphone: MDI.music, Speaker: MDI.cast,
      TV: MDI.cast, CastAudio: MDI.cast, GameConsole: MDI.music,
    }[t] || MDI.cast);

    return this._devices.map(d => `
      <div class="device-item${d.id === this._devId ? " active" : ""}" data-id="${d.id}">
        <div class="device-icon">${icon(typeIcon(d.type), 20)}</div>
        <div class="device-name">${d.name}</div>
        ${d.volume_percent != null ? `<span class="device-vol">${d.volume_percent}%</span>` : ""}
        ${d.id === this._devId ? `<div class="active-dot"></div>` : ""}
      </div>
    `).join("");
  }

  _bindDeviceEvents() {
    this.shadowRoot.querySelectorAll(".device-item[data-id]").forEach(el => {
      el.addEventListener("click", () => this.spotify("transfer_playback", { device_id: el.dataset.id }));
    });
  }
}

customElements.define("spotify-enhanced-card", SpotifyEnhancedCard);

// ─── Mini Card ───────────────────────────────────────────────────────────────

class SpotifyMiniCard extends SpotifyBase {
  static getStubConfig() { return { entity: "media_player.spotify_enhanced", show_volume: true }; }

  setConfig(config) {
    this._config = { show_volume: true, ...config };
    this._build();
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        ${sharedCSS(this._config.accent_color)}
        ha-card {
          display: flex; align-items: center; padding: 10px 12px; gap: 10px;
        }
        img { width: 46px; height: 46px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: var(--se-bg2); }
        .info { flex: 1; min-width: 0; }
        .t { font-size: 0.87rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .a { font-size: 0.73rem; color: var(--se-text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
        .vol-row { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
        input { width: 80px; height: 3px; }
        .ctrls { display: flex; align-items: center; gap: 2px; }
        .cb { width: 32px; height: 32px; border-radius: 50%; }
        .pb { width: 38px; height: 38px; border-radius: 50%; background: var(--se-text) !important; color: var(--se-bg) !important; }
        .pb:hover { background: var(--se-accent) !important; }
      </style>
      <ha-card>
        <img id="art" src="" alt="" />
        <div class="info">
          <div class="t" id="t">Nothing playing</div>
          <div class="a" id="a"></div>
          <div id="vr" class="vol-row">
            <button id="mute" class="cb">${icon(MDI.volume_low, 14)}</button>
            <input id="vol" type="range" min="0" max="100" />
          </div>
        </div>
        <div class="ctrls">
          <button class="cb" id="prev">${icon(MDI.skip_prev, 18)}</button>
          <button class="pb" id="play">${icon(MDI.play, 22)}</button>
          <button class="cb" id="next">${icon(MDI.skip_next, 18)}</button>
        </div>
      </ha-card>
    `;
    const s = this.shadowRoot;
    const eid = () => this._config.entity;
    s.getElementById("play").addEventListener("click", () =>
      this.call(this._playing ? "media_player.media_pause" : "media_player.media_play", { entity_id: eid() }));
    s.getElementById("prev").addEventListener("click", () =>
      this.call("media_player.media_previous_track", { entity_id: eid() }));
    s.getElementById("next").addEventListener("click", () =>
      this.call("media_player.media_next_track", { entity_id: eid() }));
    s.getElementById("mute").addEventListener("click", () =>
      this.call("media_player.volume_mute", { entity_id: eid(), is_volume_muted: !this._attr.is_volume_muted }));
    s.getElementById("vol").addEventListener("input", debounce(e =>
      this.call("media_player.volume_set", { entity_id: eid(), volume_level: e.target.value / 100 }), 180));
  }

  _onHass() {
    const s = this.shadowRoot;
    if (!s.getElementById("art")) return;
    s.getElementById("art").src = this._art;
    s.getElementById("t").textContent = this._title;
    s.getElementById("a").textContent = this._artist;
    s.getElementById("play").innerHTML = icon(this._playing ? MDI.pause : MDI.play, 22);
    const vol = s.getElementById("vol");
    if (vol && !vol.matches(":active")) vol.value = this._vol;
    s.getElementById("vr").style.display = this._config.show_volume ? "flex" : "none";
  }
}

customElements.define("spotify-mini-card", SpotifyMiniCard);

// ─── Device Card ─────────────────────────────────────────────────────────────

class SpotifyDeviceCard extends SpotifyBase {
  static getStubConfig() { return { entity: "media_player.spotify_enhanced", title: "Spotify Devices" }; }

  setConfig(config) {
    this._config = { title: "Spotify Devices", ...config };
    this._build();
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        ${sharedCSS(this._config.accent_color)}
        .hdr { padding: 14px 14px 6px; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 6px; color: var(--se-text2); }
        .device-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; transition: background 0.12s; }
        .device-item:hover { background: var(--se-bg2); }
        .device-item.active { background: color-mix(in srgb, var(--se-accent) 12%, transparent); }
        .di { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dn { flex: 1; font-size: 0.88rem; font-weight: 500; }
        .dv { font-size: 0.75rem; color: var(--se-text2); }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--se-accent); }
        .pill { background: var(--se-accent); color: var(--card-background-color,#000); font-size: 0.62rem; font-weight: 700; padding: 2px 7px; border-radius: 20px; text-transform: uppercase; }
        .empty { text-align: center; padding: 24px; color: var(--se-text2); font-size: 0.82rem; }
      </style>
      <ha-card>
        <div class="hdr">${icon(MDI.cast, 16)} <span>${this._config.title}</span></div>
        <div id="list"><div class="empty">Loading…</div></div>
      </ha-card>
    `;
  }

  _onHass() {
    const list = this.shadowRoot.getElementById("list");
    if (!list) return;
    if (!this._devices.length) {
      list.innerHTML = `<div class="empty">No devices found.<br>Open Spotify on a device to see it here.</div>`;
      return;
    }
    const typeIcon = t => ({ Computer: MDI.music, Smartphone: MDI.music, Speaker: MDI.cast, TV: MDI.cast }[t] || MDI.cast);
    list.innerHTML = this._devices.map(d => `
      <div class="device-item${d.id === this._devId ? " active" : ""}" data-id="${d.id}">
        <div class="di">${icon(typeIcon(d.type), 20)}</div>
        <div class="dn">${d.name}</div>
        ${d.volume_percent != null ? `<span class="dv">${d.volume_percent}%</span>` : ""}
        ${d.id === this._devId ? `<span class="pill">Playing</span>` : ""}
      </div>
    `).join("");
    list.querySelectorAll(".device-item[data-id]").forEach(el =>
      el.addEventListener("click", () => this.spotify("transfer_playback", { device_id: el.dataset.id }))
    );
  }
}

customElements.define("spotify-device-card", SpotifyDeviceCard);

// ─── Visual Editor ────────────────────────────────────────────────────────────

class SpotifyEnhancedCardEditor extends HTMLElement {
  set hass(h) { this._hass = h; }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  _render() {
    if (!this._config) return;
    const c = this._config;

    const toggle = (key, label) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--divider-color,#eee)">
        <span style="font-size:0.9rem">${label}</span>
        <ha-switch ${c[key] !== false ? "checked" : ""} data-key="${key}"></ha-switch>
      </div>
    `;

    this.innerHTML = `
      <style>
        :host { display: block; padding: 4px 0; }
        ha-entity-picker, ha-textfield { display: block; margin-bottom: 12px; }
        h4 { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
             color: var(--secondary-text-color); margin: 14px 0 4px; }
      </style>
      <ha-entity-picker
        .hass="${this._hass}"
        .value="${c.entity || ""}"
        .includeDomains="${["media_player"]}"
        label="Spotify Media Player Entity"
      ></ha-entity-picker>

      <ha-textfield
        label="Accent colour (CSS value, optional)"
        .value="${c.accent_color || ""}"
        data-key="accent_color"
        placeholder="var(--primary-color)"
        helper="Leave blank to follow your HA theme"
      ></ha-textfield>

      <h4>Controls</h4>
      ${toggle("show_seek",    "Show seek bar")}
      ${toggle("show_volume",  "Show volume")}
      ${toggle("show_shuffle", "Show shuffle button")}
      ${toggle("show_repeat",  "Show repeat button")}

      <h4>Tabs</h4>
      ${toggle("show_library", "Library tab")}
      ${toggle("show_search",  "Search tab")}
      ${toggle("show_devices", "Devices tab")}
      ${toggle("show_dj",      "Spotify DJ panel")}
    `;

    this.querySelectorAll("ha-switch[data-key]").forEach(sw => {
      sw.addEventListener("change", () => this._update(sw.dataset.key, sw.checked));
    });
    this.querySelectorAll("ha-textfield[data-key]").forEach(tf => {
      tf.addEventListener("change", e => this._update(tf.dataset.key, e.target.value));
    });
    this.querySelector("ha-entity-picker")?.addEventListener("value-changed", e => {
      this._update("entity", e.detail.value);
    });
  }

  _update(key, value) {
    this._config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }
}

customElements.define("spotify-enhanced-card-editor", SpotifyEnhancedCardEditor);

// ─── Card registration ────────────────────────────────────────────────────────

window.customCards = window.customCards || [];
window.customCards.push(
  { type: "spotify-enhanced-card", name: "Spotify Enhanced — Full Deck",    description: "Full player with library, search, devices and DJ controls.", preview: true },
  { type: "spotify-mini-card",     name: "Spotify Enhanced — Mini Player",  description: "Compact single-row playback controls.", preview: true },
  { type: "spotify-device-card",   name: "Spotify Enhanced — Device Picker", description: "Browse and switch Spotify Connect devices.", preview: true }
);

console.info(
  `%c SPOTIFY ENHANCED %c v${VERSION} `,
  "color:#fff;background:#1DB954;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px",
  "color:#1DB954;background:#111;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0"
);
