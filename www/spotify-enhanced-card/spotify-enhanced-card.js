/**
 * Spotify Enhanced Card  v1.1.6
 * All 20 issues addressed.
 */
const VERSION = "1.1.6";

const fmt = (s) => {
  if (s == null || isNaN(s)) return "0:00";
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t/3600), m = Math.floor((t%3600)/60), ss = t%60;
  const p = v => String(v).padStart(2,"0");
  return h ? `${p(h)}:${p(m)}:${p(ss)}` : `${p(m)}:${p(ss)}`;
};
const clamp   = (v,lo,hi) => Math.max(lo, Math.min(hi, v));
const round2  = n => Math.round(n * 100) / 100;
const debounce = (fn,ms) => { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

// ── MDI icon names ────────────────────────────────────────────────────────────
const I = {
  play:"mdi:play", pause:"mdi:pause", next:"mdi:skip-next", prev:"mdi:skip-previous",
  shuffle:"mdi:shuffle", shuffle_off:"mdi:shuffle-disabled",
  repeat:"mdi:repeat", repeat_one:"mdi:repeat-once", repeat_off:"mdi:repeat-off",
  mic_on:"mdi:microphone-variant", mic_off:"mdi:microphone-variant-off",
  heart:"mdi:cards-heart", heart_out:"mdi:cards-heart-outline",
  vol_off:"mdi:volume-off", vol_lo:"mdi:volume-low", vol_hi:"mdi:volume-high",
  cast:"mdi:cast", search:"mdi:magnify", queue:"mdi:playlist-music",
  library:"mdi:music-box-multiple", close:"mdi:close", dots:"mdi:dots-vertical",
  add_q:"mdi:playlist-plus", delete:"mdi:delete", chev_r:"mdi:chevron-right",
  home:"mdi:home", refresh:"mdi:refresh", play_box:"mdi:play-box-multiple",
  history:"mdi:history", chart:"mdi:chart-bar", compass:"mdi:compass",
  account:"mdi:account-music", new_box:"mdi:new-box", playlist_play:"mdi:playlist-play",
};

// ha-icon-button wrapper — properly sized, centred
const Btn = (icon, id="", title="", cls="") =>
  `<ha-icon-button id="${id}" title="${title}" label="${title}" class="ctrl ${cls}">` +
  `<ha-icon icon="${icon}"></ha-icon></ha-icon-button>`;

const Ico = (icon, size=20) =>
  `<ha-icon icon="${icon}" style="--mdc-icon-size:${size}px;display:inline-flex;align-items:center;justify-content:center"></ha-icon>`;

// ── Device stabiliser ────────────────────────────────────────────────────────
const _devOrder = [];
function stabilise(devs) {
  if (!devs?.length) { _devOrder.length=0; return []; }
  const ids = new Set(devs.map(d=>d.id));
  for (let i=_devOrder.length-1;i>=0;i--) if (!ids.has(_devOrder[i])) _devOrder.splice(i,1);
  for (const d of devs) if (!_devOrder.includes(d.id)) _devOrder.push(d.id);
  const m = Object.fromEntries(devs.map(d=>[d.id,d]));
  return _devOrder.map(id=>m[id]).filter(Boolean);
}

// ── Liked tracker ─────────────────────────────────────────────────────────────
const _liked=new Set(), _likedP=new Set();
async function checkLiked(id,hass) {
  if (!id||_likedP.has(id)) return;
  _likedP.add(id);
  try {
    const r=await fetch(`/api/spotify_enhanced/liked?ids=${id}`,{headers:{Authorization:`Bearer ${hass?.auth?.data?.access_token}`}});
    if (r.ok){const d=await r.json();if(d?.[0])_liked.add(id);else _liked.delete(id);}
  } catch{} finally{_likedP.delete(id);}
}
function toggleLiked(id,hass) {
  if(!id) return false;
  if(_liked.has(id)){_liked.delete(id);hass?.callService("spotify_enhanced","remove_track",{track_id:[id]});}
  else{_liked.add(id);hass?.callService("spotify_enhanced","save_track",{track_id:[id]});}
  return _liked.has(id);
}

// ── Progress tracker ──────────────────────────────────────────────────────────
// Uses HA's getCurrentProgress formula exactly, with latency compensation
const LYRICS_LATENCY_MS = 300; // account for UI update delay

class ProgressTracker {
  constructor() {
    this._pos=0;this._dur=0;this._updatedAt=0;this._playing=false;
    this._raf=null;this._drag=false;this._dragPct=0;
    this.fillEl=null;this.thumbEl=null;this.curEl=null;this.durEl=null;
  }
  sync(so) {
    if(this._drag) return;
    const a=so?.attributes??{};
    this._pos=a.media_position??0;
    this._dur=a.media_duration??0;
    this._playing=so?.state==="playing";
    this._updatedAt=a.media_position_updated_at
      ?new Date(a.media_position_updated_at).getTime():Date.now();
    if(this._playing){if(!this._raf)this._raf=requestAnimationFrame(()=>this._tick());}
    else{cancelAnimationFrame(this._raf);this._raf=null;this._paint(this._pos);}
  }
  get current() {
    return this._playing
      ?clamp(this._pos+(Date.now()-this._updatedAt)/1000,0,this._dur||Infinity)
      :this._pos;
  }
  // current + latency compensation for lyrics highlighting
  get currentForLyrics() {
    return this.current + LYRICS_LATENCY_MS/1000;
  }
  _tick(){
    this._raf=null;if(!this._playing||this._drag)return;
    this._paint(this.current);
    this._raf=requestAnimationFrame(()=>this._tick());
  }
  _paint(s){
    const p=this._dur?clamp((s/this._dur)*100,0,100):0;
    if(this.fillEl) this.fillEl.style.width=`${p}%`;
    if(this.thumbEl)this.thumbEl.style.left=`${p}%`;
    if(this.curEl)  this.curEl.textContent=fmt(s);
    if(this.durEl)  this.durEl.textContent=fmt(this._dur);
  }
  startDrag(p){this._drag=true;this._dragPct=clamp(p,0,1);this._paint(this._dragPct*this._dur);}
  moveDrag(p){if(!this._drag)return;this._dragPct=clamp(p,0,1);this._paint(this._dragPct*this._dur);}
  endDrag(){
    this._drag=false;this._pos=this._dragPct*this._dur;this._updatedAt=Date.now();
    if(this._playing)this._raf=requestAnimationFrame(()=>this._tick());
    return this._pos;
  }
  destroy(){cancelAnimationFrame(this._raf);this._raf=null;}
}

// ── Volume drag ───────────────────────────────────────────────────────────────
class VolDrag {
  constructor(track,fill,thumb,cb){
    this._t=track;this._f=fill;this._th=thumb;this._cb=cb;this._p=0;this._drag=false;
    if(!track)return;
    track.addEventListener("pointerdown",e=>{
      this._drag=true;track.setPointerCapture(e.pointerId);this._update(e);
      const mv=e=>this._update(e);
      const up=e=>{this._update(e);this._drag=false;this._cb(this._p);track.removeEventListener("pointermove",mv);track.removeEventListener("pointerup",up);};
      track.addEventListener("pointermove",mv,{passive:true});
      track.addEventListener("pointerup",up,{once:true});
    });
  }
  _update(e){const r=this._t.getBoundingClientRect();this._p=clamp((e.clientX-r.left)/r.width,0,1);this._r();}
  _r(){const w=`${this._p*100}%`;if(this._f)this._f.style.width=w;if(this._th)this._th.style.left=w;}
  sync(p01){if(this._drag)return;this._p=clamp(p01,0,1);this._r();}
}

// ── Marquee ───────────────────────────────────────────────────────────────────
function marqStart(wrap){
  const inner=wrap?.querySelector(".mq");if(!inner)return;
  const ov=inner.scrollWidth-wrap.offsetWidth;
  if(ov<=0){inner.style.animation="none";return;}
  inner.style.setProperty("--d",`-${ov}px`);
  inner.style.setProperty("--t",`${Math.max(4,ov/40)}s`);
  inner.style.animation="mq var(--t) linear infinite";
}
function marqStop(wrap){wrap?.querySelector(".mq")?.style.setProperty("animation","none");}

// ── Base class ────────────────────────────────────────────────────────────────
class Base extends HTMLElement {
  constructor(){super();this.attachShadow({mode:"open"});this._hass=null;this._config={};this._ready=false;}
  set hass(h){const p=this._hass;this._hass=h;if(this._ready)this._update(p);}
  setConfig(c){this._config=c;this._ready=false;this._build();this._ready=true;if(this._hass)this._update(null);}
  get _so()     {return this._hass?.states?.[this._config?.entity];}
  get _a()      {return this._so?.attributes??{};}
  get _state()  {return this._so?.state??"idle";}
  get _playing(){return this._state==="playing";}
  get _title()  {return this._a.media_title??"";}
  get _artist() {return this._a.media_artist??"";}
  get _album()  {return this._a.media_album_name??"";}
  get _art()    {return this._a.entity_picture_local||this._a.entity_picture||"";}
  get _vol()    {return clamp((this._a.volume_level??0)*100,0,100);}
  get _muted()  {return this._a.is_volume_muted??false;}
  get _shuffle(){return this._a.shuffle??false;}
  get _repeat() {return this._a.repeat??"off";}
  get _durSecs(){return this._a.media_duration??0;}
  get _devices(){return this._a.spotify_devices??[];}
  get _devId()  {return this._a.device_id??null;}
  get _trackId(){return this._a.track_id??null;}
  get _ctxUri() {return this._a.context_uri??null;}

  // Colours from sensors — consistent entity ID format
  // Sensor name "Background Color" on device "Spotify Enhanced"
  // → HA slugifies to sensor.spotify_enhanced_background_color
  get _bgColor(){
    return this._hass?.states?.["sensor.spotify_enhanced_background_color"]?.state||"";
  }
  get _fgColor(){
    return this._hass?.states?.["sensor.spotify_enhanced_foreground_color"]?.state||"";
  }

  _call(d,s,data={}){this._hass?.callService(d,s,data);}
  _spotify(s,d={}){this._call("spotify_enhanced",s,d);}
  _mp(s,d={}){this._call("media_player",s,{entity_id:this._config.entity,...d});}
  _hassUrl(url){if(!url)return"";if(url.startsWith("http"))return url;return this._hass?.hassUrl(url)??url;}
  _build(){}
  _update(prev){}
}

// ── Colour helpers ────────────────────────────────────────────────────────────
function applyBg(s,bg,fg,cardH){
  const block=s.getElementById("color-block");
  const noimg=s.getElementById("no-img");
  const grad =s.getElementById("color-gradient");
  const image=s.getElementById("image");
  const player=s.getElementById("player");
  if(block)block.style.backgroundColor=bg||"";
  if(noimg)noimg.style.backgroundColor=bg||"";
  if(image){
    if(bg) image.style.backgroundColor=bg;  // HA does this too — fills before image loads
    if(cardH)image.style.width=`${cardH}px`;
  }
  if(grad){
    grad.style.backgroundImage=bg?`linear-gradient(to right, ${bg}, ${bg}00)`:"";
    if(cardH)grad.style.width=`${cardH}px`;
  }
  if(player)player.style.color=fg||"";
}

function applyBgStandalone(s,bg,fg,art,hassUrl){
  s.getElementById("color-block")?.style.setProperty("background-color",bg||"");
  s.getElementById("no-img")?.style.setProperty("background-color",bg||"");
  const imgEl=s.getElementById("image");
  if(imgEl){
    imgEl.style.backgroundImage=art?`url(${hassUrl(art)})`:"none";
    if(bg)imgEl.style.backgroundColor=bg;
  }
  const grad=s.getElementById("color-gradient");
  if(grad)grad.style.backgroundImage=bg?`linear-gradient(to right, ${bg}, ${bg}00)`:"";
  const bgEl=s.getElementById("bg");
  if(bgEl){bgEl.classList.toggle("no-image",!art);bgEl.classList.remove("off");}
  const inner=s.querySelector(".inner");
  if(inner&&fg)inner.style.color=fg;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes mq{0%{transform:translateX(0)}100%{transform:translateX(var(--d,-50%))}}
*,*::before,*::after{box-sizing:border-box;}

ha-card{overflow:hidden;height:100%;font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif);}

/* Background — verbatim from HA source */
.background{display:flex;position:absolute;top:0;left:0;height:100%;width:100%;transition:filter 0.8s;}
.color-block{background-color:var(--primary-color);transition:background-color 0.8s;width:100%;}
.color-gradient{position:absolute;background-image:linear-gradient(to right,var(--primary-color),transparent);height:100%;right:0;opacity:1;transition:width 0.8s,opacity 0.8s linear 0.8s;}
.image{background-color:var(--primary-color);background-position:center;background-size:cover;background-repeat:no-repeat;position:absolute;right:0;height:100%;opacity:1;transition:width 0.8s,background-image 0.8s,background-color 0.8s,background-size 0.8s,opacity 0.8s linear 0.8s;}
.no-image .image{opacity:0;}
.no-img{background-color:var(--primary-color);background-size:initial;background-repeat:no-repeat;background-position:center center;position:absolute;right:0;height:100%;background-image:url("/static/images/card_media_player_bg.png");width:50%;transition:opacity 0.8s,background-color 0.8s;}
.off .image,.off .color-gradient{opacity:0;transition:opacity 0s,width 0.8s;width:0;}
.unavailable .no-img,.background:not(.off):not(.no-image) .no-img{opacity:0;}
.off.background{filter:grayscale(1);}

/* Player layer */
.player{position:relative;padding:16px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;color:var(--text-primary-color);transition-property:color,padding;transition-duration:0.4s;}
.controls{padding:8px 8px 8px 0;display:flex;justify-content:flex-start;align-items:center;transition:padding,color;transition-duration:0.4s;margin-left:-12px;margin-inline-start:-12px;margin-inline-end:initial;padding-inline-start:0;padding-inline-end:8px;direction:ltr;}
.controls>div{display:flex;align-items:center;}
.controls>.start{flex-grow:1;}
.top-info{display:flex;justify-content:space-between;align-items:center;}
.media-info{text-overflow:ellipsis;white-space:nowrap;overflow:hidden;}
.media-title-text{font-size:1.2em;margin:0 0 4px;}
.title-controls{padding-top:16px;}
.no-image .controls{padding:0;}
.narrow .controls,.no-progress .controls{padding-bottom:0;}
.no-progress.player:not(.no-controls){padding-bottom:0;}

/* ha-icon-button — centred, correct sizes matching HA source */
ha-icon-button{
  --mdc-icon-button-size:44px;
  --mdc-icon-size:28px;
  color:inherit;
  display:inline-flex;align-items:center;justify-content:center;
}
ha-icon-button.pp{--mdc-icon-button-size:56px;--mdc-icon-size:40px;}
ha-icon-button.sm{--mdc-icon-button-size:36px;--mdc-icon-size:20px;}
.narrow ha-icon-button{--mdc-icon-button-size:40px;--mdc-icon-size:26px;}
.narrow ha-icon-button.pp{--mdc-icon-button-size:50px;--mdc-icon-size:36px;}

/* Progress */
.prog-wrap{width:100%;margin-top:4px;}
.prog-bar{position:relative;width:100%;height:4px;background:rgba(200,200,200,0.5);border-radius:2px;cursor:pointer;touch-action:none;transition:height 0.1s;}
.prog-bar:hover,.prog-bar.drag{height:6px;}
.prog-fill{position:absolute;left:0;top:0;height:100%;background:currentColor;border-radius:2px;pointer-events:none;}
.prog-thumb{position:absolute;top:50%;left:0;width:14px;height:14px;border-radius:50%;background:currentColor;transform:translate(-50%,-50%);opacity:0;transition:opacity 0.15s;pointer-events:none;}
.prog-bar:hover .prog-thumb,.prog-bar.drag .prog-thumb{opacity:1;}
.prog-times{display:flex;justify-content:space-between;font-size:0.7em;opacity:0.7;margin-top:2px;}

/* Volume */
.vol-row{display:flex;align-items:center;gap:4px;padding:2px 0 0;}
.vol-track{flex:1;height:4px;background:rgba(200,200,200,0.5);border-radius:2px;cursor:pointer;position:relative;touch-action:none;transition:height 0.1s;}
.vol-track:hover{height:6px;}
.vol-fill{position:absolute;left:0;top:0;height:100%;background:currentColor;border-radius:2px;pointer-events:none;}
.vol-thumb{position:absolute;top:50%;left:0;width:12px;height:12px;border-radius:50%;background:currentColor;transform:translate(-50%,-50%);opacity:0;transition:opacity 0.15s;pointer-events:none;}
.vol-track:hover .vol-thumb{opacity:1;}

/* Marquee */
.mq-wrap{overflow:hidden;white-space:nowrap;}
.mq{display:inline-block;padding-right:32px;}

/* Panels — hidden when closed, overflow:hidden on card prevents bleed */
.backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.52);z-index:10;opacity:0;pointer-events:none;transition:opacity 0.25s;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);}
.backdrop.open{opacity:1;pointer-events:auto;}
.panel{position:absolute;bottom:0;left:0;right:0;z-index:11;display:none;flex-direction:column;overflow:hidden;transform:translateY(100%);transition:transform 0.28s cubic-bezier(0.4,0,0.2,1);will-change:transform;}
.panel.open{display:flex;transform:translateY(0);}
/* Each panel has adaptive bg — set via JS from colour sensors */
.panel-inner{display:flex;flex-direction:column;overflow:hidden;border-radius:14px 14px 0 0;flex:1;}
#panel-search .panel-inner,#panel-queue .panel-inner{max-height:70vh;}
#panel-lib .panel-inner,#panel-lyrics .panel-inner{max-height:80vh;}
#panel-devices .panel-inner{max-height:60vh;}

