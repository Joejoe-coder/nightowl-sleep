/**
 * 程序化白噪音引擎：所有声音由 DSP 算法实时生成，
 * 零音频文件、零版权成本、循环无接缝（调制频率取缓冲周期长度的整数倍）。
 */

const SR = 44100;

export type SoundPreset = {
  id: string;
  name: string;
  desc: string;
  seconds: number;
  gen: (n: number) => Float32Array;
};

/* ---------- 基础噪声 ---------- */

function white(n: number): Float32Array {
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return d;
}

/** Paul Kellet 近似粉红噪声 */
function pink(n: number): Float32Array {
  const d = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + 0.029591 * w;
    b1 = 0.985 * b1 + 0.032534 * w;
    b2 = 0.95 * b2 + 0.048056 * w;
    d[i] = (b0 + b1 + b2 + w * 0.05) * 0.25;
  }
  return d;
}

function brown(n: number): Float32Array {
  const d = new Float32Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3.5;
  }
  return d;
}

/* ---------- 滤波与包络 ---------- */

function lowpass(d: Float32Array, cutoff: number): Float32Array {
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / SR;
  const a = dt / (rc + dt);
  const out = new Float32Array(d.length);
  let y = 0;
  for (let i = 0; i < d.length; i++) {
    y += a * (d[i] - y);
    out[i] = y;
  }
  return out;
}

function highpass(d: Float32Array, cutoff: number): Float32Array {
  const lp = lowpass(d, cutoff);
  const out = new Float32Array(d.length);
  for (let i = 0; i < d.length; i++) out[i] = d[i] - lp[i];
  return out;
}

/** 峰值归一化到 target */
function norm(d: Float32Array, target = 0.85): Float32Array {
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak < 1e-6) return d;
  const g = target / peak;
  for (let i = 0; i < d.length; i++) d[i] *= g;
  return d;
}

function mix(...parts: Float32Array[]): Float32Array {
  const n = Math.max(...parts.map((p) => p.length));
  const out = new Float32Array(n);
  for (const p of parts) for (let i = 0; i < p.length; i++) out[i] += p[i];
  return out;
}

function scale(d: Float32Array, g: number): Float32Array {
  for (let i = 0; i < d.length; i++) d[i] *= g;
  return d;
}

/** 稀疏脉冲：短促衰减的噪声颗粒（雨滴、柴火噼啪等） */
function addGrains(
  base: Float32Array,
  count: number,
  opts: { minLen: number; maxLen: number; gain: number; hp?: number },
): Float32Array {
  const n = base.length;
  for (let k = 0; k < count; k++) {
    const pos = Math.floor(Math.random() * (n - opts.maxLen - 1));
    const len = Math.floor(
      opts.minLen + Math.random() * (opts.maxLen - opts.minLen),
    );
    const g = opts.gain * (0.4 + Math.random() * 0.6);
    const grain = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const env = Math.exp(-i / (len * 0.25));
      grain[i] = (Math.random() * 2 - 1) * env * g;
    }
    const shaped = opts.hp ? highpass(grain, opts.hp) : grain;
    for (let i = 0; i < len; i++) base[pos + i] += shaped[i];
  }
  return base;
}

/** 正弦音（频率取整数个周期，保证无缝循环） */
function sine(
  n: number,
  freq: number,
  gain: number,
  envFn?: (t: number, T: number) => number,
): Float32Array {
  const T = n / SR;
  const cycles = Math.max(1, Math.round(freq * T));
  const f = cycles / T;
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = envFn ? envFn(t, T) : 1;
    d[i] = Math.sin(2 * Math.PI * f * t) * gain * env;
  }
  return d;
}

/* ---------- 具体声景 ---------- */

function genRain(n: number): Float32Array {
  const base = scale(lowpass(white(n), 1400), 0.9);
  scale(highpass(white(n), 3000), 0.06).forEach((v, i) => (base[i] += v));
  addGrains(base, Math.floor(n / SR) * 14, {
    minLen: 200,
    maxLen: 900,
    gain: 0.25,
    hp: 1500,
  });
  return norm(base);
}

function genStorm(n: number): Float32Array {
  const base = scale(lowpass(white(n), 1100), 0.55);
  scale(brown(n), 0.25).forEach((v, i) => (base[i] += v));
  // 远处雷声：低频隆隆，慢起慢落
  const T = n / SR;
  const rumbles = 2 + Math.floor(Math.random() * 2);
  for (let r = 0; r < rumbles; r++) {
    const start = Math.random() * (T - 3);
    const len = Math.floor((2 + Math.random() * 1.5) * SR);
    const pos = Math.floor(start * SR);
    const rumble = lowpass(white(len), 90);
    for (let i = 0; i < len && pos + i < n; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 0.6) * Math.exp(-t / 1.1);
      base[pos + i] += rumble[i] * env * 2.2;
    }
  }
  return norm(base);
}

