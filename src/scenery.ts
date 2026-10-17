import { stateHandle } from "./state";
import { PUYO_COLORS } from "./config";

// Background scenery: sky, stars, sun/moon and layered ridges in a flat woodblock-print style.
// The sky follows the player's local clock, and every minute of play pushes it one hour ahead.
// The season follows the real date. Climbing progress (0..1) sinks the near ridges and lifts
// a sea of clouds, and each step up releases spirit lights in the player's puyo colors.
//
// Debug params: ?sky=5.5 fixes the starting hour, ?skyspeed=10 multiplies how fast play advances it,
// ?climb=0.8 starts partway up, ?season=spring|summer|autumn|winter overrides the season,
// ?orbs releases a burst of spirit lights on load.

type RGB = [number, number, number];

const FPS = 20;
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

// keyed by sun altitude (-1: midnight, 0: horizon, 1: noon), loosely after traditional Japanese colors:
// 濃藍 deep indigo, 瑠璃 lapis, 藤 wisteria, 鴇 toki pink, 柿 persimmon, 浅葱 asagi, 鳥の子 eggshell
const SKY_KEYS: { alt: number, zenith: RGB, mid: RGB, horizon: RGB }[] = [
  { alt: -1.0, zenith: hex('#070a1f'), mid: hex('#121a3e'), horizon: hex('#1f2a55') },
  { alt: -0.32, zenith: hex('#0a0f2c'), mid: hex('#17224e'), horizon: hex('#2a3566') },
  { alt: -0.16, zenith: hex('#121a48'), mid: hex('#2a3570'), horizon: hex('#4f4a80') },
  { alt: -0.06, zenith: hex('#1e2c66'), mid: hex('#4c4f8e'), horizon: hex('#b47a8a') },
  { alt: 0.0, zenith: hex('#2c4a8a'), mid: hex('#8c7ca8'), horizon: hex('#f0a066') },
  { alt: 0.08, zenith: hex('#3f6aa8'), mid: hex('#c79ca4'), horizon: hex('#f5c98e') },
  { alt: 0.25, zenith: hex('#3a78bf'), mid: hex('#78acd2'), horizon: hex('#e6dfc6') },
  { alt: 1.0, zenith: hex('#2a66b0'), mid: hex('#6aa6d4'), horizon: hex('#cfe3dc') },
];
const DUSK_HORIZON = hex('#d0573a'); // 茜 madder
const DUSK_MID = hex('#a65a78');
const TOP_BAND = hex('#050818');
const VERMILION = hex('#c8432a');
const SHADOW_INK = hex('#141a3c');
const PAPER = hex('#f4ead8');
const SNOW_DAY = hex('#eef1f2');
const SNOW_NIGHT = hex('#3a4467');
const ALPENGLOW = hex('#f09a7c');
const SUN_LOW = hex('#e04f2e');
const SUN_HIGH = hex('#fff2d2');
const MOON_LIT = hex('#f1ead4');
const STAR_COLORS = ['#ffffff', '#ffe9c7', '#d4e2ff'];

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// per layer [far .. near]: a color the layer leans toward in that season, and how much
const SEASON_TINT: Record<Season, ([RGB, number] | null)[]> = {
  spring: [null, [hex('#8f8fb0'), 0.12], [hex('#c993a6'), 0.22], [hex('#3d5a3a'), 0.1]],
  summer: [null, [hex('#4f7f74'), 0.12], [hex('#3f6f3a'), 0.2], [hex('#1f4626'), 0.2]],
  autumn: [null, [hex('#8c6a5c'), 0.24], [hex('#c4532a'), 0.5], [hex('#5e2a1e'), 0.36]],
  winter: [null, [hex('#9aa8bc'), 0.25], [hex('#7e8c9e'), 0.3], [hex('#3a4654'), 0.22]],
};
const SNOWLINE: Record<Season, number> = { spring: 0.075, summer: 0.04, autumn: 0.065, winter: 0.12 };

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
    day: hex('#8496a9'), night: hex('#27315c'), haze: 0.5, sink: 0, trees: 0, treeH: 0
  },
  {
    base: 0.62, amp: 0.05, freq: 9, crag: 0.006,
    peaks: [{ x: 0.04, h: 0.09, wl: 0.1, wr: 0.14 }, { x: 0.66, h: 0.07, wl: 0.14, wr: 0.1 }],
    day: hex('#62797f'), night: hex('#192145'), haze: 0.36, sink: 0.05, trees: 0, treeH: 0
  },
  {
    base: 0.72, amp: 0.04, freq: 12, crag: 0.004,
    peaks: [{ x: 0.34, h: 0.05, wl: 0.1, wr: 0.1 }, { x: 0.93, h: 0.06, wl: 0.1, wr: 0.1 }],
    day: hex('#40594f'), night: hex('#0e142b'), haze: 0.2, sink: 0.16, trees: 22, treeH: 11
  },
  {
    base: 0.86, amp: 0.03, freq: 10, crag: 0.003,
    peaks: [{ x: -0.02, h: 0.15, wl: 0.24, wr: 0.24 }, { x: 1.03, h: 0.17, wl: 0.26, wr: 0.26 }],
    day: hex('#22372e'), night: hex('#05080f'), haze: 0.08, sink: 0.32, trees: 9, treeH: 22
  },
];