.ph{display:flex;align-items:center;justify-content:space-between;padding:8px 8px 6px 16px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.1);min-height:48px;}
.pt{font-size:0.76rem;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;opacity:0.6;display:flex;align-items:center;gap:4px;flex:1;overflow:hidden;}
.pb-body{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.15) transparent;}
.pb-body::-webkit-scrollbar{width:3px;}
.pb-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);}

/* Search */
.sbar{display:flex;gap:6px;padding:10px 14px 6px;flex-shrink:0;align-items:center;}
.sinput{flex:1;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.2);border-radius:8px;color:currentColor;padding:8px 10px;font-size:0.88rem;outline:none;transition:border-color 0.15s;font-family:inherit;}
.sinput::placeholder{color:rgba(255,255,255,0.4);}
.sinput:focus{border-color:currentColor;}

/* List items */
.item{display:flex;align-items:center;gap:10px;padding:7px 14px;cursor:pointer;transition:background 0.1s;position:relative;overflow:hidden;}
.item:hover{background:rgba(255,255,255,0.08);}
.item.now{background:rgba(255,255,255,0.12);}
.ithumb{width:42px;height:42px;object-fit:cover;flex-shrink:0;background:rgba(255,255,255,0.1);border-radius:4px;}
.ithumb.circle{border-radius:50%;}
.iph{width:42px;height:42px;border-radius:4px;flex-shrink:0;background:rgba(255,255,255,0.1);display:inline-flex;align-items:center;justify-content:center;opacity:0.6;}
.iinfo{flex:1;min-width:0;}
.ititle{font-size:0.87rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.isub{font-size:0.73rem;opacity:0.65;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.slabel{padding:10px 14px 3px;font-size:0.63rem;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;opacity:0.55;}
.smore{display:block;width:100%;padding:8px;text-align:center;font-size:0.78rem;opacity:0.7;background:transparent;border:none;cursor:pointer;border-top:1px solid rgba(255,255,255,0.08);color:inherit;font-family:inherit;}
.smore:hover{background:rgba(255,255,255,0.07);opacity:1;}
.bc{display:flex;align-items:center;gap:2px;padding:6px 14px 3px;overflow-x:auto;scrollbar-width:none;}
.bc::-webkit-scrollbar{display:none;}
.bcc{font-size:0.75rem;padding:3px 6px;border-radius:6px;opacity:0.6;white-space:nowrap;cursor:pointer;background:none;border:none;color:inherit;font-family:inherit;}
.bcc:hover{background:rgba(255,255,255,0.08);opacity:1;}
.bcc.last{opacity:1;font-weight:600;}
.bcs{opacity:0.3;font-size:0.75rem;}

/* Swipe-to-delete */
.sdel{position:absolute;right:0;top:0;bottom:0;background:#c62828;color:#fff;width:64px;display:flex;align-items:center;justify-content:center;transform:translateX(100%);transition:transform 0.2s;pointer-events:none;}
.ic{display:flex;align-items:center;gap:10px;flex:1;min-width:0;transition:transform 0.2s;}
.item.swiped .sdel{transform:translateX(0);pointer-events:auto;}
.item.swiped .ic{transform:translateX(-64px);}

/* Devices */
.devitem{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background 0.12s;}
.devitem:hover{background:rgba(255,255,255,0.08);}
.devitem.active{background:rgba(255,255,255,0.14);}
.devicon{width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;opacity:0.7;flex-shrink:0;}
.devname{flex:1;font-size:0.9rem;font-weight:500;}
.devvol{font-size:0.74rem;opacity:0.65;}
.devdot{width:8px;height:8px;border-radius:50%;background:currentColor;flex-shrink:0;}

/* Queue now label */
.qnow{padding:8px 14px 3px;font-size:0.63rem;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;opacity:0.55;}

/* Lyrics — adaptive height, no empty space */
.lline{padding:6px 20px;font-size:clamp(0.85rem,2.5vw,1rem);line-height:1.5;opacity:0.35;cursor:pointer;transition:opacity 0.3s,font-size 0.25s,font-weight 0.25s;border-radius:6px;}
.lline.on{opacity:1;font-size:clamp(0.95rem,3vw,1.1rem);font-weight:700;}
.lline.plain{opacity:0.45;cursor:default;}
.lline:hover:not(.plain){background:rgba(255,255,255,0.07);}

.empty{text-align:center;padding:28px 16px;opacity:0.5;font-size:0.85rem;line-height:1.6;}
.loading{text-align:center;padding:22px;opacity:0.5;font-size:0.82rem;}
.play-all-btn{display:block;width:100%;padding:10px 14px;text-align:left;font-size:0.88rem;font-weight:600;background:rgba(255,255,255,0.08);border:none;cursor:pointer;color:inherit;font-family:inherit;display:flex;align-items:center;gap:8px;}
.play-all-btn:hover{background:rgba(255,255,255,0.14);}
`;

// ── MAIN CARD ─────────────────────────────────────────────────────────────────
class SpotifyEnhancedCard extends Base {
  constructor(){
    super();
    this._prog=null;this._vd=null;this._ro=null;
    this._narrow=false;this._cardH=0;
    this._openId=null;
    this._libStack=[];this._srQ="";this._srR=null;this._srX={};
    this._searchFocused=false;this._lyricsData=null;
    this._lastTrack="";this._lastBg="";this._lastFg="";this._lastH=0;
  }

  static getConfigElement(){return document.createElement("spotify-enhanced-card-editor");}
  static getStubConfig(){return{entity:"media_player.spotify_enhanced"};}

  setConfig(c){
    this._config={show_seek:true,show_volume:true,show_shuffle:true,show_repeat:true,...c};
    this._ready=false;this._build();this._ready=true;
    if(this._hass)this._update(null);
  }

  connectedCallback(){this._attachRO();if(this._prog&&this._so)this._prog.sync(this._so);}
  disconnectedCallback(){this._prog?.destroy();this._ro?.disconnect();}

  _build(){
    const s=this.shadowRoot;
    s.innerHTML=`<style>${CSS}</style><ha-card>

<div class="background no-image off" id="bg">
  <div class="color-block" id="color-block"></div>
  <div class="no-img" id="no-img"></div>
  <div class="image" id="image"></div>
  <div class="color-gradient" id="color-gradient"></div>
</div>

<div class="player no-progress" id="player">
  <div class="top-info">
    <div style="display:inline-flex;align-items:center">
      ${Btn(I.search, "btn-search","Search","sm")}
      ${Btn(I.library,"btn-lib",   "Library","sm")}
      ${Btn(I.cast,   "btn-devices","Devices","sm")}
    </div>
    <div style="display:inline-flex;align-items:center">
      ${Btn(I.heart_out,"like-btn",  "Save to Liked Songs","sm")}
      ${Btn(I.mic_on,   "btn-lyrics","Lyrics","sm")}
      ${Btn(I.queue,    "btn-queue", "Queue","sm")}
      ${Btn(I.dots,     "btn-more",  "More info","sm")}
    </div>
  </div>

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
          ${Btn(I.shuffle_off,"shuf-btn","Shuffle","")}
          ${Btn(I.prev,       "prev-btn","Previous","")}
          ${Btn(I.play,       "play-btn","Play/Pause","pp")}
          ${Btn(I.next,       "next-btn","Next","")}
          ${Btn(I.repeat_off, "rep-btn", "Repeat","")}
        </div>
        <div class="end"></div>
      </div>
    </div>
    <div class="prog-wrap" id="prog-wrap">
      <div class="prog-bar" id="prog-bar">
        <div class="prog-fill" id="prog-fill"></div>
        <div class="prog-thumb" id="prog-thumb"></div>
      </div>
      <div class="prog-times"><span id="pcur">0:00</span><span id="pdur">0:00</span></div>
    </div>
    <div class="vol-row" id="vol-row">
      ${Btn(I.vol_lo,"mute-btn","Mute","sm")}
      <div class="vol-track" id="vol-track">
        <div class="vol-fill" id="vol-fill"></div>
        <div class="vol-thumb" id="vol-thumb"></div>
      </div>
    </div>
  </div>
</div>

<div class="backdrop" id="bd"></div>

<div class="panel" id="panel-search">
  <div class="panel-inner" id="panel-search-inner">
    <div class="ph"><div class="pt">${Ico(I.search,16)}&nbsp;Search</div>${Btn(I.close,"cls-search","Close","sm")}</div>
    <div class="sbar"><input class="sinput" id="si" placeholder="Search Spotify…" autocomplete="off"/>${Btn(I.search,"sg","Search","sm")}</div>
    <div class="pb-body" id="sb"></div>
  </div>
</div>

<div class="panel" id="panel-lib">
  <div class="panel-inner" id="panel-lib-inner">
    <div class="ph"><div class="pt" id="lib-title">${Ico(I.library,16)}&nbsp;Library</div>${Btn(I.close,"cls-lib","Close","sm")}</div>
    <div class="pb-body" id="lb"></div>
  </div>
</div>

<div class="panel" id="panel-devices">
  <div class="panel-inner" id="panel-devices-inner">
    <div class="ph"><div class="pt">${Ico(I.cast,16)}&nbsp;Devices</div>${Btn(I.close,"cls-devices","Close","sm")}</div>
    <div class="pb-body" id="db"></div>
  </div>
</div>

<div class="panel" id="panel-queue">
  <div class="panel-inner" id="panel-queue-inner">
    <div class="ph"><div class="pt">${Ico(I.queue,16)}&nbsp;Queue</div>${Btn(I.close,"cls-queue","Close","sm")}</div>
    <div class="pb-body" id="qb"><div class="loading">Loading…</div></div>
  </div>
</div>

<div class="panel" id="panel-lyrics">
  <div class="panel-inner" id="panel-lyrics-inner">
    <div class="ph"><div class="pt">${Ico(I.mic_on,16)}&nbsp;Lyrics</div>${Btn(I.close,"cls-lyrics","Close","sm")}</div>
    <div class="pb-body" id="lyb"><div class="loading">Loading…</div></div>
  </div>
</div>

</ha-card>`;

    this._prog=new ProgressTracker();
    this._prog.fillEl =s.getElementById("prog-fill");
    this._prog.thumbEl=s.getElementById("prog-thumb");
    this._prog.curEl  =s.getElementById("pcur");
    this._prog.durEl  =s.getElementById("pdur");

    this._vd=new VolDrag(
      s.getElementById("vol-track"),s.getElementById("vol-fill"),s.getElementById("vol-thumb"),
      p=>this._mp("volume_set",{volume_level:round2(p)})
    );
    this._bindSeek();
    this._bindButtons();
    this._attachRO();
  }

  _attachRO(){
    const card=this.shadowRoot?.querySelector("ha-card");if(!card)return;
    if(!this._ro)this._ro=new ResizeObserver(debounce(()=>this._measure(),250));
    this._ro.observe(card);
  }

  _measure(){
    const card=this.shadowRoot?.querySelector("ha-card");if(!card)return;
    this._narrow=card.offsetWidth<350;
    this._cardH=card.offsetHeight;
    this.shadowRoot.getElementById("player")?.classList.toggle("narrow",this._narrow);
    applyBg(this.shadowRoot,this._bgColor,this._fgColor,this._cardH);
    // Update panel inner backgrounds to match card
    this._applyPanelColors();
  }

  _applyPanelColors(){
    const bg=this._bgColor,fg=this._fgColor;
    if(!bg)return;
    for(const id of["panel-search-inner","panel-lib-inner","panel-devices-inner","panel-queue-inner","panel-lyrics-inner"]){
      const el=this.shadowRoot.getElementById(id);
      if(el){el.style.backgroundColor=bg;el.style.color=fg||"";}
    }
  }

  _bindSeek(){
    const bar=this.shadowRoot.getElementById("prog-bar");if(!bar)return;
    const pct=e=>{const r=bar.getBoundingClientRect();return clamp((e.clientX-r.left)/r.width,0,1);};
    bar.addEventListener("pointerdown",e=>{
      bar.classList.add("drag");bar.setPointerCapture(e.pointerId);this._prog.startDrag(pct(e));
      const mv=e=>this._prog.moveDrag(pct(e));
      const up=()=>{bar.classList.remove("drag");const s=this._prog.endDrag();this._mp("media_seek",{seek_position:round2(s)});bar.removeEventListener("pointermove",mv);bar.removeEventListener("pointerup",up);};
      bar.addEventListener("pointermove",mv,{passive:true});
      bar.addEventListener("pointerup",up,{once:true});
    });
  }

  _bindButtons(){
    const s=this.shadowRoot;
    s.getElementById("play-btn").addEventListener("click",()=>this._mp(this._playing?"media_pause":"media_play"));
    s.getElementById("prev-btn").addEventListener("click",()=>this._mp("media_previous_track"));
    s.getElementById("next-btn").addEventListener("click",()=>this._mp("media_next_track"));
    s.getElementById("shuf-btn").addEventListener("click",()=>this._mp("shuffle_set",{shuffle:!this._shuffle}));
    s.getElementById("rep-btn").addEventListener("click",()=>this._mp("repeat_set",{repeat:{off:"all",all:"one",one:"off"}[this._repeat]??"off"}));
    s.getElementById("mute-btn").addEventListener("click",()=>this._mp("volume_mute",{is_volume_muted:!this._muted}));
    s.getElementById("like-btn").addEventListener("click",()=>this._paintLike(toggleLiked(this._trackId,this._hass)));
    s.getElementById("btn-more").addEventListener("click",()=>this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:this._config.entity},bubbles:true,composed:true})));

    for(const[id,panel]of[["btn-search","search"],["btn-lib","lib"],["btn-devices","devices"],["btn-queue","queue"],["btn-lyrics","lyrics"]]){
      s.getElementById(id)?.addEventListener("click",()=>this._open(panel));
    }
    for(const p of["search","lib","devices","queue","lyrics"]){
      s.getElementById(`cls-${p}`)?.addEventListener("click",e=>{e.stopPropagation();this._close();});
    }
    s.getElementById("bd")?.addEventListener("click",()=>this._close());

    s.getElementById("si")?.addEventListener("focus",()=>{this._searchFocused=true;});
    s.getElementById("si")?.addEventListener("blur", ()=>{this._searchFocused=false;});
    s.getElementById("si")?.addEventListener("keydown",e=>{if(e.key==="Enter")this._search();});
    s.getElementById("sg")?.addEventListener("click",()=>this._search());

    // Hover icon preview
    const shuf=s.getElementById("shuf-btn");
    shuf?.addEventListener("mouseenter",()=>shuf.querySelector("ha-icon")?.setAttribute("icon",this._shuffle?I.shuffle_off:I.shuffle));
    shuf?.addEventListener("mouseleave",()=>this._paintShuf());
    const rep=s.getElementById("rep-btn");
    rep?.addEventListener("mouseenter",()=>rep.querySelector("ha-icon")?.setAttribute("icon",{off:I.repeat,all:I.repeat_one,one:I.repeat_off}[this._repeat]??I.repeat_off));
    rep?.addEventListener("mouseleave",()=>this._paintRep());
    const like=s.getElementById("like-btn");
    like?.addEventListener("mouseenter",()=>like.querySelector("ha-icon")?.setAttribute("icon",_liked.has(this._trackId)?I.heart_out:I.heart));
    like?.addEventListener("mouseleave",()=>this._paintLike(_liked.has(this._trackId)));

    const mw=s.getElementById("mq-wrap");
    mw?.addEventListener("mouseenter",()=>marqStart(mw));
    mw?.addEventListener("mouseleave",()=>marqStop(mw));
  }

  _open(id){
    if(this._openId===id){this._close();return;}
    const s=this.shadowRoot;
    if(this._openId)s.getElementById(`panel-${this._openId}`)?.classList.remove("open");
    this._openId=id;
    s.getElementById("bd").classList.add("open");
    s.getElementById(`panel-${id}`)?.classList.add("open");
    this._applyPanelColors();
    if(id==="queue")   this._loadQueue();
    if(id==="devices") this._renderDevices();
    if(id==="lyrics")  { if(this._trackId!==this._lastLyricsTrack) this._loadLyrics(); else this._highlightLyric(); }
    if(id==="lib"&&!this._libStack.length)this._renderLibRoot();
    if(id==="search")requestAnimationFrame(()=>{s.getElementById("si")?.focus();if(this._srR)this._renderSearch();});
  }

  _close(){
    const s=this.shadowRoot;
    if(this._openId){s.getElementById(`panel-${this._openId}`)?.classList.remove("open");this._openId=null;}
    s.getElementById("bd").classList.remove("open");
  }

  _update(prev){
    const s=this.shadowRoot;
    if(!s.getElementById("play-btn"))return;
    const so=this._so,art=this._art;
    const isOff=!so||["off","unavailable","unknown"].includes(this._state);
    const bg=s.getElementById("bg");
    if(bg){bg.classList.toggle("no-image",!art);bg.classList.toggle("off",isOff);bg.classList.toggle("unavailable",this._state==="unavailable");}
    const imgEl=s.getElementById("image");
    if(imgEl)imgEl.style.backgroundImage=art?`url(${this._hassUrl(art)})`:"none";

    const bgC=this._bgColor,fgC=this._fgColor;
    if(bgC!==this._lastBg||fgC!==this._lastFg||this._cardH!==this._lastH){
      this._lastBg=bgC;this._lastFg=fgC;this._lastH=this._cardH;
      applyBg(s,bgC,fgC,this._cardH);
      this._applyPanelColors();
    }

    const mi=s.getElementById("mq-inner");if(mi)mi.textContent=this._title||"Nothing playing";
    const sub=s.getElementById("sub");if(sub)sub.textContent=[this._artist,this._album].filter(Boolean).join(" · ");
    s.getElementById("play-btn")?.querySelector("ha-icon")?.setAttribute("icon",this._playing?I.pause:I.play);
    this._paintShuf();this._paintRep();
    s.getElementById("shuf-btn").style.visibility=this._config.show_shuffle!==false?"":"hidden";
    s.getElementById("rep-btn").style.visibility =this._config.show_repeat !==false?"":"hidden";

    const showP=this._config.show_seek!==false&&!this._narrow&&(this._playing||this._state==="paused")&&this._durSecs>0;
    s.getElementById("prog-wrap").style.display=showP?"":"none";
    s.getElementById("player")?.classList.toggle("no-progress",!showP);
    if(showP&&so)this._prog.sync(so);

    s.getElementById("vol-row").style.display=this._config.show_volume!==false?"":"none";
    s.getElementById("mute-btn")?.querySelector("ha-icon")?.setAttribute("icon",this._muted?I.vol_off:this._vol>50?I.vol_hi:I.vol_lo);
    this._vd?.sync(this._muted?0:this._vol/100);

    if(this._trackId!==this._lastTrack){
      this._lastTrack=this._trackId;
      checkLiked(this._trackId,this._hass).then(()=>this._paintLike(_liked.has(this._trackId)));
      // Reload lyrics if panel is open and track changed
      if(this._openId==="lyrics")this._loadLyrics();
    }
    this._paintLike(_liked.has(this._trackId));
    if(this._openId==="devices")this._renderDevices();
    if(this._openId==="lyrics"&&this._lyricsData)this._highlightLyric();
    this._measure();
  }

  _paintShuf(){this.shadowRoot.getElementById("shuf-btn")?.querySelector("ha-icon")?.setAttribute("icon",this._shuffle?I.shuffle:I.shuffle_off);}
  _paintRep(){this.shadowRoot.getElementById("rep-btn")?.querySelector("ha-icon")?.setAttribute("icon",{off:I.repeat_off,all:I.repeat,one:I.repeat_one}[this._repeat]??I.repeat_off);}
  _paintLike(liked){
    const btn=this.shadowRoot.getElementById("like-btn");if(!btn)return;
    btn.querySelector("ha-icon")?.setAttribute("icon",liked?I.heart:I.heart_out);
    btn.title=btn.label=liked?"Remove from Liked Songs":"Save to Liked Songs";
  }

  // ── Library ────────────────────────────────────────────────────────────────
  _renderLibRoot(){
    const body=this.shadowRoot.getElementById("lb");if(!body)return;
    const roots=[
      ["spotify://category/playlists",       I.library,  "Playlists",       true],
      ["spotify://category/liked_songs",      I.heart,    "Liked Songs",     true],
      ["spotify://category/recently_played",  I.history,  "Recently Played", false],
      ["spotify://category/top_tracks",       I.chart,    "Top Tracks",      false],
      ["spotify://category/top_artists",      I.account,  "Top Artists",     true],
      ["spotify://category/new_releases",     I.new_box,  "New Releases",    true],
      ["spotify://category/discover_weekly",  I.compass,  "Discover Weekly", true],
    ];
    body.innerHTML=roots.map(([id,ico,label,exp])=>`
      <div class="item" data-id="${id}" data-exp="${exp}" data-label="${label}">
        <div class="ic">
          <div class="iph">${Ico(ico,20)}</div>
          <div class="iinfo"><div class="ititle">${label}</div></div>
          ${Ico(I.chev_r,18)}
        </div>
      </div>`).join("");
    this._bindLib(body);this._libStack=[];this._updateLibTitle();
  }

  _bindLib(c){
    c.querySelectorAll(".item[data-id]").forEach(el=>{
      el.addEventListener("click",async()=>{
        const{id,exp,label}=el.dataset;
        if(exp==="true"){this._libStack.push({label,id});this._updateLibTitle();await this._browseLib(id);}
        else{this._mp("play_media",{media_content_id:id,media_content_type:"music"});this._close();}
      });
    });
    c.querySelectorAll("[data-aq]").forEach(btn=>btn.addEventListener("click",e=>{
      e.stopPropagation();this._spotify("add_to_queue",{track_uri:btn.dataset.aq});
    }));
    c.querySelectorAll("[data-play-all]").forEach(btn=>btn.addEventListener("click",e=>{
      e.stopPropagation();
      this._mp("play_media",{media_content_id:btn.dataset.playAll,media_content_type:"music"});
      this._close();
    }));
  }

  async _browseLib(id){
    const body=this.shadowRoot.getElementById("lb");if(!body)return;
    body.innerHTML=`<div class="loading">Loading…</div>`;
    try{
      const r=await this._hass.callWS({type:"media_player/browse_media",entity_id:this._config.entity,media_content_id:id,media_content_type:"music"});
      const items=r.children||[];
      let html="";
      // For playlists/albums — show a "Play all" button at the top
      if(r.can_play&&r.media_content_id&&!r.media_content_id.startsWith("spotify://category")){
        html+=`<button class="play-all-btn" data-play-all="${r.media_content_id}">${Ico(I.play,18)}&nbsp;Play all</button>`;
      }
      html+=items.map(item=>{
        const isA=item.media_class==="artist";
        const th=item.thumbnail?`<img class="ithumb${isA?" circle":""}" src="${item.thumbnail}" alt=""/>`:`<div class="iph">${Ico(I.library,18)}</div>`;
        const rt=!item.can_expand
          ?`<ha-icon-button class="sm" data-aq="${item.media_content_id}" label="Queue"><ha-icon icon="${I.add_q}"></ha-icon></ha-icon-button>`
          :Ico(I.chev_r,18);
        return`<div class="item" data-id="${item.media_content_id}" data-exp="${item.can_expand}" data-label="${(item.title||"").replace(/"/g,"&quot;")}">
          <div class="ic">${th}<div class="iinfo"><div class="ititle">${item.title||""}</div>${item.media_class?`<div class="isub">${item.media_class}</div>`:""}</div>${rt}</div>
        </div>`;
      }).join("")||`<div class="empty">Nothing here.</div>`;
      body.innerHTML=html;
      this._bindLib(body);
    }catch(e){body.innerHTML=`<div class="empty">Could not load.<br><small>${e.message||""}</small></div>`;}
  }

  _updateLibTitle(){
    const el=this.shadowRoot.getElementById("lib-title");if(!el)return;
    if(!this._libStack.length){el.innerHTML=`${Ico(I.library,16)}&nbsp;Library`;return;}
    const crumbs=[`<button class="bcc" data-nav="-1">${Ico(I.home,13)}&nbsp;Library</button>`,...this._libStack.map((p,i)=>`<span class="bcs">›</span><button class="bcc${i===this._libStack.length-1?" last":""}" data-nav="${i}">${p.label}</button>`)].join("");
    el.innerHTML=`<div style="display:flex;align-items:center;gap:2px;overflow:hidden">${crumbs}</div>`;
    el.querySelectorAll(".bcc[data-nav]").forEach(b=>b.addEventListener("click",async()=>{
      const nav=parseInt(b.dataset.nav);
      if(nav===-1){this._libStack=[];this._renderLibRoot();return;}
      const t=this._libStack[nav];this._libStack=this._libStack.slice(0,nav);
      this._updateLibTitle();await this._browseLib(t.id);
    }));
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  async _search(){
    const s=this.shadowRoot,q=s.getElementById("si")?.value?.trim();if(!q)return;
    if(q!==this._srQ){this._srQ=q;this._srR=null;this._srX={};}
    const body=s.getElementById("sb");
    if(!this._srR&&body)body.innerHTML=`<div class="loading">Searching…</div>`;
    try{
      const tok=this._hass?.auth?.data?.access_token;
      const r=await fetch(`/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`,{headers:{Authorization:`Bearer ${tok}`}});
      if(r.ok){this._srR=await r.json();this._renderSearch();}
      else if(body)body.innerHTML=`<div class="empty">Search failed.</div>`;
    }catch{s.getElementById("sb").innerHTML=`<div class="empty">Search failed.</div>`;}
  }

  _renderSearch(){
    const s=this.shadowRoot,body=s.getElementById("sb");if(!body||!this._srR)return;
    const R=this._srR;
    const aqBtn=uri=>`<ha-icon-button class="sm" data-aq="${uri}" label="Queue"><ha-icon icon="${I.add_q}"></ha-icon></ha-icon-button>`;
    const mkT=t=>`<div class="item" data-play="${t.uri}"><div class="ic"><img class="ithumb" src="${t.album?.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div>${aqBtn(t.uri)}</div></div>`;
    const mkA=a=>`<div class="item" data-play="${a.uri}"><div class="ic"><img class="ithumb" src="${a.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">${(a.artists||[]).map(x=>x.name).join(", ")}</div></div></div></div>`;
    const mkAr=a=>`<div class="item" data-play="${a.uri}"><div class="ic"><img class="ithumb circle" src="${a.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">Artist</div></div></div></div>`;
    const mkP=p=>`<div class="item" data-play="${p.uri}"><div class="ic"><img class="ithumb" src="${p.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${p.name}</div><div class="isub">Playlist · ${p.owner?.display_name||""}</div></div></div></div>`;
    const sec=(label,key,mkFn,n)=>{
      const items=R[key]?.items;if(!items?.length)return"";
      const shown=this._srX[key]?items:items.slice(0,n);
      const total=R[key]?.total||items.length;
      const more=!this._srX[key]&&total>n?`<button class="smore" data-ex="${key}">Show more ${label.toLowerCase()} (${total})</button>`:"";
      return`<div class="slabel">${label}</div>${shown.map(mkFn).join("")}${more}`;
    };
    body.innerHTML=sec("Tracks","tracks",mkT,5)+sec("Albums","albums",mkA,4)+sec("Artists","artists",mkAr,4)+sec("Playlists","playlists",mkP,4)||`<div class="empty">No results.</div>`;
    body.querySelectorAll(".item[data-play]").forEach(el=>el.addEventListener("click",e=>{
      if(e.target.closest("[data-aq]"))return;
      this._mp("play_media",{media_content_id:el.dataset.play,media_content_type:"music"});
      this._close();
    }));
    body.querySelectorAll("[data-aq]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();this._spotify("add_to_queue",{track_uri:btn.dataset.aq});}));
    body.querySelectorAll("[data-ex]").forEach(btn=>btn.addEventListener("click",()=>{this._srX[btn.dataset.ex]=true;this._renderSearch();}));
    if(this._searchFocused)requestAnimationFrame(()=>s.getElementById("si")?.focus());
  }

  // ── Queue ──────────────────────────────────────────────────────────────────
  async _loadQueue(){
    const body=this.shadowRoot.getElementById("qb");if(!body)return;
    body.innerHTML=`<div class="loading">Loading queue…</div>`;
    try{
      const tok=this._hass?.auth?.data?.access_token;
      const r=await fetch("/api/spotify_enhanced/queue",{headers:{Authorization:`Bearer ${tok}`}});
      if(!r.ok)throw new Error();
      this._renderQueue(body,await r.json());
    }catch{body.innerHTML=`<div class="empty">Queue unavailable. Start playback first.</div>`;}
  }

  _renderQueue(body,data){
    const cur=data.currently_playing,q=data.queue||[],qUris=q.map(t=>t.uri);
    const mk=(t,now=false)=>`
      <div class="item${now?" now":""}" data-uri="${t.uri}">
        <div class="ic"><img class="ithumb" src="${t.album?.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div><span style="font-size:0.72rem;opacity:0.6">${fmt(t.duration_ms/1000)}</span></div>
        <div class="sdel">${Ico(I.delete,20)}</div>
      </div>`;
    let html="";
    if(cur)html+=`<div class="qnow">Now Playing</div>`+mk(cur,true);
    if(q.length)html+=`<div class="slabel">Next Up</div>`+q.slice(0,30).map(t=>mk(t)).join("");
    body.innerHTML=html||`<div class="empty">Queue is empty.</div>`;
    body.querySelectorAll(".item[data-uri]").forEach(el=>{
      let sx=0,dx=0;
      el.addEventListener("click",async e=>{
        if(el.classList.contains("swiped")){el.classList.remove("swiped");return;}
        if(e.target.closest(".sdel"))return;
        const pos=qUris.indexOf(el.dataset.uri);
        if(pos>=0){
          const was=this._muted;
          if(!was)this._mp("volume_mute",{is_volume_muted:true});
          for(let i=0;i<=pos;i++){this._mp("media_next_track");await new Promise(r=>setTimeout(r,350));}
          if(!was){await new Promise(r=>setTimeout(r,400));this._mp("volume_mute",{is_volume_muted:false});}
        }
        this._close();
      });
      el.addEventListener("touchstart",e=>{sx=e.touches[0].clientX;},{passive:true});
      el.addEventListener("touchmove", e=>{dx=e.touches[0].clientX-sx;},{passive:true});
      el.addEventListener("touchend",  ()=>{if(dx<-40)el.classList.add("swiped");else el.classList.remove("swiped");});
      el.querySelector(".sdel")?.addEventListener("click",e=>{e.stopPropagation();el.style.opacity="0";el.style.transition="opacity 0.2s";setTimeout(()=>this._loadQueue(),250);});
    });
  }

  // ── Devices ────────────────────────────────────────────────────────────────
  _renderDevices(){
    const body=this.shadowRoot.getElementById("db");if(!body)return;
    const devs=stabilise(this._devices);
    if(!devs.length){body.innerHTML=`<div class="empty">No devices found. Open Spotify on a device.</div>`;return;}
    body.innerHTML=devs.map(d=>`
      <div class="devitem${d.id===this._devId?" active":""}" data-id="${d.id}">
        <div class="devicon">${Ico(I.cast,22)}</div>
        <div class="devname">${d.name}</div>
        ${d.volume_percent!=null?`<span class="devvol">${d.volume_percent}%</span>`:""}
        ${d.id===this._devId?`<div class="devdot"></div>`:""}
      </div>`).join("");
    body.querySelectorAll(".devitem[data-id]").forEach(el=>el.addEventListener("click",()=>{this._spotify("transfer_playback",{device_id:el.dataset.id});this._close();}));
  }

  // ── Lyrics ─────────────────────────────────────────────────────────────────
  async _loadLyrics(){
    const body=this.shadowRoot.getElementById("lyb");if(!body)return;
    body.innerHTML=`<div class="loading">Loading lyrics…</div>`;
    this._lyricsData=null;
    this._lastLyricsTrack=this._trackId;
    if(!this._title||!this._artist){body.innerHTML=`<div class="empty">No track playing.</div>`;return;}
    try{
      const p=new URLSearchParams({track_name:this._title,artist_name:this._artist,album_name:this._album||"",duration:Math.round(this._durSecs)});
      const r=await fetch(`https://lrclib.net/api/get?${p}`,{headers:{"Lrclib-Client":"SpotifyEnhancedHA/1.1.6 (https://github.com/Kousei-Uchu/spotify-enhanced)","Accept":"application/json"}});
      const data=await r.json().catch(()=>null);
      if(!data||data.code==="TrackNotFound"||(!data.syncedLyrics&&!data.plainLyrics&&!data.instrumentalFlag)){throw new Error("not found");}
      if(data.instrumentalFlag){
        body.innerHTML=`<div class="empty">${Ico(I.mic_on,28)}<br><br>Instrumental — no lyrics.</div>`;return;
      }
      if(data.syncedLyrics){
        const lines=data.syncedLyrics.split("\n").map(l=>{
          const m=l.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)/);
          return m?{ms:(parseInt(m[1])*60+parseFloat(m[2]))*1000,words:m[3].trim()}:null;
        }).filter(Boolean);
        this._lyricsData=lines;
        body.innerHTML=lines.map((l,i)=>`<div class="lline${l.words?"":" plain"}" data-i="${i}" data-t="${l.ms}">${l.words||"♪"}</div>`).join("");
        body.querySelectorAll(".lline[data-t]").forEach(el=>el.addEventListener("click",()=>this._mp("media_seek",{seek_position:round2(parseInt(el.dataset.t)/1000)})));
        this._highlightLyric();
      }else if(data.plainLyrics){
        this._lyricsData=null;
        body.innerHTML=data.plainLyrics.split("\n").map(l=>l?`<div class="lline plain">${l}</div>`:`<div style="height:8px"></div>`).join("");
      }
    }catch{body.innerHTML=`<div class="empty">${Ico(I.mic_off,28)}<br><br>Lyrics not available for this track.</div>`;}
  }

  _highlightLyric(){
    const body=this.shadowRoot.getElementById("lyb");
    if(!body||!this._lyricsData||!this._prog)return;
    const nowMs=this._prog.currentForLyrics*1000;
    const lines=body.querySelectorAll(".lline[data-t]");
    let active=null;
    lines.forEach(el=>{el.classList.remove("on");if(parseInt(el.dataset.t)<=nowMs)active=el;});
    if(active){active.classList.add("on");active.scrollIntoView({behavior:"smooth",block:"center"});}
  }
}
customElements.define("spotify-enhanced-card",SpotifyEnhancedCard);

