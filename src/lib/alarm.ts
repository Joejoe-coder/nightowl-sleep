/**
 * 基础闹钟：本地存储、渐进音量铃声、就寝提醒。
 * 说明：网页闹钟需要页面保持打开，这是平台限制而非功能缺陷，
 * 界面中已向用户如实说明。
 */
import { useSyncExternalStore } from "react";

export type AlarmState = {
  enabled: boolean;
  time: string; // "HH:MM"
  ringing: boolean;
  notice: string | null; // 页面内提醒（就寝提示等）
};

const KEY = "nightowl.alarm.v1";

class AlarmStore {
  state: AlarmState = { enabled: false, time: "07:00", ringing: false, notice: null };
  private listeners = new Set<() => void>();
  private lastFiredFor: string | null = null; // "YYYY-MM-DD HH:MM" 防重复触发
  private lastBedNoticeFor: string | null = null;
  private targetBedTime: string | null = null;
  private ticker: number | null = null;

  // 铃声
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private chimeTimer: number | null = null;

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<AlarmState>;
        if (typeof saved.enabled === "boolean") this.state.enabled = saved.enabled;
        if (typeof saved.time === "string" && /^\d{2}:\d{2}$/.test(saved.time))
          this.state.time = saved.time;
      }
    } catch {
      /* 忽略 */
    }
  }

  start() {
    if (this.ticker != null) return;
    this.ticker = window.setInterval(() => this.tick(), 10_000);
    this.tick();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private emit() {
    this.state = { ...this.state };
    for (const fn of this.listeners) fn();
    try {
      const { enabled, time } = this.state;
      localStorage.setItem(KEY, JSON.stringify({ enabled, time }));
    } catch {
      /* 隐私模式 */
    }
  }

  setTargetBedTime(t: string | null) {
    this.targetBedTime = t;
  }

  setEnabled(enabled: boolean) {
    this.state.enabled = enabled;
    if (enabled) this.requestNotifyPermission();
    this.emit();
  }

  setTime(time: string) {
    this.state.time = time;
    this.emit();
  }

  dismissNotice() {
    this.state.notice = null;
    this.emit();
  }

  private requestNotifyPermission() {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } catch {
      /* 不支持则跳过 */
    }
  }

  private notify(title: string, body: string) {
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
        return;
      }
    } catch {
      /* 落到页面内提醒 */
    }
    this.state.notice = `${title}：${body}`;
    this.emit();
    window.setTimeout(() => {
      if (this.state.notice === `${title}：${body}`) this.dismissNotice();
    }, 15_000);
  }

  private tick() {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dayKey = now.toDateString();

    // 起床闹钟
    if (this.state.enabled && !this.state.ringing && hhmm === this.state.time) {
      const fireKey = `${dayKey} ${hhmm}`;
      if (this.lastFiredFor !== fireKey) {
        this.lastFiredFor = fireKey;
        this.ring();
      }
    }

    // 就寝提醒：目标上床时间前 30 分钟
    if (this.targetBedTime) {
      const [bh, bm] = this.targetBedTime.split(":").map(Number);
      const bed = new Date(now);
      bed.setHours(bh, bm, 0, 0);
      const diffMin = (bed.getTime() - now.getTime()) / 60_000;
      if (diffMin >= 29 && diffMin < 31) {
        const key = `${dayKey} bed`;
        if (this.lastBedNoticeFor !== key) {
          this.lastBedNoticeFor = key;
          this.notify("该准备睡了", `目标上床时间是 ${this.targetBedTime}，现在开始收尾吧`);
        }
      }
    }
  }

  /** 渐进音量铃声：双正弦钟声每 1.4s 一次，60 秒内音量爬满 */
  private ring() {
    this.state.ringing = true;
    this.emit();
    this.notify("早上好", "闹钟响了，昨晚睡得好吗？");
    this.startChime();
  }

  /** 试听铃声：不进入响铃状态，3 秒后自动停止 */
  preview() {
    this.startChime();
    window.setTimeout(() => {
      if (!this.state.ringing) this.stopChime();
    }, 3000);
  }

  private startChime() {
    if (this.chimeTimer != null) return; // 已在播放
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 60);
      this.masterGain.connect(this.ctx.destination);
      const chime = () => {
        if (!this.ctx || !this.masterGain) return;
        const t0 = this.ctx.currentTime;
        for (const [freq, g] of [
          [880, 0.5],
          [1318.5, 0.28],
        ] as const) {
          const osc = this.ctx.createOscillator();
          const env = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          env.gain.setValueAtTime(0.0001, t0);
          env.gain.exponentialRampToValueAtTime(g, t0 + 0.03);
          env.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
          osc.connect(env).connect(this.masterGain);
          osc.start(t0);
          osc.stop(t0 + 1.2);
        }
      };
      chime();
      this.chimeTimer = window.setInterval(chime, 1400);
    } catch {
      /* 音频被系统阻止时，至少保留页面内响铃界面 */
    }
  }

  private stopChime() {
    if (this.chimeTimer != null) {
      window.clearInterval(this.chimeTimer);
      this.chimeTimer = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
      this.masterGain = null;
    }
  }

  stopRinging() {
    this.state.ringing = false;
    this.stopChime();
    this.emit();
  }
}

export const alarm = new AlarmStore();

export function useAlarm(): AlarmState {
  return useSyncExternalStore(alarm.subscribe, () => alarm.state);
}
