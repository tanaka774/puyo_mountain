import { stateHandle } from "./state";

// Background scenery: sky, stars, sun/moon and layered ridges in a flat woodblock-print style.
// The sky follows the player's local clock, and every minute of play pushes it one hour ahead.
// Climbing progress (0..1) sinks the near ridges and lifts a sea of clouds.
//
// Debug params: ?sky=5.5 fixes the starting hour, ?skyspeed=10 multiplies how fast play advances it,
// ?climb=0.8 starts partway up.

type RGB = [number, number, number];

const FPS = 15;
const PLAY_HOURS_PER_MINUTE = 1;
const MAX_DPR = 1.5;
const HORIZON = 0.66; // fraction of height where sun and moon touch the horizon

const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)
];
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t
];
const rgba = (c: RGB, alpha = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

function seeded(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// keyed by sun altitude (-1: midnight, 0: horizon, 1: noon)
const SKY_KEYS: { alt: number, zenith: RGB, horizon: RGB }[] = [
  { alt: -1.0, zenith: hex('#060914'), horizon: hex('#17224a') },
  { alt: -0.32, zenith: hex('#0a1028'), horizon: hex('#1d2a52') },
  { alt: -0.16, zenith: hex('#15204a'), horizon: hex('#3b4b7a') },
  { alt: -0.06, zenith: hex('#26386a'), horizon: hex('#8d7d92') },
  { alt: 0.0, zenith: hex('#3a5b92'), horizon: hex('#e0946a') },
  { alt: 0.08, zenith: hex('#5584bb'), horizon: hex('#efc394') },
  { alt: 0.25, zenith: hex('#4b88c6'), horizon: hex('#cfe0e3') },
  { alt: 1.0, zenith: hex('#3474b8'), horizon: hex('#b8d5e3') },
];
const DUSK_TINT = hex('#d4684a');
const PAPER = hex('#f4ead8');
const SNOW_DAY = hex('#eef1f2');
const SNOW_NIGHT = hex('#3a4467');
const ALPENGLOW = hex('#f09a7c');
const SUN_LOW = hex('#e04f2e');
const SUN_HIGH = hex('#fff2d2');
const MOON_LIT = hex('#f1ead4');
const STAR_COLORS = ['#ffffff', '#ffe9c7', '#d4e2ff'];

interface LayerDef {
  base: number; // fraction of height
  amp: number; // noise amplitude, fraction of height
  freq: number; // noise features across the screen
  peaks: { x: number, h: number, wl: number, wr: number }[]; // widths to the left/right of the summit
  crag: number; // fine ridge detail, fraction of height
  day: RGB; night: RGB;
  haze: number;
  sink: number; // how far it drops at full climb, fraction of height
  trees: number; // 0: none, otherwise rough spacing in px
  treeH: number;
}

const LAYERS: LayerDef[] = [
  {
    base: 0.53, amp: 0.03, freq: 6, crag: 0.012,
    peaks: [
      { x: 0.19, h: 0.27, wl: 0.17, wr: 0.23 }, { x: 0.255, h: 0.2, wl: 0.05, wr: 0.11 },
      { x: 0.83, h: 0.21, wl: 0.17, wr: 0.13 }, { x: 0.765, h: 0.15, wl: 0.07, wr: 0.05 },
      { x: 0.52, h: 0.09, wl: 0.14, wr: 0.16 },
    ],
    day: hex('#8496a9'), night: hex('#2c3862'), haze: 0.5, sink: 0, trees: 0, treeH: 0
  },
  {
    base: 0.62, amp: 0.05, freq: 9, crag: 0.006,
    peaks: [{ x: 0.04, h: 0.09, wl: 0.1, wr: 0.14 }, { x: 0.66, h: 0.07, wl: 0.14, wr: 0.1 }],
    day: hex('#62797f'), night: hex('#1d2649'), haze: 0.36, sink: 0.05, trees: 0, treeH: 0
  },
  {
    base: 0.72, amp: 0.04, freq: 12, crag: 0.004,
    peaks: [{ x: 0.34, h: 0.05, wl: 0.1, wr: 0.1 }, { x: 0.93, h: 0.06, wl: 0.1, wr: 0.1 }],
    day: hex('#40594f'), night: hex('#121933'), haze: 0.2, sink: 0.16, trees: 22, treeH: 11
  },
  {
    base: 0.86, amp: 0.03, freq: 10, crag: 0.003,
    peaks: [{ x: -0.02, h: 0.15, wl: 0.24, wr: 0.24 }, { x: 1.03, h: 0.17, wl: 0.26, wr: 0.26 }],
    day: hex('#22372e'), night: hex('#070b18'), haze: 0.08, sink: 0.32, trees: 9, treeH: 22
  },
];

interface Layer { def: LayerDef, path: Path2D, top: number }
interface Kasumi { path: Path2D, len: number, height: number, y: number, speed: number, offset: number }

export class Scenery {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _w = 0;
  private _h = 0;
  private _dpr = 1;
  private _needsBuild = true;
  private _reducedMotion: boolean;

  private _layers: Layer[] = [];
  private _snowPath: Path2D;
  private _seaPath: Path2D;
  private _seaPeriod = 140;
  private _kasumi: Kasumi[] = [];
  private _grain: CanvasPattern;

  // stars live in a frame that turns around a point far below the horizon
  private _starX: Float32Array;
  private _starY: Float32Array;
  private _starSize: Float32Array;
  private _starBright: Float32Array;
  private _starPhase: Float32Array;
  private _starBucketEnds: number[] = [];
  private _starCenterY = 0;
  private _milkyWay: { tilt: number, offset: number, half: number, width: number };
  private _meteor: { x: number, y: number, vx: number, vy: number, life: number } | null = null;

  private _hourOverride: number | null = null;
  private _speed = 1;
  private _playHours = 0;
  private _climb = 0;
  private _climbTarget = 0;
  private _lastTick = 0;
  private _lastFrame = 0;

  constructor(canvasId: string) {
    this._canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this._ctx = this._canvas.getContext('2d', { alpha: false });
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const params = new URLSearchParams(location.search);
    if (params.has('sky')) this._hourOverride = Number(params.get('sky')) || 0;
    if (params.has('skyspeed')) this._speed = Number(params.get('skyspeed')) || 1;
    if (params.has('climb')) this._climb = this._climbTarget = clamp01(Number(params.get('climb')));

    this._grain = this.makeGrain();
    window.addEventListener('resize', () => { this._needsBuild = true; });

    this._lastTick = performance.now();
    requestAnimationFrame(this.frame);
  }

  setClimb(progress: number) {
    this._climbTarget = clamp01(progress);
  }

  private frame = (now: number) => {
    requestAnimationFrame(this.frame);
    if (now - this._lastFrame < 1000 / FPS - 2) return;
    this._lastFrame = now;

    const dt = Math.min(0.25, (now - this._lastTick) / 1000);
    this._lastTick = now;
    if (stateHandle.duringGamePlay()) {
      this._playHours += dt / 60 * PLAY_HOURS_PER_MINUTE * this._speed;
    }
    this._climb += (this._climbTarget - this._climb) * Math.min(1, dt * 0.6);

    if (this._needsBuild) this.build();
    this.render(now / 1000, dt);
  }

  private skyHours(): number {
    let base = this._hourOverride;
    if (base === null) {
      const d = new Date();
      base = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    }
    return base + this._playHours;
  }

  private moonPhase(): number {
    const synodicDays = 29.530588853;
    const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
    const days = (Date.now() + this._playHours * 3600000 - knownNewMoon) / 86400000;
    return ((days / synodicDays) % 1 + 1) % 1;
  }

  // ---------------------------------------------------------------- build

  private build() {
    this._needsBuild = false;
    this._dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this._w = window.innerWidth;
    this._h = window.innerHeight;
    this._canvas.width = Math.round(this._w * this._dpr);
    this._canvas.height = Math.round(this._h * this._dpr);

    const rand = seeded(1183);
    this._layers = LAYERS.map(def => this.buildLayer(def, rand));
    this._snowPath = this.buildSnow(this._layers[0], rand);
    this.buildSea(rand);
    this.buildKasumi(rand);
    this.buildStars(rand);
  }

  // heights along the ridge, sampled every `step` px from x = -10
  private ridgeHeights(def: LayerDef, rand: () => number, step: number): number[] {
    const h = this._h;
    const noise = this.makeNoise(rand);
    const crag = this.makeNoise(rand);
    const ys: number[] = [];
    for (let x = -10; x <= this._w + 10; x += step) {
      const xf = x / this._w;
      // overlapping summits take the highest one, so shoulders read as separate tops
      let rise = 0;
      for (const p of def.peaks) {
        const d = (xf - p.x) / (xf < p.x ? p.wl : p.wr);
        const a = Math.abs(d);
        if (a < 1) rise = Math.max(rise, p.h * h * Math.pow(1 - a, 1.35));
      }
      ys.push(def.base * h + noise(xf * def.freq) * def.amp * h - rise);
    }

    // round off the summits: a couple of box-blur passes over the profile
    const radius = Math.max(1, Math.round(this._w * 0.009 / step));
    for (let pass = 0; pass < 2; pass++) {
      const src = ys.slice();
      for (let i = 0; i < ys.length; i++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += src[Math.min(src.length - 1, Math.max(0, i + k))];
        ys[i] = sum / (radius * 2 + 1);
      }
    }

    // then bring back fine, uneven detail, rougher higher up
    const top = Math.min(...ys);
    for (let i = 0; i < ys.length; i++) {
      const x = -10 + i * step;
      const height = clamp01((def.base * h - ys[i]) / (def.base * h - top + 1));
      ys[i] += crag(x / this._w * def.freq * 6) * def.crag * h * (0.4 + height);
    }
    return ys;
  }

  private buildLayer(def: LayerDef, rand: () => number): Layer {
    const step = 4;
    const ys = this.ridgeHeights(def, rand, step);
    const path = new Path2D();
    let top = this._h;
    let nextTree = def.trees ? rand() * def.trees : Infinity;

    path.moveTo(-10, this._h + 10);
    for (let i = 0; i < ys.length; i++) {
      const x = -10 + i * step, y = ys[i];
      top = Math.min(top, y);
      path.lineTo(x, y);

      if (x >= nextTree) {
        // stylised conifer: three stacked tiers
        const th = def.treeH * (0.55 + rand() * 0.8);
        const tw = th * 0.32;
        path.lineTo(x - tw, y);
        path.lineTo(x - tw * 0.45, y - th * 0.38);
        path.lineTo(x - tw * 0.8, y - th * 0.38);
        path.lineTo(x - tw * 0.3, y - th * 0.7);
        path.lineTo(x - tw * 0.55, y - th * 0.7);
        path.lineTo(x, y - th);
        path.lineTo(x + tw * 0.55, y - th * 0.7);
        path.lineTo(x + tw * 0.3, y - th * 0.7);
        path.lineTo(x + tw * 0.8, y - th * 0.38);
        path.lineTo(x + tw * 0.45, y - th * 0.38);
        path.lineTo(x + tw, y);
        // clumps of trees with gaps between them
        nextTree = x + def.trees * (rand() < 0.2 ? 3 + rand() * 4 : 0.5 + rand() * 0.9);
      }
    }
    path.lineTo(this._w + 10, this._h + 10);
    path.closePath();
    return { def, path, top };
  }

  private buildSnow(far: Layer, rand: () => number): Path2D {
    const noise = this.makeNoise(rand);
    const gully = this.makeNoise(rand);
    const snowLine = far.top + this._h * 0.075;
    const path = new Path2D();
    path.moveTo(0, 0);
    for (let x = 0; x <= this._w; x += 4) {
      // ragged lower edge: snow reaching down unevenly in gullies
      const streak = Math.pow(Math.max(0, gully(x * 0.06)), 2);
      path.lineTo(x, snowLine + noise(x / this._w * 14) * this._h * 0.018 + streak * this._h * 0.045);
    }
    path.lineTo(this._w, 0);
    path.closePath();
    return path;
  }

  private buildSea(rand: () => number) {
    // a periodic row of billows so it can scroll seamlessly
    const p = this._seaPeriod;
    const path = new Path2D();
    path.moveTo(0, this._h);
    path.lineTo(0, 0);
    const radii = [0.3, 0.42, 0.28].map(r => r * p * (0.85 + rand() * 0.3));
    const total = radii.reduce((a, r) => a + r * 2, 0);
    const scale = p / total;
    for (let x0 = 0; x0 < this._w + p * 2; x0 += p) {
      let x = x0;
      for (const r0 of radii) {
        const r = r0 * scale;
        path.ellipse(x + r, 0, r, r * 0.55, 0, Math.PI, 0);
        x += r * 2;
      }
    }
    path.lineTo(this._w + p * 2, this._h);
    path.closePath();
    this._seaPath = path;
  }

  private buildKasumi(rand: () => number) {
    // horizontal mist bands (suyari-gasumi) made of a few overlapping capsules
    const defs = [{ y: 0.3, len: 0.34, speed: 4 }, { y: 0.5, len: 0.48, speed: 2.5 }];
    this._kasumi = defs.map(d => {
      const len = this._w * d.len;
      const th = Math.max(10, this._h * 0.022);
      const path = new Path2D();
      const capsule = (x: number, y: number, l: number, t: number) => {
        const r = t / 2;
        path.moveTo(x + r, y);
        path.lineTo(x + l - r, y);
        path.arc(x + l - r, y + r, r, -Math.PI / 2, Math.PI / 2);
        path.lineTo(x + r, y + t);
        path.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
        path.closePath();
      };
      capsule(0, 0, len * 0.62, th);
      capsule(len * (0.22 + rand() * 0.1), th * 0.7, len * 0.68, th * 1.1);
      capsule(len * (0.05 + rand() * 0.1), th * 1.6, len * 0.4, th * 0.9);
      return { path, len, height: th * 2.5, y: d.y, speed: d.speed, offset: rand() * (this._w + len) };
    });
  }

  private buildStars(rand: () => number) {
    const w = this._w, h = this._h;
    const horizonY = h * HORIZON;
    this._starCenterY = h * 1.7;
    const rMin = this._starCenterY - horizonY;
    const rMax = Math.hypot(w / 2, this._starCenterY);
    const area = Math.PI * (rMax * rMax - rMin * rMin);
    const fieldCount = Math.min(4000, Math.round(area / 2600));
    const rMid = (rMin + rMax) / 2;
    this._milkyWay = { tilt: 0.12, offset: rMid * 0.92, half: rMax, width: h * 0.16 };
    const bandCount = Math.round(fieldCount * 0.3);

    const xs: number[][] = [[], [], []], ys: number[][] = [[], [], []];
    const sizes: number[][] = [[], [], []], brights: number[][] = [[], [], []], phases: number[][] = [[], [], []];
    const push = (x: number, y: number, size: number, bright: number) => {
      const b = rand() < 0.7 ? 0 : (rand() < 0.5 ? 1 : 2);
      xs[b].push(x); ys[b].push(y); sizes[b].push(size); brights[b].push(bright);
      phases[b].push(rand() * Math.PI * 2);
    };

    for (let i = 0; i < fieldCount; i++) {
      const r = Math.sqrt(rMin * rMin + rand() * (rMax * rMax - rMin * rMin));
      const a = rand() * Math.PI * 2;
      const bright = Math.pow(rand(), 2.6);
      push(Math.cos(a) * r, Math.sin(a) * r, bright > 0.8 ? 1.9 : bright > 0.4 ? 1.4 : 1, 0.25 + bright * 0.75);
    }
    const mw = this._milkyWay;
    const tc = Math.cos(mw.tilt), ts = Math.sin(mw.tilt);
    for (let i = 0; i < bandCount; i++) {
      const bx = (rand() * 2 - 1) * mw.half;
      const by = -mw.offset + (rand() + rand() + rand() - 1.5) * mw.width * 0.6;
      push(bx * tc - by * ts, bx * ts + by * tc, 1, 0.15 + rand() * 0.3);
    }

    const flat = (arr: number[][]) => Float32Array.from(arr.flat());
    this._starX = flat(xs); this._starY = flat(ys);
    this._starSize = flat(sizes); this._starBright = flat(brights); this._starPhase = flat(phases);
    this._starBucketEnds = [xs[0].length, xs[0].length + xs[1].length, this._starX.length];
  }

  private makeNoise(rand: () => number) {
    const lattice = Array.from({ length: 256 }, () => rand() * 2 - 1);
    const at = (i: number) => lattice[((i % 256) + 256) % 256];
    const value = (x: number) => {
      const i = Math.floor(x), f = x - i;
      const t = f * f * (3 - 2 * f);
      return at(i) + (at(i + 1) - at(i)) * t;
    };
    return (x: number) => value(x) * 0.6 + value(x * 2.3 + 17) * 0.28 + value(x * 5.1 + 41) * 0.12;
  }

  private makeGrain(): CanvasPattern {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const rand = seeded(7);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rand() < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = rand() * 40;
    }
    g.putImageData(img, 0, 0);
    return this._ctx.createPattern(c, 'repeat');
  }

  // ---------------------------------------------------------------- render

  private render(t: number, dt: number) {
    const ctx = this._ctx, w = this._w, h = this._h;
    const hours = this.skyHours();
    const dayAngle = (hours - 6) / 24 * Math.PI * 2;
    const sunAlt = Math.sin(dayAngle);
    const evening = Math.cos(dayAngle) < 0;
    const dayness = smooth(-0.2, 0.25, sunAlt);
    const warmth = Math.exp(-Math.pow(sunAlt / 0.13, 2));

    const phase = this.moonPhase();
    const moonAngle = dayAngle - phase * Math.PI * 2;
    const moonAlt = Math.sin(moonAngle);
    const moonLight = (1 - Math.cos(phase * Math.PI * 2)) / 2 * smooth(-0.05, 0.2, moonAlt);

    let { zenith, horizon } = this.sampleSky(sunAlt);
    if (evening) horizon = mix(horizon, DUSK_TINT, warmth * 0.35);

    const horizonY = h * HORIZON;
    const arcH = h * 0.56;
    const sunPos = this.arcPosition(dayAngle, horizonY, arcH);
    const moonPos = this.arcPosition(moonAngle, horizonY, arcH * 0.9);

    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.globalAlpha = 1;

    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, rgba(zenith));
    sky.addColorStop(1, rgba(horizon));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    if (warmth > 0.02) {
      const glow = ctx.createRadialGradient(sunPos.x, Math.min(sunPos.y, horizonY), 0,
        sunPos.x, Math.min(sunPos.y, horizonY), w * 0.55);
      const glowColor = mix(SUN_LOW, PAPER, 0.25);
      glow.addColorStop(0, rgba(glowColor, 0.5 * warmth));
      glow.addColorStop(1, rgba(glowColor, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }

    const starVis = (1 - smooth(-0.28, -0.04, sunAlt)) * (1 - 0.35 * moonLight);
    if (starVis > 0.01) this.drawStars(t, dt, hours, starVis, horizonY);

    if (moonAlt > -0.1) this.drawMoon(moonPos.x, moonPos.y, phase, dayness, zenith);
    if (sunAlt > -0.1) this.drawSun(sunPos.x, sunPos.y, sunAlt);

    const kasumiColor = mix(mix(horizon, PAPER, 0.25 + 0.35 * dayness), ALPENGLOW, warmth * 0.3);
    const kasumiAlpha = 0.16 + 0.36 * dayness;
    this.drawKasumi(this._kasumi[0], t, kasumiColor, kasumiAlpha);

    const snowColor = mix(mix(SNOW_NIGHT, SNOW_DAY, dayness), ALPENGLOW, warmth * 0.55);
    this.drawLayer(this._layers[0], horizon, dayness);
    ctx.save();
    ctx.clip(this._layers[0].path);
    ctx.fillStyle = rgba(snowColor, 0.92);
    ctx.fill(this._snowPath);
    ctx.restore();

    this.drawKasumi(this._kasumi[1], t, kasumiColor, kasumiAlpha * 0.9);
    this.drawLayer(this._layers[1], horizon, dayness);
    this.drawSea(t, horizon, dayness, warmth);
    this.drawLayer(this._layers[2], horizon, dayness);
    this.drawLayer(this._layers[3], horizon, dayness);

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = this._grain;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  private sampleSky(alt: number) {
    const keys = SKY_KEYS;
    if (alt <= keys[0].alt) return { zenith: keys[0].zenith, horizon: keys[0].horizon };
    for (let i = 1; i < keys.length; i++) {
      if (alt <= keys[i].alt) {
        const f = (alt - keys[i - 1].alt) / (keys[i].alt - keys[i - 1].alt);
        return {
          zenith: mix(keys[i - 1].zenith, keys[i].zenith, f),
          horizon: mix(keys[i - 1].horizon, keys[i].horizon, f),
        };
      }
    }
    const last = keys[keys.length - 1];
    return { zenith: last.zenith, horizon: last.horizon };
  }

  // angle 0 = rising in the east (left), PI/2 = highest, PI = setting in the west (right)
  private arcPosition(angle: number, horizonY: number, arcH: number) {
    const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const s = a / Math.PI; // 0..2, only 0..1 is above the horizon
    return {
      x: this._w * (0.06 + 0.88 * (s <= 1.5 ? s : s - 2)),
      y: horizonY - Math.sin(a) * arcH,
    };
  }

  private drawStars(t: number, dt: number, hours: number, vis: number, horizonY: number) {
    const ctx = this._ctx, w = this._w;
    const cx = w / 2, cy = this._starCenterY;
    const rot = hours / 24 * Math.PI * 2;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const fadeBand = this._h * 0.22;
    const twinkle = !this._reducedMotion;

    // milky way haze, turning with the stars
    const mw = this._milkyWay;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot + mw.tilt);
    const band = ctx.createLinearGradient(0, -mw.offset - mw.width, 0, -mw.offset + mw.width);
    band.addColorStop(0, 'rgba(200,210,235,0)');
    band.addColorStop(0.5, `rgba(200,210,235,${0.05 * vis})`);
    band.addColorStop(1, 'rgba(200,210,235,0)');
    ctx.fillStyle = band;
    ctx.fillRect(-mw.half, -mw.offset - mw.width, mw.half * 2, mw.width * 2);
    ctx.restore();

    let start = 0;
    for (let b = 0; b < 3; b++) {
      ctx.fillStyle = STAR_COLORS[b];
      const end = this._starBucketEnds[b];
      for (let i = start; i < end; i++) {
        const sx = this._starX[i], sy = this._starY[i];
        const x = cx + sx * cos - sy * sin;
        if (x < -2 || x > w + 2) continue;
        const y = cy + sx * sin + sy * cos;
        if (y < -2 || y > horizonY) continue;
        let a = vis * this._starBright[i] * clamp01((horizonY - y) / fadeBand);
        if (twinkle) a *= 0.72 + 0.28 * Math.sin(t * 2.1 + this._starPhase[i]);
        if (a < 0.03) continue;
        const s = this._starSize[i];
        ctx.globalAlpha = a;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      start = end;
    }
    ctx.globalAlpha = 1;

    if (twinkle) this.drawMeteor(dt, vis, horizonY);
  }

  private drawMeteor(dt: number, vis: number, horizonY: number) {
    const ctx = this._ctx;
    if (!this._meteor && vis > 0.7 && Math.random() < dt / 50) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this._meteor = {
        x: this._w * (0.15 + Math.random() * 0.7), y: horizonY * (0.05 + Math.random() * 0.3),
        vx: dir * (260 + Math.random() * 160), vy: 120 + Math.random() * 80, life: 0.7,
      };
    }
    const m = this._meteor;
    if (!m) return;
    m.life -= dt;
    if (m.life <= 0) { this._meteor = null; return; }
    m.x += m.vx * dt; m.y += m.vy * dt;
    const tail = 0.18;
    const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
    g.addColorStop(0, `rgba(255,250,235,${Math.min(1, m.life * 2) * vis})`);
    g.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail); ctx.stroke();
  }

  private drawMoon(x: number, y: number, phase: number, dayness: number, zenith: RGB) {
    const ctx = this._ctx;
    const r = Math.min(this._w, this._h) * 0.024;
    const night = 1 - dayness;
    const k = Math.cos(phase * Math.PI * 2); // 1: new, -1: full
    const fullness = (1 - k) / 2;

    // wide, faint moonlight glow that grows with the phase
    const glowR = r * 9;
    const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR);
    glow.addColorStop(0, rgba(MOON_LIT, (0.1 + 0.14 * fullness) * night));
    glow.addColorStop(0.35, rgba(MOON_LIT, (0.035 + 0.05 * fullness) * night));
    glow.addColorStop(1, rgba(MOON_LIT, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);

    // barely-there earthshine instead of a hard dark disc
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(mix(zenith, MOON_LIT, 0.18), 0.35 * night);
    ctx.fill();

    if (k > 0.985) return;
    const lit = new Path2D();
    if (phase < 0.5) {
      // waxing, lit from the right
      lit.arc(x, y, r, -Math.PI / 2, Math.PI / 2, false);
      lit.ellipse(x, y, r * Math.abs(k), r, 0, Math.PI / 2, -Math.PI / 2, k < 0);
    } else {
      lit.arc(x, y, r, Math.PI / 2, Math.PI * 1.5, false);
      lit.ellipse(x, y, r * Math.abs(k), r, 0, -Math.PI / 2, Math.PI / 2, k > 0);
    }
    const alpha = 0.92 - dayness * 0.55;
    // soft rim: a slightly larger, faint copy under the lit face
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.08, 1.08);
    ctx.translate(-x, -y);
    ctx.fillStyle = rgba(MOON_LIT, alpha * 0.25);
    ctx.fill(lit);
    ctx.restore();
    // lit face, a touch warmer at the centre
    const face = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
    face.addColorStop(0, rgba(MOON_LIT, alpha));
    face.addColorStop(1, rgba(mix(MOON_LIT, zenith, 0.22), alpha));
    ctx.fillStyle = face;
    ctx.fill(lit);
  }

  private drawSun(x: number, y: number, alt: number) {
    const ctx = this._ctx;
    const low = 1 - smooth(0, 0.3, alt);
    const r = Math.min(this._w, this._h) * 0.034 * (1 + 0.15 * low);
    const color = mix(SUN_HIGH, SUN_LOW, low);

    const halo = ctx.createRadialGradient(x, y, r, x, y, r * 4.5);
    halo.addColorStop(0, rgba(color, 0.28));
    halo.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(x - r * 4.5, y - r * 4.5, r * 9, r * 9);

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color);
    ctx.fill();
  }

  private drawKasumi(k: Kasumi, t: number, color: RGB, alpha: number) {
    const ctx = this._ctx;
    const span = this._w + k.len;
    const drift = this._reducedMotion ? 0 : t * k.speed;
    const x = ((k.offset + drift) % span) - k.len;
    const g = ctx.createLinearGradient(0, 0, 0, k.height);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, alpha * 0.25));
    ctx.save();
    ctx.translate(x, this._h * k.y);
    ctx.fillStyle = g;
    ctx.fill(k.path);
    ctx.restore();
  }

  private layerColor(def: LayerDef, horizon: RGB, dayness: number): RGB {
    const base = mix(def.night, def.day, dayness);
    return mix(base, horizon, def.haze * (0.55 + 0.45 * dayness));
  }

  private drawLayer(layer: Layer, horizon: RGB, dayness: number) {
    const ctx = this._ctx;
    const color = this.layerColor(layer.def, horizon, dayness);
    const sink = layer.def.sink * this._h * this.easedClimb();

    // bokashi: each ridge is lighter at its crest and settles into a deeper tone below
    // (gradients follow the transform, so this one moves with the sinking ridge)
    const g = ctx.createLinearGradient(0, layer.top, 0, layer.top + this._h * 0.3);
    g.addColorStop(0, rgba(mix(color, horizon, 0.18)));
    g.addColorStop(1, rgba(mix(color, [0, 0, 0], 0.18)));
    ctx.save();
    ctx.translate(0, sink);
    ctx.fillStyle = g;
    ctx.fill(layer.path);
    ctx.restore();
  }

  private drawSea(t: number, horizon: RGB, dayness: number, warmth: number) {
    const c = this.easedClimb();
    if (c < 0.01) return;
    const ctx = this._ctx, h = this._h;
    const seaY = h * (1.08 - 0.42 * c);
    const top = mix(mix(hex('#4a5478'), PAPER, dayness * 0.85), ALPENGLOW, warmth * 0.4);
    const bottom = mix(top, horizon, 0.45);
    const drift = this._reducedMotion ? 0 : (t * 3) % this._seaPeriod;

    const g = ctx.createLinearGradient(0, -20, 0, h * 0.25);
    g.addColorStop(0, rgba(top, 0.96));
    g.addColorStop(1, rgba(bottom, 0.96));
    ctx.save();
    ctx.translate(-drift, seaY);
    ctx.fillStyle = g;
    ctx.fill(this._seaPath);
    ctx.restore();
  }

  private easedClimb() {
    const c = this._climb;
    return c * c * (3 - 2 * c);
  }
}