function genWaves(n: number): Float32Array {
  const T = n / SR;
  const cycles = 2; // 每个缓冲两次涨落，整周期无缝
  const body = brown(n);
  const foam = lowpass(white(n), 900);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const ph = 2 * Math.PI * cycles * (t / T);
    const swell = 0.5 + 0.5 * Math.sin(ph);
    const foamPh = 0.5 + 0.5 * Math.sin(ph - 0.9);
    out[i] = body[i] * (0.35 + 0.85 * swell) + foam[i] * 0.5 * foamPh;
  }
  return norm(out);
}

function genStream(n: number): Float32Array {
  const body = highpass(white(n), 900);
  const gurgle = lowpass(white(n), 500);
  const out = new Float32Array(n);
  const T = n / SR;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const wob = 0.75 + 0.25 * Math.sin(2 * Math.PI * 7 * (t / T) * T); // 7 整周期
    out[i] = body[i] * 0.45 * wob + gurgle[i] * 0.8;
  }
  return norm(out);
}

function genWaterfall(n: number): Float32Array {
  const base = mix(scale(brown(n), 0.9), scale(lowpass(white(n), 2500), 0.5));
  return norm(base);
}

function genWind(n: number): Float32Array {
  const src = pink(n);
  const out = new Float32Array(n);
  const T = n / SR;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const lfo = Math.sin(2 * Math.PI * 3 * (t / T));
    const cutoff = 300 + 500 * (0.5 + 0.5 * lfo);
    const rc = 1 / (2 * Math.PI * cutoff);
    const a = 1 / SR / (rc + 1 / SR);
    y += a * (src[i] - y);
    out[i] = y * (1.6 + 0.7 * lfo);
  }
  return norm(out);
}

function genFire(n: number): Float32Array {
  const base = scale(lowpass(brown(n), 350), 1.1);
  addGrains(base, Math.floor(n / SR) * 22, {
    minLen: 60,
    maxLen: 500,
    gain: 0.5,
    hp: 900,
  });
  addGrains(base, Math.floor(n / SR) * 3, {
    minLen: 800,
    maxLen: 2200,
    gain: 0.7,
    hp: 500,
  });
  return norm(base);
}

function genFan(n: number): Float32Array {
  const body = scale(lowpass(white(n), 320), 1.4);
  const hum = sine(n, 110, 0.05);
  const out = mix(body, hum);
  return norm(out);
}

function genTrain(n: number): Float32Array {
  const base = scale(lowpass(brown(n), 240), 1.2);
  // 铁轨接缝「哐当-哐当」：每 0.72s 一对
  const period = 0.72;
  const clicks = Math.floor(n / SR / period);
  for (let c = 0; c < clicks; c++) {
    for (const off of [0, 0.14]) {
      const pos = Math.floor((c * period + off) * SR);
      const len = Math.floor(0.05 * SR);
      for (let i = 0; i < len && pos + i < n; i++) {
        const env = Math.exp(-i / (len * 0.2));
        base[pos + i] += (Math.random() * 2 - 1) * env * 0.55;
      }
    }
  }
  return norm(base);
}

function genPurr(n: number): Float32Array {
  const body = lowpass(brown(n), 180);
  const out = new Float32Array(n);
  const T = n / SR;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const purr = 0.55 + 0.45 * Math.sin(2 * Math.PI * 25 * t); // 25Hz 呼噜振动
    const breath = 0.65 + 0.35 * Math.sin(2 * Math.PI * (3 / T) * t); // 3 次呼吸/缓冲
    out[i] = body[i] * 1.6 * purr * breath;
  }
  return norm(out);
}

function genHeartbeat(n: number): Float32Array {
  const out = new Float32Array(n);
  const T = n / SR;
  const beats = Math.round(T); // 60 bpm，整拍无缝
  for (let b = 0; b < beats; b++) {
    for (const [off, g, f] of [
      [0, 0.9, 55],
      [0.18, 0.55, 48],
    ] as const) {
      const pos = Math.floor(((b * T) / beats + off) * SR);
      const len = Math.floor(0.22 * SR);
      for (let i = 0; i < len && pos + i < n; i++) {
        const t = i / SR;
        out[pos + i] += Math.sin(2 * Math.PI * f * t) * g * Math.exp(-t / 0.07);
      }
    }
  }
  return norm(out, 0.8);
}

function genCrickets(n: number): Float32Array {
  const out = new Float32Array(n);
  const T = n / SR;
  const chirps = 5;
  for (let c = 0; c < chirps; c++) {
    const start = 0.2 + (c + Math.random() * 0.5) * ((T - 0.8) / chirps);
    const pulses = 4 + Math.floor(Math.random() * 3);
    for (let p = 0; p < pulses; p++) {
      const pos = Math.floor((start + p * 0.075) * SR);
      const len = Math.floor(0.045 * SR);
      const f = 4100 + Math.random() * 500;
      for (let i = 0; i < len && pos + i < n; i++) {
        const t = i / SR;
        const env = Math.sin((Math.PI * i) / len);
        out[pos + i] += Math.sin(2 * Math.PI * f * t) * env * 0.32;
      }
    }
  }
  return norm(out, 0.7);
}

function genRainWindow(n: number): Float32Array {
  const base = scale(lowpass(white(n), 700), 1.0);
  addGrains(base, Math.floor(n / SR) * 8, {
    minLen: 400,
    maxLen: 1600,
    gain: 0.45,
    hp: 2200,
  });
  return norm(base);
}

