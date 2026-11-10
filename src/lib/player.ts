/**
 * 助眠播放器：模块级单例，跨标签页切换不中断。
 * 支持多音混音（每路独立音量）、主音量、睡眠定时（渐弱停止）。
 */
import { useSyncExternalStore } from "react";
import { getSoundBuffer } from "./sound";

type ActiveSound = { id: string; volume: number };

type PlayerState = {
  active: ActiveSound[];
  master: number;
  timerMin: number | null; // 设定值
  timerEndsAt: number | null; // 时间戳
};

const STORAGE_KEY = "nightowl.mix.v1";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();
  private timerHandle: number | null = null;

  state: PlayerState = { active: [], master: 0.8, timerMin: null, timerEndsAt: null };
  private listeners = new Set<() => void>();

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PlayerState>;
        if (Array.isArray(saved.active)) {
          this.state.active = saved.active.filter(
            (s) => typeof s?.id === "string" && typeof s?.volume === "number",
          );
        }
        if (typeof saved.master === "number") this.state.master = saved.master;
      }
    } catch {
      /* 忽略损坏的本地配置 */
    }
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private emit() {
    // 必须产生新对象引用，useSyncExternalStore 依赖快照身份比较
    this.state = { ...this.state };
    for (const fn of this.listeners) fn();
    try {
      const { active, master } = this.state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ active, master }));
    } catch {
      /* 隐私模式下静默失败 */
    }
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.state.master;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  isPlaying(id: string): boolean {
    return this.nodes.has(id);
  }

  toggle(id: string) {
    if (this.nodes.has(id)) {
      this.stop(id);
      return;
    }
    const ctx = this.ensureCtx();
    const buf = getSoundBuffer(ctx, id);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    const vol = this.state.active.find((s) => s.id === id)?.volume ?? 0.7;
    // 淡入 0.8s，避免爆音
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), ctx.currentTime + 0.8);
    src.connect(gain).connect(this.masterGain!);
    src.start();
    this.nodes.set(id, { src, gain });
    if (!this.state.active.some((s) => s.id === id)) {
      this.state.active = [...this.state.active, { id, volume: vol }];
    }
    this.emit();
  }

  stop(id: string) {
    const node = this.nodes.get(id);
    if (node && this.ctx) {
      const { src, gain } = node;
      gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
      window.setTimeout(() => {
        try {
          src.stop();
          src.disconnect();
          gain.disconnect();
        } catch {
          /* 已停止 */
        }
      }, 500);
    }
    this.nodes.delete(id);
    this.emit();
  }

  stopAll() {
    for (const id of [...this.nodes.keys()]) this.stop(id);
    this.clearTimer();
  }

  setVolume(id: string, volume: number) {
    this.state.active = this.state.active.map((s) =>
      s.id === id ? { ...s, volume } : s,
    );
    const node = this.nodes.get(id);
    if (node && this.ctx) {
      node.gain.gain.setTargetAtTime(Math.max(0.0001, volume), this.ctx.currentTime, 0.05);
    }
    this.emit();
  }

  setMaster(master: number) {
    this.state.master = master;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0.0001, master),
        this.ctx.currentTime,
        0.05,
      );
    }
    this.emit();
  }

  /** 设置睡眠定时：到点前 60 秒开始渐弱 */
  setTimer(min: number | null) {
    this.clearTimer();
    if (min == null) {
      this.state.timerMin = null;
      this.state.timerEndsAt = null;
      this.emit();
      return;
    }
    this.state.timerMin = min;
    this.state.timerEndsAt = Date.now() + min * 60_000;
    const fadeStart = Math.max(0, min * 60_000 - 60_000);
    this.timerHandle = window.setTimeout(() => {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 15);
      }
      this.timerHandle = window.setTimeout(() => {
        this.stopAll();
        // 恢复主音量，供下次使用
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.setTargetAtTime(
            Math.max(0.0001, this.state.master),
            this.ctx.currentTime,
            0.1,
          );
        }
      }, 61_000);
    }, fadeStart);
    this.emit();
  }

  clearTimer() {
    if (this.timerHandle != null) {
      window.clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    this.state.timerMin = null;
    this.state.timerEndsAt = null;
    this.emit();
  }
}

export const engine = new SoundEngine();

export function useSoundEngine(): PlayerState {
  return useSyncExternalStore(engine.subscribe, () => engine.state);
}