// ── MINI CARD ─────────────────────────────────────────────────────────────────
class SpotifyMiniCard extends Base {
  static getStubConfig(){return{entity:"media_player.spotify_enhanced"};}
  setConfig(c){this._config={show_volume:true,...c};this._ready=false;this._build();this._ready=true;if(this._hass)this._update(null);}
  _build(){
    this.shadowRoot.innerHTML=`<style>${CSS}
ha-card{display:flex;align-items:center;padding:10px 12px;gap:10px;height:auto;overflow:hidden;}
.art{width:48px;height:48px;border-radius:4px;object-fit:cover;flex-shrink:0;background:rgba(255,255,255,0.1);}
.inf{flex:1;min-width:0;}
.tt{font-size:0.9rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ss{font-size:0.74rem;opacity:0.65;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.vr{display:flex;align-items:center;gap:4px;margin-top:5px;}
.vr .vol-track{flex:1;}
.ctrls{display:inline-flex;align-items:center;flex-shrink:0;}
ha-icon-button{--mdc-icon-button-size:36px;--mdc-icon-size:22px;color:inherit;display:inline-flex;align-items:center;justify-content:center;}
ha-icon-button.pp{--mdc-icon-button-size:44px;--mdc-icon-size:30px;}
</style>
<ha-card>
  <img class="art" id="art" src="" alt=""/>
  <div class="inf">
    <div class="tt" id="tt">Nothing playing</div>
    <div class="ss" id="ss"></div>
    <div class="vr" id="vr">
      ${Btn(I.vol_lo,"mute","Mute","")}
      <div class="vol-track" id="vt"><div class="vol-fill" id="vf"></div><div class="vol-thumb" id="vh"></div></div>
    </div>
  </div>
  <div class="ctrls">
    ${Btn(I.prev,"prev","Previous","")}
    ${Btn(I.play,"play","Play/Pause","pp")}
    ${Btn(I.next,"next","Next","")}
  </div>
</ha-card>`;
    const s=this.shadowRoot;
    s.getElementById("play").addEventListener("click",()=>this._mp(this._playing?"media_pause":"media_play"));
    s.getElementById("prev").addEventListener("click",()=>this._mp("media_previous_track"));
    s.getElementById("next").addEventListener("click",()=>this._mp("media_next_track"));
    s.getElementById("mute").addEventListener("click",()=>this._mp("volume_mute",{is_volume_muted:!this._muted}));
    this._vd=new VolDrag(s.getElementById("vt"),s.getElementById("vf"),s.getElementById("vh"),p=>this._mp("volume_set",{volume_level:round2(p)}));
  }
  _update(){
    const s=this.shadowRoot;if(!s.getElementById("art"))return;
    s.getElementById("art").src=this._hassUrl(this._art);
    s.getElementById("tt").textContent=this._title||"Nothing playing";
    s.getElementById("ss").textContent=this._artist;
    s.getElementById("play")?.querySelector("ha-icon")?.setAttribute("icon",this._playing?I.pause:I.play);
    s.getElementById("mute")?.querySelector("ha-icon")?.setAttribute("icon",this._muted?I.vol_off:I.vol_lo);
    s.getElementById("vr").style.display=this._config.show_volume!==false?"flex":"none";
    this._vd?.sync(this._muted?0:this._vol/100);
    const card=s.querySelector("ha-card");const bg=this._bgColor,fg=this._fgColor;
    if(card&&bg)card.style.backgroundColor=bg;
    const inf=s.querySelector(".inf"),ctrls=s.querySelector(".ctrls");
    if(fg){if(inf)inf.style.color=fg;if(ctrls)ctrls.style.color=fg;}
  }
}
customElements.define("spotify-mini-card",SpotifyMiniCard);