interface Layer { def: LayerDef, path: Path2D, top: number, ys: number[] }
interface Particle { x: number, y: number, vx: number, vy: number, rot: number, vr: number, size: number, phase: number, color: number }
interface Orb { x: number, y: number, vy: number, sway: number, phase: number, life: number, age: number, size: number, sprite: HTMLCanvasElement }
interface Bird { dx: number, dy: number, phase: number, size: number }
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
  private _constellations: { xs: number[], ys: number[], edges: [number, number][], tint: string }[] = [];

  private _season: Season;
  private _seasonOverride: Season | null = null;
  private _shadowPaths: { x: number, left: Path2D, right: Path2D }[] = [];
  private _torii: { path: Path2D, x: number, y: number, size: number } | null = null;
  private _leafPath: Path2D;
  private _particles: Particle[] = [];
  private _orbs: Orb[] = [];
  private _sprites = new Map<string, HTMLCanvasElement>();
  private _flock: { x: number, y: number, vx: number, birds: Bird[] } | null = null;

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
    const season = params.get('season');
    if (season === 'spring' || season === 'summer' || season === 'autumn' || season === 'winter') {
      this._seasonOverride = season;
    }
    if (params.has('orbs')) setTimeout(() => this.releaseOrbs(40), 300);

    this._grain = this.makeGrain();
    window.addEventListener('resize', () => { this._needsBuild = true; });

    this._lastTick = performance.now();
    requestAnimationFrame(this.frame);
  }

  setClimb(progress: number) {
    const next = clamp01(progress);
    // every step up the mountain sends lights up from the valley
    if (next > this._climbTarget + 1e-4) this.releaseOrbs(next >= 1 ? 40 : 14);
    this._climbTarget = next;
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

    if (this._needsBuild || this.currentSeason() !== this._season) this.build();
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

  private currentSeason(): Season {
    if (this._seasonOverride) return this._seasonOverride;
    const month = new Date(Date.now() + this._playHours * 3600000).getMonth() + 1;
    return month <= 2 || month === 12 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn';
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

    this._season = this.currentSeason();
    const rand = seeded(1183);
    this._layers = LAYERS.map(def => this.buildLayer(def, rand));
    this._snowPath = this.buildSnow(this._layers[0], rand);
    this.buildShadows(rand);
    this.buildTorii();
    this.buildSea(rand);
    this.buildKasumi(rand);
    this.buildStars(rand);
    this.buildParticles(rand);
  }

  // shadow faces on the big peaks: everything on one side of a jagged line running down from the summit
  private buildShadows(rand: () => number) {
    const far = this._layers[0];
    const step = 4, h = this._h, w = this._w;
    this._shadowPaths = far.def.peaks.filter(p => p.h >= 0.21).map(p => {
      let best = -1;
      for (let i = 0; i < far.ys.length; i++) {
        const xf = (-10 + i * step) / w;
        if (xf < p.x - p.wl * 0.5 || xf > p.x + p.wr * 0.5) continue;
        if (best < 0 || far.ys[i] < far.ys[best]) best = i;
      }
      const sx = -10 + best * step, sy = far.ys[best];
      // the face stays within the peak's own slope so it never spills onto neighbouring hills
      const make = (dir: number) => {
        const side = (dir > 0 ? p.wr : p.wl) * w;
        const baseY = far.def.base * h;
        const path = new Path2D();
        path.moveTo(sx, sy - 10);
        const n = 10;
        for (let k = 1; k <= n; k++) {
          const f = k / n;
          // a ridge line that wanders down and outward from the summit
          path.lineTo(sx + dir * (side * 0.32 * f + (rand() - 0.5) * w * 0.008), sy + (baseY - sy) * f);
        }
        // keep the same diagonal below the base so the face doesn't turn into a vertical strip
        path.lineTo(sx + dir * side * 0.32 * (h - sy) / (baseY - sy), h);
        path.lineTo(sx + dir * side, h);
        path.lineTo(sx + dir * side * 0.5, sy - 10);
        path.closePath();
        return path;
      };
      return { x: sx, left: make(-1), right: make(1) };
    });
  }

  private buildTorii() {
    const layer = this._layers[2];
    const step = 4;
    const x = this._w * 0.115;
    const y = layer.ys[Math.round((x + 10) / step)] + 1;
    const s = Math.max(14, this._h * 0.034);
    const path = new Path2D();
    // pillars, slightly splayed
    path.moveTo(-0.4 * s, 0); path.lineTo(-0.33 * s, -0.95 * s); path.lineTo(-0.25 * s, -0.95 * s); path.lineTo(-0.3 * s, 0);
    path.moveTo(0.4 * s, 0); path.lineTo(0.33 * s, -0.95 * s); path.lineTo(0.25 * s, -0.95 * s); path.lineTo(0.3 * s, 0);
    // nuki (tie beam) and gakuzuka (centre strut)
    path.rect(-0.52 * s, -0.74 * s, 1.04 * s, 0.07 * s);
    path.rect(-0.035 * s, -0.95 * s, 0.07 * s, 0.22 * s);
    // shimaki and the upswept kasagi on top
    path.rect(-0.5 * s, -0.98 * s, 1.0 * s, 0.07 * s);
    path.moveTo(-0.66 * s, -1.12 * s);
    path.quadraticCurveTo(0, -1.0 * s, 0.66 * s, -1.12 * s);
    path.lineTo(0.6 * s, -0.98 * s);
    path.quadraticCurveTo(0, -0.93 * s, -0.6 * s, -0.98 * s);
    path.closePath();
    this._torii = { path, x, y, size: s };
  }

  private buildParticles(rand: () => number) {
    if (!this._leafPath) {
      // five-lobed maple leaf, unit size
      const leaf = new Path2D();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * Math.PI * 0.32;
        const b = a + Math.PI * 0.16;
        if (i === 0) leaf.moveTo(Math.cos(a), Math.sin(a));
        else leaf.lineTo(Math.cos(a), Math.sin(a));
        if (i < 4) leaf.lineTo(Math.cos(b) * 0.42, Math.sin(b) * 0.42);
      }
      leaf.lineTo(0.12, 0.35); leaf.lineTo(0.05, 0.9); leaf.lineTo(-0.05, 0.9); leaf.lineTo(-0.12, 0.35);
      leaf.closePath();
      this._leafPath = leaf;
    }
    const area = this._w * this._h / (1440 * 900);
    const count = Math.round(area * ({ spring: 26, summer: 22, autumn: 20, winter: 70 } as Record<Season, number>)[this._season]);
    this._particles = Array.from({ length: count }, () => this.newParticle(rand, true));
  }

  private newParticle(rand: () => number, anywhere: boolean): Particle {
    const season = this._season;
    const p: Particle = {
      x: rand() * this._w, y: anywhere ? rand() * this._h : -20,
      vx: 0, vy: 0, rot: rand() * Math.PI * 2, vr: (rand() - 0.5) * 2,
      size: 0, phase: rand() * Math.PI * 2, color: Math.floor(rand() * 4),
    };
    if (season === 'spring') { p.vx = 14 + rand() * 12; p.vy = 18 + rand() * 14; p.size = 3 + rand() * 2.5; }
    else if (season === 'autumn') { p.vx = 8 + rand() * 14; p.vy = 22 + rand() * 18; p.size = 5 + rand() * 4; }
    else if (season === 'winter') { p.vx = 4 + rand() * 8; p.vy = 16 + rand() * 22; p.size = 1 + rand() * 2.2; }
    else {
      // fireflies hover over the lower slopes
      p.y = this._h * (0.66 + rand() * 0.32);
      p.size = 10 + rand() * 6;
    }
    return p;
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
    return { def, path, top, ys };
  }

  private buildSnow(far: Layer, rand: () => number): Path2D {
    const noise = this.makeNoise(rand);
    const gully = this.makeNoise(rand);
    const snowLine = far.top + this._h * SNOWLINE[this._season];
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

    // "puyo constellations": groups of four stars linked like connected puyos
    const shapes = [[[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [0, 1], [1, 1], [1, 2]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]]];
    const tints = ['#ffb4a8', '#a8c4ff', '#b4f0b8', '#ffe7a0'];
    this._constellations = Array.from({ length: 4 }, (_, i) => {
      const shape = shapes[i];
      const a = -Math.PI / 2 + (i - 1.5) * 0.42 + (rand() - 0.5) * 0.2;
      const r = rMin + (rMax - rMin) * (0.3 + rand() * 0.45);
      const gap = h * (0.04 + rand() * 0.015);
      const turn = rand() * Math.PI * 2;
      const xs: number[] = [], ysC: number[] = [];
      for (const [gx, gy] of shape) {
        const lx = gx * gap, ly = gy * gap;
        xs.push(Math.cos(a) * r + lx * Math.cos(turn) - ly * Math.sin(turn));
        ysC.push(Math.sin(a) * r + lx * Math.sin(turn) + ly * Math.cos(turn));
      }
      const edges: [number, number][] = [];
      for (let m = 0; m < 4; m++) for (let n = m + 1; n < 4; n++) {
        if (Math.abs(shape[m][0] - shape[n][0]) + Math.abs(shape[m][1] - shape[n][1]) === 1) edges.push([m, n]);
      }
      return { xs, ys: ysC, edges, tint: tints[i] };
    });

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

    let { zenith, mid, horizon } = this.sampleSky(sunAlt);
    if (evening) {
      horizon = mix(horizon, DUSK_HORIZON, warmth * 0.45);
      mid = mix(mid, DUSK_MID, warmth * 0.4);
    }

    const horizonY = h * HORIZON;
    const arcH = h * 0.56;
    const sunPos = this.arcPosition(dayAngle, horizonY, arcH);
    const moonPos = this.arcPosition(moonAngle, horizonY, arcH * 0.9);

    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.globalAlpha = 1;

    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, rgba(zenith));
    sky.addColorStop(0.55, rgba(mid));
    sky.addColorStop(1, rgba(horizon));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // ichimonji-bokashi: the dark band printed along the top edge of a woodblock sky
    const band = ctx.createLinearGradient(0, 0, 0, h * 0.16);
    band.addColorStop(0, rgba(mix(zenith, TOP_BAND, 0.55), 0.75));
    band.addColorStop(1, rgba(mix(zenith, TOP_BAND, 0.55), 0));
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, w, h * 0.16);

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
    if (dayness > 0.5 && !this._reducedMotion) this.drawBirds(dt, dayness);

    const kasumiColor = mix(mix(mid, PAPER, 0.3 + 0.4 * dayness), ALPENGLOW, warmth * 0.35);
    const kasumiAlpha = 0.16 + 0.36 * dayness;
    this.drawKasumi(this._kasumi[0], t, kasumiColor, kasumiAlpha);

    const snowColor = mix(mix(SNOW_NIGHT, SNOW_DAY, dayness), ALPENGLOW, warmth * 0.55);
    this.drawLayer(this._layers[0], 0, horizon, dayness);
    ctx.save();
    ctx.clip(this._layers[0].path);
    ctx.fillStyle = rgba(snowColor, 0.92);
    ctx.fill(this._snowPath);
    // shade the side of each big peak facing away from the light
    const lightX = dayness > 0.3 || moonAlt < 0 ? sunPos.x : moonPos.x;
    ctx.fillStyle = rgba(SHADOW_INK, 0.08 + 0.12 * dayness + 0.08 * warmth);
    for (const sp of this._shadowPaths) ctx.fill(lightX < sp.x ? sp.right : sp.left);
    ctx.restore();

    this.drawKasumi(this._kasumi[1], t, kasumiColor, kasumiAlpha * 0.9);
    this.drawLayer(this._layers[1], 1, horizon, dayness);
    this.drawSea(t, horizon, dayness, warmth);
    this.drawLayer(this._layers[2], 2, horizon, dayness);
    this.drawTorii(horizon, dayness);
    this.drawLayer(this._layers[3], 3, horizon, dayness);

    if (!this._reducedMotion) {
      this.drawParticles(t, dt, dayness);
      this.drawOrbs(dt);
    }

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = this._grain;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  private sampleSky(alt: number) {
    const keys = SKY_KEYS;
    let i = 1;
    while (i < keys.length - 1 && alt > keys[i].alt) i++;
    const a = keys[i - 1], b = keys[i];
    const f = clamp01((alt - a.alt) / (b.alt - a.alt));
    return { zenith: mix(a.zenith, b.zenith, f), mid: mix(a.mid, b.mid, f), horizon: mix(a.horizon, b.horizon, f) };
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

    ctx.lineWidth = 1;
    for (const c of this._constellations) {
      const px = c.xs.map((sx, i) => cx + sx * cos - c.ys[i] * sin);
      const py = c.xs.map((sx, i) => cy + sx * sin + c.ys[i] * cos);
      if (px.every(x => x < 0 || x > w) || py.every(y => y > horizonY)) continue;
      const fade = clamp01((horizonY - Math.max(...py)) / fadeBand);
      ctx.globalAlpha = 0.22 * vis * fade;
      ctx.strokeStyle = c.tint;
      ctx.beginPath();
      for (const [m, n] of c.edges) { ctx.moveTo(px[m], py[m]); ctx.lineTo(px[n], py[n]); }
      ctx.stroke();
      ctx.fillStyle = c.tint;
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = vis * fade * (twinkle ? 0.8 + 0.2 * Math.sin(t * 1.7 + i) : 1);
        ctx.beginPath();
        ctx.arc(px[i], py[i], 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
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

  private layerColor(index: number, horizon: RGB, dayness: number): RGB {
    const def = LAYERS[index];
    let base = mix(def.night, def.day, dayness);
    const tint = SEASON_TINT[this._season][index];
    if (tint) base = mix(base, tint[0], tint[1] * (0.35 + 0.65 * dayness));
    return mix(base, horizon, def.haze * (0.25 + 0.75 * dayness));
  }

  private drawLayer(layer: Layer, index: number, horizon: RGB, dayness: number) {
    const ctx = this._ctx;
    const color = this.layerColor(index, horizon, dayness);
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

  private drawTorii(horizon: RGB, dayness: number) {
    const torii = this._torii;
    if (!torii) return;
    const ctx = this._ctx;
    const sink = LAYERS[2].sink * this._h * this.easedClimb();
    const x = torii.x, y = torii.y + sink, s = torii.size;
    if (y - s * 1.2 > this._h) return;
    const night = 1 - dayness;

    // a warm glow from the shrine at night
    if (night > 0.2) {
      const glow = ctx.createRadialGradient(x, y - s * 0.4, 0, x, y - s * 0.4, s * 2.6);
      glow.addColorStop(0, `rgba(255,190,110,${0.3 * night})`);
      glow.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - s * 2.6, y - s * 3, s * 5.2, s * 5.2);
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = rgba(mix(mix(VERMILION, this.layerColor(2, horizon, dayness), 0.25), SHADOW_INK, night * 0.55));
    ctx.fill(torii.path);
    ctx.restore();
  }

  private drawParticles(t: number, dt: number, dayness: number) {
    const ctx = this._ctx, w = this._w, h = this._h;
    const season = this._season;
    const night = 1 - dayness;
    if (season === 'summer') {
      // fireflies only come out after dusk
      if (night < 0.3) return;
      const sprite = this.glowSprite('rgba(214, 240, 120, 1)');
      for (const p of this._particles) {
        p.x += Math.cos(p.phase + t * 0.5) * 14 * dt;
        p.y += Math.sin(p.phase * 1.7 + t * 0.4) * 8 * dt;
        const blink = Math.pow(Math.max(0, Math.sin(t * 1.2 + p.phase * 3)), 3);
        if (blink < 0.02) continue;
        ctx.globalAlpha = blink * night;
        ctx.drawImage(sprite, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      return;
    }

    const palettes: Record<Season, string[]> = {
      spring: ['#f6cdd6', '#f2b8c6', '#fbe3e8', '#efc0cc'],
      autumn: ['#c8442c', '#d9752c', '#e0a33a', '#a8322a'],
      winter: ['#ffffff', '#f2f6ff', '#e8eef8', '#ffffff'],
      summer: [],
    };
    const colors = palettes[season].map(c => rgba(mix(hex(c), SHADOW_INK, night * 0.55)));
    for (const p of this._particles) {
      p.x += (p.vx + Math.sin(t * 0.9 + p.phase) * 18) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > h + 20 || p.x > w + 20) Object.assign(p, this.newParticle(Math.random, false), { x: Math.random() * w * 1.2 - w * 0.2 });

      ctx.fillStyle = colors[p.color];
      if (season === 'winter') {
        ctx.globalAlpha = 0.85;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        continue;
      }
      ctx.globalAlpha = 0.9;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (season === 'spring') {
        // petals flutter: squash horizontally as they turn
        ctx.scale(Math.abs(Math.cos(t * 2 + p.phase)) * 0.7 + 0.3, 1);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.scale(p.size, p.size * (Math.abs(Math.cos(t * 1.5 + p.phase)) * 0.6 + 0.4));
        ctx.fill(this._leafPath);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private releaseOrbs(count: number) {
    if (this._reducedMotion) return;
    const colors = PUYO_COLORS.slice(1).filter(Boolean) as string[];
    for (let i = 0; i < count; i++) {
      const size = 10 + Math.random() * 14;
      this._orbs.push({
        x: this._w * (0.05 + Math.random() * 0.9), y: this._h + 20 + Math.random() * this._h * 0.3,
        vy: 40 + Math.random() * 50, sway: 8 + Math.random() * 20, phase: Math.random() * Math.PI * 2,
        life: 6 + Math.random() * 4, age: 0, size,
        sprite: this.glowSprite(colors[i % colors.length]),
      });
    }
  }

  private drawOrbs(dt: number) {
    if (this._orbs.length === 0) return;
    const ctx = this._ctx;
    for (const o of this._orbs) {
      o.age += dt;
      o.y -= o.vy * dt;
      const x = o.x + Math.sin(o.age * 1.3 + o.phase) * o.sway;
      const a = Math.min(1, o.age / 1.2) * clamp01((o.life - o.age) / 2);
      ctx.globalAlpha = a * 0.9;
      ctx.drawImage(o.sprite, x - o.size / 2, o.y - o.size / 2, o.size, o.size);
    }
    ctx.globalAlpha = 1;
    this._orbs = this._orbs.filter(o => o.age < o.life);
  }

  // soft glowing dot in the given css color, cached per color
  private glowSprite(color: string): HTMLCanvasElement {
    let sprite = this._sprites.get(color);
    if (sprite) return sprite;
    const m = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    const c: RGB = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [255, 255, 255];
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = 48;
    const g = sprite.getContext('2d');
    const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, rgba(mix(c, [255, 255, 255], 0.75)));
    grad.addColorStop(0.18, rgba(mix(c, [255, 255, 255], 0.3), 0.9));
    grad.addColorStop(0.45, rgba(c, 0.3));
    grad.addColorStop(1, rgba(c, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    this._sprites.set(color, sprite);
    return sprite;
  }

  private drawBirds(dt: number, dayness: number) {
    const ctx = this._ctx;
    if (!this._flock && Math.random() < dt / 40) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const n = 4 + Math.floor(Math.random() * 4);
      this._flock = {
        x: dir > 0 ? -60 : this._w + 60, y: this._h * (0.16 + Math.random() * 0.22), vx: dir * (38 + Math.random() * 18),
        // loose V formation
        birds: Array.from({ length: n }, (_, i) => ({
          dx: -dir * Math.ceil(i / 2) * (14 + Math.random() * 6), dy: (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 7 + Math.random() * 4,
          phase: Math.random() * Math.PI * 2, size: 4 + Math.random() * 2,
        })),
      };
    }
    const f = this._flock;
    if (!f) return;
    f.x += f.vx * dt;
    if (f.x < -200 || f.x > this._w + 200) { this._flock = null; return; }
    ctx.strokeStyle = rgba(SHADOW_INK, 0.55 * dayness);
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const now = performance.now() / 1000;
    for (const b of f.birds) {
      const x = f.x + b.dx, y = f.y + b.dy;
      const flap = Math.sin(now * 7 + b.phase) * b.size * 0.6;
      ctx.moveTo(x - b.size, y - flap);
      ctx.quadraticCurveTo(x - b.size * 0.4, y - b.size * 0.3, x, y);
      ctx.quadraticCurveTo(x + b.size * 0.4, y - b.size * 0.3, x + b.size, y - flap);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
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
