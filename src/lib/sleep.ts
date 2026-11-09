import type { SleepRecord } from "../../db/schema";

/** "HH:MM" → 分钟数 */
export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** 分钟数 → "7小时28分"（不换行空格，避免数字和单位被拆开） */
export function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  const nb = " ";
  if (h === 0) return `${m}${nb}分`;
  return m === 0 ? `${h}${nb}小时` : `${h}${nb}小时${nb}${m}${nb}分`;
}

/** 有效睡眠时长：跨午夜的跨度减去入睡耗时 */
export function durationOf(r: {
  bedTime: string;
  wakeTime: string;
  latencyMin: number;
}): number {
  let span = toMin(r.wakeTime) - toMin(r.bedTime);
  if (span <= 0) span += 1440;
  return Math.max(0, span - r.latencyMin);
}

/** 睡眠评分 0–100：时长贴合度 55% + 主观质量 30% + 入睡耗时 15% */
export function sleepScore(
  r: { bedTime: string; wakeTime: string; latencyMin: number; quality: number },
  targetMinutes: number,
): number {
  const dur = durationOf(r);
  const durScore = Math.max(
    0,
    100 - (Math.abs(dur - targetMinutes) / (targetMinutes * 0.5)) * 100,
  );
  const qualScore = ((r.quality - 1) / 4) * 100;
  const latScore = Math.max(0, 100 - (Math.min(r.latencyMin, 90) / 90) * 100);
  return Math.round(durScore * 0.55 + qualScore * 0.3 + latScore * 0.15);
}

export function todayStr(): string {
  const d = new Date();
  return toDateStr(d);
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** "2026-11-09" → "11月9日 周日" */
export function fmtDateCn(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][
    d.getDay()
  ];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${week}`;
}

export const qualityLabels = ["很糟糕", "不太好", "一般", "不错", "很棒"];

export type Insight = {
  tone: "warn" | "good" | "info";
  text: string;
};

/** 基于最近 7 条记录的规则化睡眠建议 */
export function buildInsights(
  records: SleepRecord[],
  targetMinutes: number,
): Insight[] {
  const recent = records.slice(0, 7);
  if (recent.length === 0) return [];
  const out: Insight[] = [];

  const avgDur =
    recent.reduce((s, r) => s + durationOf(r), 0) / recent.length;
  const diff = Math.round(avgDur - targetMinutes);
  if (diff < -30) {
    out.push({
      tone: "warn",
      text: `近 ${recent.length} 次平均睡 ${fmtDur(Math.round(avgDur))}，比目标少 ${fmtDur(-diff)}。试着把上床时间提前半小时。`,
    });
  } else if (diff > 60) {
    out.push({
      tone: "info",
      text: `平均睡眠比目标多 ${fmtDur(diff)}，如果白天仍犯困，可以留意睡眠质量而非时长。`,
    });
  }

  // 上床时间波动（按跨午夜展开到连续轴）
  const beds = recent.map((r) => {
    let b = toMin(r.bedTime);
    if (b < 720) b += 1440; // 凌晨上床视为次日
    return b;
  });
  const mean = beds.reduce((s, b) => s + b, 0) / beds.length;
  const sd = Math.sqrt(
    beds.reduce((s, b) => s + (b - mean) ** 2, 0) / beds.length,
  );
  if (recent.length >= 3 && sd > 45) {
    out.push({
      tone: "warn",
      text: `上床时间波动约 ${Math.round(sd)} 分钟，作息不规律比晚睡更伤精神。先固定一个上床时间。`,
    });
  } else if (recent.length >= 3) {
    out.push({
      tone: "good",
      text: `上床时间很规律（波动 ${Math.round(sd)} 分钟内），继续保持。`,
    });
  }

  const avgLat =
    recent.reduce((s, r) => s + r.latencyMin, 0) / recent.length;
  if (avgLat > 30) {
    out.push({
      tone: "warn",
      text: `平均入睡耗时 ${Math.round(avgLat)} 分钟偏长。睡前一小时少看屏幕、调暗灯光会有帮助。`,
    });
  }

  const avgQ = recent.reduce((s, r) => s + r.quality, 0) / recent.length;
  if (avgQ <= 2.5) {
    out.push({
      tone: "warn",
      text: `主观睡眠质量偏低（${avgQ.toFixed(1)}/5）。留意咖啡因、室温和睡前情绪。`,
    });
  }

  if (out.length === 0) {
    out.push({
      tone: "good",
      text: `近 ${recent.length} 次睡眠平均 ${fmtDur(Math.round(avgDur))}，节奏稳定，保持现在的作息。`,
    });
  }
  return out;
}

/** 连续记录天数（允许锚定今天或昨天） */
export function streakOf(records: SleepRecord[]): number {
  const dates = new Set(records.map((r) => r.date));
  let anchor = todayStr();
  if (!dates.has(anchor)) {
    const y = addDays(anchor, -1);
    if (!dates.has(y)) return 0;
    anchor = y;
  }
  let n = 0;
  let cur = anchor;
  while (dates.has(cur)) {
    n += 1;
    cur = addDays(cur, -1);
  }
  return n;
}