// ── Shared standalone bg helper ───────────────────────────────────────────────
const BG_TEMPLATE = () => `
  <div class="background no-image off" id="bg">
    <div class="color-block" id="color-block"></div>
    <div class="no-img" id="no-img"></div>
    <div class="image" id="image"></div>
    <div class="color-gradient" id="color-gradient"></div>
  </div>`;

// ── DEVICE CARD ───────────────────────────────────────────────────────────────
class SpotifyDeviceCard extends Base {
  static getStubConfig(){return{entity:"media_player.spotify_enhanced",title:"Spotify Devices"};}
  setConfig(c){this._config={title:"Spotify Devices",...c};this._ready=false;this._build();this._ready=true;if(this._hass)this._update(null);}
  _build(){
    this.shadowRoot.innerHTML=`<style>${CSS}
ha-card{height:auto;}
.inner{position:relative;z-index:1;}
.hdr{padding:14px 14px 8px;font-size:0.82rem;font-weight:700;opacity:0.7;display:inline-flex;align-items:center;gap:6px;}
</style>
<ha-card>${BG_TEMPLATE()}
  <div class="inner">
    <div class="hdr">${Ico(I.cast,16)}&nbsp;${this._config.title}</div>
    <div id="list"><div class="empty">Loading…</div></div>
  </div>
</ha-card>`;
  }
  _update(){
    const s=this.shadowRoot;
    applyBgStandalone(s,this._bgColor,this._fgColor,this._art,u=>this._hassUrl(u));
    const list=s.getElementById("list");if(!list)return;
    const devs=stabilise(this._devices);
    if(!devs.length){list.innerHTML=`<div class="empty">No devices. Open Spotify on a device.</div>`;return;}
    list.innerHTML=devs.map(d=>`
      <div class="devitem${d.id===this._devId?" active":""}" data-id="${d.id}">
        <div class="devicon">${Ico(I.cast,22)}</div>
        <div class="devname">${d.name}</div>
        ${d.volume_percent!=null?`<span class="devvol">${d.volume_percent}%</span>`:""}
        ${d.id===this._devId?`<div class="devdot"></div>`:""}
      </div>`).join("");
    list.querySelectorAll(".devitem[data-id]").forEach(el=>el.addEventListener("click",()=>this._spotify("transfer_playback",{device_id:el.dataset.id})));
  }
}
customElements.define("spotify-device-card",SpotifyDeviceCard);