function genForestNight(n: number): Float32Array {
  const windSrc = pink(n);
  const out = new Float32Array(n);
  const T = n / SR;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const lfo = Math.sin(2 * Math.PI * 2 * (t / T));
    const a = 1 / SR / (1 / (2 * Math.PI * (180 + 160 * (0.5 + 0.5 * lfo))) + 1 / SR);
    y += a * (windSrc[i] - y);
    out[i] = y * 1.5;
  }
  // 稀疏虫鸣
  const chirps = genCrickets(n);
  for (let i = 0; i < n; i++) out[i] += chirps[i] * 0.5;
  return norm(out);
}

function genDeepSpace(n: number): Float32Array {
  const body = scale(lowpass(brown(n), 120), 1.8);
  const shimmer1 = sine(n, 220, 0.035, (t, T) =>
    Math.max(0, Math.sin(2 * Math.PI * (1 / T) * t)),
  );
  const shimmer2 = sine(n, 331, 0.025, (t, T) =>
    Math.max(0, Math.sin(2 * Math.PI * (1 / T) * t + Math.PI)),
  );
  return norm(mix(body, shimmer1, shimmer2));
}

function genBowl(n: number): Float32Array {
  const swell = (t: number, T: number) =>
    0.35 + 0.65 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (1 / T) * t - Math.PI / 2));
  const out = mix(
    sine(n, 196, 0.3, swell),
    sine(n, 392.5, 0.14, swell),
    sine(n, 588, 0.08, swell),
    sine(n, 98.5, 0.12, swell),
  );
  return norm(out, 0.6);
}

function genAircon(n: number): Float32Array {
  const body = scale(lowpass(white(n), 190), 1.6);
  const hum = sine(n, 120, 0.045);
  return norm(mix(body, hum));
}

/* ---------- 预设清单（20 个） ---------- */

export const SOUND_PRESETS: SoundPreset[] = [
  { id: "pink", name: "粉红噪音", desc: "柔和均匀，遮噪首选", seconds: 6, gen: (n) => norm(pink(n)) },
  { id: "white", name: "白噪音", desc: "全频段遮蔽，专注入睡", seconds: 6, gen: (n) => norm(white(n)) },
  { id: "brown", name: "棕噪音", desc: "低沉厚实，掩盖低频", seconds: 6, gen: (n) => norm(brown(n)) },
  { id: "rain", name: "小雨", desc: "屋檐细雨，节奏均匀", seconds: 6, gen: genRain },
  { id: "storm", name: "雷雨", desc: "雨幕与远处的雷", seconds: 8, gen: genStorm },
  { id: "rainWindow", name: "雨打车窗", desc: "闷在车厢里的雨夜", seconds: 6, gen: genRainWindow },
  { id: "waves", name: "海浪", desc: "潮汐往复，呼吸同步", seconds: 8, gen: genWaves },
  { id: "stream", name: "溪流", desc: "山涧水声，清亮流动", seconds: 6, gen: genStream },
  { id: "waterfall", name: "瀑布", desc: "持续水幕，强力遮噪", seconds: 6, gen: genWaterfall },
  { id: "wind", name: "晚风", desc: "穿过树梢的风", seconds: 8, gen: genWind },
  { id: "forestNight", name: "森林夜", desc: "风声与稀疏虫鸣", seconds: 8, gen: genForestNight },
  { id: "crickets", name: "夏夜虫鸣", desc: "草丛里的蟋蟀", seconds: 8, gen: genCrickets },
  { id: "fire", name: "篝火", desc: "柴火噼啪，温暖干燥", seconds: 6, gen: genFire },
  { id: "fan", name: "风扇", desc: "老风扇的稳定嗡鸣", seconds: 6, gen: genFan },
  { id: "aircon", name: "空调低鸣", desc: "夏夜制冷的白底噪", seconds: 6, gen: genAircon },
  { id: "train", name: "夜行火车", desc: "铁轨接缝的规律哐当", seconds: 7.2, gen: genTrain },
  { id: "purr", name: "猫咪呼噜", desc: "25Hz 的放松频率", seconds: 6, gen: genPurr },
  { id: "heartbeat", name: "心跳", desc: "每分钟 60 下的安定", seconds: 6, gen: genHeartbeat },
  { id: "deepSpace", name: "深空", desc: "极低频的失重感", seconds: 6, gen: genDeepSpace },
  { id: "bowl", name: "颂钵", desc: "缓慢起伏的铜钵泛音", seconds: 6, gen: genBowl },
];

const bufferCache = new Map<string, AudioBuffer>();

export function getSoundBuffer(ctx: AudioContext, id: string): AudioBuffer {
  const hit = bufferCache.get(id);
  if (hit) return hit;
  const preset = SOUND_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`未知声音: ${id}`);
  const n = Math.floor(preset.seconds * SR);
  const data = preset.gen(n);
  const buf = ctx.createBuffer(1, n, SR);
  buf.copyToChannel(data as unknown as Float32Array<ArrayBuffer>, 0);
  bufferCache.set(id, buf);
  return buf;
}