// ── SEARCH CARD ───────────────────────────────────────────────────────────────
class SpotifySearchCard extends Base {
  constructor(){super();this._q="";this._r=null;this._x={};this._focused=false;}
  static getStubConfig(){return{entity:"media_player.spotify_enhanced"};}
  setConfig(c){this._config=c;this._ready=false;this._build();this._ready=true;if(this._hass)this._update(null);}
  _build(){
    this.shadowRoot.innerHTML=`<style>${CSS}
ha-card{height:auto;display:flex;flex-direction:column;max-height:600px;}
.inner{position:relative;z-index:1;display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;}
.results{overflow-y:auto;flex:1;scrollbar-width:thin;}
</style>
<ha-card>${BG_TEMPLATE()}
  <div class="inner">
    <div class="sbar"><input class="sinput" id="si" placeholder="Search Spotify…" autocomplete="off"/>${Btn(I.search,"sg","Search","sm")}</div>
    <div class="results" id="body"></div>
  </div>
</ha-card>`;
    const go=async()=>{
      const q=this.shadowRoot.getElementById("si")?.value?.trim();if(!q)return;
      if(q!==this._q){this._q=q;this._r=null;this._x={};}
      const body=this.shadowRoot.getElementById("body");
      if(!this._r&&body)body.innerHTML=`<div class="loading">Searching…</div>`;
      try{
        const tok=this._hass?.auth?.data?.access_token;
        const r=await fetch(`/api/spotify_enhanced/search?q=${encodeURIComponent(q)}&types=track,album,artist,playlist`,{headers:{Authorization:`Bearer ${tok}`}});
        if(r.ok){this._r=await r.json();this._render();}
        else body.innerHTML=`<div class="empty">Search failed.</div>`;
      }catch{this.shadowRoot.getElementById("body").innerHTML=`<div class="empty">Search failed.</div>`;}
    };
    this.shadowRoot.getElementById("sg")?.addEventListener("click",go);
    this.shadowRoot.getElementById("si")?.addEventListener("keydown",e=>{if(e.key==="Enter")go();});
    this.shadowRoot.getElementById("si")?.addEventListener("focus",()=>{this._focused=true;});
    this.shadowRoot.getElementById("si")?.addEventListener("blur", ()=>{this._focused=false;});
  }
  _render(){
    const s=this.shadowRoot,body=s.getElementById("body");if(!body||!this._r)return;
    const R=this._r;
    const aqBtn=uri=>`<ha-icon-button class="sm" data-aq="${uri}" label="Queue"><ha-icon icon="${I.add_q}"></ha-icon></ha-icon-button>`;
    const mkT=t=>`<div class="item" data-play="${t.uri}"><div class="ic"><img class="ithumb" src="${t.album?.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div>${aqBtn(t.uri)}</div></div>`;
    const mkA=a=>`<div class="item" data-play="${a.uri}"><div class="ic"><img class="ithumb" src="${a.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">${(a.artists||[]).map(x=>x.name).join(", ")}</div></div></div></div>`;
    const mkAr=a=>`<div class="item" data-play="${a.uri}"><div class="ic"><img class="ithumb circle" src="${a.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${a.name}</div><div class="isub">Artist</div></div></div></div>`;
    const mkP=p=>`<div class="item" data-play="${p.uri}"><div class="ic"><img class="ithumb" src="${p.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${p.name}</div><div class="isub">Playlist · ${p.owner?.display_name||""}</div></div></div></div>`;
    const sec=(label,key,mkFn,n)=>{
      const items=R[key]?.items;if(!items?.length)return"";
      const shown=this._x[key]?items:items.slice(0,n);
      const total=R[key]?.total||items.length;
      const more=!this._x[key]&&total>n?`<button class="smore" data-ex="${key}">Show more ${label.toLowerCase()} (${total})</button>`:"";
      return`<div class="slabel">${label}</div>${shown.map(mkFn).join("")}${more}`;
    };
    body.innerHTML=sec("Tracks","tracks",mkT,5)+sec("Albums","albums",mkA,4)+sec("Artists","artists",mkAr,4)+sec("Playlists","playlists",mkP,4)||`<div class="empty">No results.</div>`;
    body.querySelectorAll(".item[data-play]").forEach(el=>el.addEventListener("click",e=>{if(e.target.closest("[data-aq]"))return;this._mp("play_media",{media_content_id:el.dataset.play,media_content_type:"music"});}));
    body.querySelectorAll("[data-aq]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();this._spotify("add_to_queue",{track_uri:btn.dataset.aq});}));
    body.querySelectorAll("[data-ex]").forEach(btn=>btn.addEventListener("click",()=>{this._x[btn.dataset.ex]=true;this._render();}));
    if(this._focused)requestAnimationFrame(()=>s.getElementById("si")?.focus());
  }
  _update(){applyBgStandalone(this.shadowRoot,this._bgColor,this._fgColor,this._art,u=>this._hassUrl(u));}
}
customElements.define("spotify-search-card",SpotifySearchCard);

// ── QUEUE CARD ────────────────────────────────────────────────────────────────
class SpotifyQueueCard extends Base {
  constructor(){super();this._data=null;this._loading=false;this._lastTrack="";}
  static getStubConfig(){return{entity:"media_player.spotify_enhanced"};}
  setConfig(c){this._config=c;this._ready=false;this._build();this._ready=true;if(this._hass)this._update(null);}
  _build(){
    this.shadowRoot.innerHTML=`<style>${CSS}
ha-card{height:auto;display:flex;flex-direction:column;max-height:600px;}
.inner{position:relative;z-index:1;display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;}
.hdr{padding:10px 8px 6px 14px;font-size:0.82rem;font-weight:700;opacity:0.7;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.body{overflow-y:auto;flex:1;scrollbar-width:thin;}
</style>
<ha-card>${BG_TEMPLATE()}
  <div class="inner">
    <div class="hdr">
      <span style="display:inline-flex;align-items:center;gap:6px">${Ico(I.queue,16)}&nbsp;Queue</span>
      ${Btn(I.refresh,"reload","Refresh","sm")}
    </div>
    <div class="body" id="body"><div class="loading">Loading…</div></div>
  </div>
</ha-card>`;
    this.shadowRoot.getElementById("reload")?.addEventListener("click",()=>this._load());
  }
  async _load(){
    if(this._loading)return;this._loading=true;
    const body=this.shadowRoot.getElementById("body");
    if(body)body.innerHTML=`<div class="loading">Loading…</div>`;
    try{
      const tok=this._hass?.auth?.data?.access_token;
      const r=await fetch("/api/spotify_enhanced/queue",{headers:{Authorization:`Bearer ${tok}`}});
      if(!r.ok)throw new Error();
      this._data=await r.json();this._render();
    }catch{if(body)body.innerHTML=`<div class="empty">Queue unavailable. Start playback first.</div>`;}
    finally{this._loading=false;}
  }
  _render(){
    const body=this.shadowRoot.getElementById("body");if(!body||!this._data)return;
    const cur=this._data.currently_playing,q=this._data.queue||[],qUris=q.map(t=>t.uri);
    const mk=(t,now=false)=>`
      <div class="item${now?" now":""}" data-uri="${t.uri}">
        <div class="ic"><img class="ithumb" src="${t.album?.images?.[0]?.url||""}" alt=""/><div class="iinfo"><div class="ititle">${t.name}</div><div class="isub">${(t.artists||[]).map(a=>a.name).join(", ")}</div></div><span style="font-size:0.72rem;opacity:0.6">${fmt(t.duration_ms/1000)}</span></div>
        <div class="sdel">${Ico(I.delete,20)}</div>
      </div>`;
    let html="";
    if(cur)html+=`<div class="qnow">Now Playing</div>`+mk(cur,true);
    if(q.length)html+=`<div class="slabel">Next Up</div>`+q.slice(0,30).map(t=>mk(t)).join("");
    body.innerHTML=html||`<div class="empty">Queue is empty.</div>`;
    body.querySelectorAll(".item[data-uri]").forEach(el=>{
      let sx=0,dx=0;
      el.addEventListener("click",async e=>{
        if(el.classList.contains("swiped")){el.classList.remove("swiped");return;}
        if(e.target.closest(".sdel"))return;
        const pos=qUris.indexOf(el.dataset.uri);
        if(pos>=0){
          const was=this._muted;
          if(!was)this._mp("volume_mute",{is_volume_muted:true});
          for(let i=0;i<=pos;i++){this._mp("media_next_track");await new Promise(r=>setTimeout(r,350));}
          if(!was){await new Promise(r=>setTimeout(r,400));this._mp("volume_mute",{is_volume_muted:false});}
        }
      });
      el.addEventListener("touchstart",e=>{sx=e.touches[0].clientX;},{passive:true});
      el.addEventListener("touchmove", e=>{dx=e.touches[0].clientX-sx;},{passive:true});
      el.addEventListener("touchend",  ()=>{if(dx<-40)el.classList.add("swiped");else el.classList.remove("swiped");});
      el.querySelector(".sdel")?.addEventListener("click",e=>{e.stopPropagation();el.style.opacity="0";el.style.transition="opacity 0.2s";setTimeout(()=>this._load(),250);});
    });
  }
  _update(){
    applyBgStandalone(this.shadowRoot,this._bgColor,this._fgColor,this._art,u=>this._hassUrl(u));
    const tid=this._trackId;
    if(!this._data&&!this._loading){this._load();return;}
    if(tid&&tid!==this._lastTrack){this._lastTrack=tid;this._load();}
  }
}
customElements.define("spotify-queue-card",SpotifyQueueCard);

// ── LYRICS CARD ───────────────────────────────────────────────────────────────
class SpotifyLyricsCard extends Base {
  constructor(){super();this._data=null;this._lastTrack="";this._prog=new ProgressTracker();}
  static getStubConfig(){return{entity:"media_player.spotify_enhanced"};}
  setConfig(c){this._config=c;this._ready=false;this._build();this._ready=true;if(this._hass)this._update(null);}
  disconnectedCallback(){this._prog?.destroy();}
  _build(){
    this.shadowRoot.innerHTML=`<style>${CSS}
ha-card{height:auto;display:flex;flex-direction:column;max-height:500px;}
.inner{position:relative;z-index:1;display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;}
.hdr{padding:14px 14px 8px;font-size:0.82rem;font-weight:700;opacity:0.7;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;}
.body{overflow-y:auto;flex:1;padding:6px 0 16px;scrollbar-width:thin;}
</style>
<ha-card>${BG_TEMPLATE()}
  <div class="inner">
    <div class="hdr">${Ico(I.mic_on,16)}&nbsp;Lyrics</div>
    <div class="body" id="body"><div class="loading">Loading…</div></div>
  </div>
</ha-card>`;
  }
  async _loadLyrics(){
    const body=this.shadowRoot.getElementById("body");if(!body)return;
    body.innerHTML=`<div class="loading">Loading lyrics…</div>`;
    this._data=null;
    if(!this._title||!this._artist){body.innerHTML=`<div class="empty">No track playing.</div>`;return;}
    try{
      const p=new URLSearchParams({track_name:this._title,artist_name:this._artist,album_name:this._album||"",duration:Math.round(this._durSecs)});
      const r=await fetch(`https://lrclib.net/api/get?${p}`,{headers:{"Lrclib-Client":"SpotifyEnhancedHA/1.1.6 (https://github.com/Kousei-Uchu/spotify-enhanced)","Accept":"application/json"}});
      const data=await r.json().catch(()=>null);
      if(!data||data.code==="TrackNotFound"||(!data.syncedLyrics&&!data.plainLyrics&&!data.instrumentalFlag))throw new Error("not found");
      if(data.instrumentalFlag){body.innerHTML=`<div class="empty">${Ico(I.mic_on,28)}<br><br>Instrumental — no lyrics.</div>`;return;}
      if(data.syncedLyrics){
        const lines=data.syncedLyrics.split("\n").map(l=>{const m=l.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)/);return m?{ms:(parseInt(m[1])*60+parseFloat(m[2]))*1000,words:m[3].trim()}:null;}).filter(Boolean);
        this._data=lines;
        body.innerHTML=lines.map((l,i)=>`<div class="lline${l.words?"":" plain"}" data-i="${i}" data-t="${l.ms}">${l.words||"♪"}</div>`).join("");
        body.querySelectorAll(".lline[data-t]").forEach(el=>el.addEventListener("click",()=>this._mp("media_seek",{seek_position:round2(parseInt(el.dataset.t)/1000)})));
        this._highlight();
      }else if(data.plainLyrics){
        this._data=null;
        body.innerHTML=data.plainLyrics.split("\n").map(l=>l?`<div class="lline plain">${l}</div>`:`<div style="height:8px"></div>`).join("");
      }
    }catch{body.innerHTML=`<div class="empty">${Ico(I.mic_off,28)}<br><br>Lyrics not available.</div>`;}
  }
  _highlight(){
    const body=this.shadowRoot.getElementById("body");if(!body||!this._data||!this._prog)return;
    const nowMs=this._prog.currentForLyrics*1000;
    const lines=body.querySelectorAll(".lline[data-t]");let active=null;
    lines.forEach(el=>{el.classList.remove("on");if(parseInt(el.dataset.t)<=nowMs)active=el;});
    if(active){active.classList.add("on");active.scrollIntoView({behavior:"smooth",block:"center"});}
  }
  _update(){
    const s=this.shadowRoot,so=this._so,tid=this._trackId;
    applyBgStandalone(s,this._bgColor,this._fgColor,this._art,u=>this._hassUrl(u));
    if(so)this._prog.sync(so);
    if(tid&&tid!==this._lastTrack){this._lastTrack=tid;this._loadLyrics();}
    else if(this._data)this._highlight();
  }
}
customElements.define("spotify-lyrics-card",SpotifyLyricsCard);

// ── VISUAL EDITOR ─────────────────────────────────────────────────────────────
class SpotifyEnhancedCardEditor extends HTMLElement {
  set hass(h){this._hass=h;const p=this.querySelector("ha-entity-picker");if(p)p.hass=h;}
  setConfig(c){this._config=c;this._render();}
  _render(){
    const c=this._config||{};
    const tog=(k,label,def=true)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--divider-color,#eee)"><span>${label}</span><ha-switch data-key="${k}" ${c[k]!==false&&(c[k]!==undefined?c[k]:def)?"checked":""}></ha-switch></div>`;
    this.innerHTML=`<style>:host{display:block;padding:4px 0}ha-entity-picker{display:block;margin-bottom:14px}.sh{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--secondary-text-color);margin:12px 0 4px}</style>
      <ha-entity-picker .hass="${this._hass||null}" .value="${c.entity||""}" .includeDomains="${["media_player"]}" label="Spotify Media Player Entity"></ha-entity-picker>
      <div class="sh">Controls</div>
      ${tog("show_seek","Show seek bar")}${tog("show_volume","Show volume")}${tog("show_shuffle","Show shuffle")}${tog("show_repeat","Show repeat")}`;
    const p=this.querySelector("ha-entity-picker");
    if(p){p.hass=this._hass;p.addEventListener("value-changed",e=>this._set("entity",e.detail.value));}
    this.querySelectorAll("ha-switch[data-key]").forEach(sw=>sw.addEventListener("change",e=>this._set(sw.dataset.key,e.target.checked)));
  }
  _set(k,v){this._config={...this._config,[k]:v};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config}}));}
}
customElements.define("spotify-enhanced-card-editor",SpotifyEnhancedCardEditor);

// ── Registration ──────────────────────────────────────────────────────────────
window.customCards=window.customCards||[];
window.customCards.push(
  {type:"spotify-enhanced-card",name:"Spotify Enhanced — Media Deck",   description:"Full player with art, controls, library, search, queue, devices and lyrics.",preview:true},
  {type:"spotify-mini-card",    name:"Spotify Enhanced — Mini Player",  description:"Compact single-row playback control.",preview:true},
  {type:"spotify-device-card",  name:"Spotify Enhanced — Device Picker",description:"Spotify Connect device switcher.",preview:true},
  {type:"spotify-search-card",  name:"Spotify Enhanced — Search",       description:"Standalone Spotify search.",preview:true},
  {type:"spotify-queue-card",   name:"Spotify Enhanced — Queue",        description:"Queue viewer with swipe-to-remove.",preview:true},
  {type:"spotify-lyrics-card",  name:"Spotify Enhanced — Lyrics",       description:"Time-synced lyrics via lrclib.net.",preview:true},
);
console.info(`%c SPOTIFY ENHANCED %c v${VERSION} `,"color:#fff;background:#1DB954;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px","color:#1DB954;background:#111;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0");
