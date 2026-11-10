/**
 * Canvas 渲染可分享的 7 日睡眠报告卡片（1080×1350）。
 * 配色与夜航主题一致：暖墨底 + 珊瑚点缀 + Fraunces 大数字。
 */
import type { SleepRecord } from "../../db/schema";
import { durationOf, fmtDateCn, fmtDur, sleepScore, streakOf } from "./sleep";

const W = 1080;
const H = 1350;

const C = {
  bg0: "#16110e",
  bg1: "#0e0b09",
  fg: "#efe7dd",
  muted: "#99908a",
  coral: "#e2634a",
  warn: "#e0a53f",
  hairline: "#332b26",
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderShareCard(
  records: SleepRecord[],
  targetMinutes: number,
): Promise<Blob> {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 背景
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, C.bg0);
  grad.addColorStop(1, C.bg1);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 角落月晕
  const glow = ctx.createRadialGradient(W - 120, 120, 0, W - 120, 120, 420);
  glow.addColorStop(0, "rgba(226, 99, 74, 0.16)");
  glow.addColorStop(1, "rgba(226, 99, 74, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const recent = records.slice(0, 7);
  const scores = recent.map((r) => sleepScore(r, targetMinutes));
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const avgDur = recent.length
    ? Math.round(recent.reduce((s, r) => s + durationOf(r), 0) / recent.length)
    : 0;
  const avgLat = recent.length
    ? Math.round(recent.reduce((s, r) => s + r.latencyMin, 0) / recent.length)
    : 0;
  const streak = streakOf(records);
  const best = recent.length
    ? recent.reduce((a, b) => (durationOf(a) >= durationOf(b) ? a : b))
    : null;

  const M = 88; // 页边距

  // 顶部眉题
  ctx.fillStyle = C.muted;
  ctx.font = "500 30px ui-monospace, Menlo, monospace";
  ctx.textBaseline = "alphabetic";
  const range = recent.length
    ? `${fmtDateCn(recent[recent.length - 1].date)} – ${fmtDateCn(recent[0].date)}`
    : "";
  ctx.fillText("NIGHTOWL · 7-DAY SLEEP REPORT", M, 120);
  ctx.fillStyle = C.fg;
  ctx.font = "600 52px 'Fraunces', 'Songti SC', serif";
  ctx.fillText("夜航睡眠 · 七日报告", M, 190);
  ctx.fillStyle = C.muted;
  ctx.font = "400 30px sans-serif";
  ctx.fillText(range, M, 244);

  // 中央大分数
  ctx.fillStyle = C.coral;
  ctx.font = "600 300px 'Fraunces', Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText(String(avgScore), M, 560);
  const scoreW = ctx.measureText(String(avgScore)).width;
  ctx.fillStyle = C.muted;
  ctx.font = "400 36px sans-serif";
  ctx.fillText("平均睡眠评分", M + scoreW + 32, 545);

  // 三格统计
  const stats: [string, string][] = [
    ["平均时长", fmtDur(avgDur)],
    ["连续记录", `${streak} 天`],
    ["平均入睡", `${avgLat} 分钟`],
  ];
  const boxY = 640;
  const boxW = (W - M * 2 - 32 * 2) / 3;
  stats.forEach(([label, value], i) => {
    const x = M + i * (boxW + 32);
    ctx.strokeStyle = C.hairline;
    ctx.lineWidth = 2;
    roundRect(ctx, x, boxY, boxW, 168, 20);
    ctx.stroke();
    ctx.fillStyle = C.muted;
    ctx.font = "400 26px ui-monospace, Menlo, monospace";
    ctx.fillText(label, x + 28, boxY + 52);
    ctx.fillStyle = C.fg;
    ctx.font = "600 44px 'Fraunces', Georgia, serif";
    ctx.fillText(value, x + 28, boxY + 118);
  });

  // 七日柱状图
  const chartY = 860;
  const chartH = 230;
  ctx.fillStyle = C.muted;
  ctx.font = "400 26px ui-monospace, Menlo, monospace";
  ctx.fillText("近 7 天时长", M, chartY - 24);

  const days: { label: string; dur: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const rec = recent.find((r) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return r.date === key;
    });
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      dur: rec ? durationOf(rec) : null,
    });
  }

  const maxVal = targetMinutes * 1.3;
  const plotW = W - M * 2;
  const barGap = 20;
  const barW = (plotW - barGap * 6) / 7;

  // 目标虚线
  const targetY = chartY + chartH - (targetMinutes / maxVal) * chartH;
  ctx.strokeStyle = C.warn;
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, targetY);
  ctx.lineTo(W - M, targetY);
  ctx.stroke();
  ctx.setLineDash([]);

  days.forEach((d, i) => {
    const x = M + i * (barW + barGap);
    if (d.dur != null) {
      const h = Math.max(8, (d.dur / maxVal) * chartH);
      const good = d.dur >= targetMinutes * 0.9;
      ctx.fillStyle = good ? C.coral : "rgba(153, 144, 138, 0.45)";
      roundRect(ctx, x, chartY + chartH - h, barW, h, 10);
      ctx.fill();
    }
    ctx.fillStyle = C.muted;
    ctx.font = "400 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(d.label, x + barW / 2, chartY + chartH + 40);
    ctx.textAlign = "left";
  });

  // 底部：最佳一晚 + 落款
  if (best) {
    ctx.fillStyle = C.muted;
    ctx.font = "400 28px sans-serif";
    ctx.fillText(
      `最佳一晚：${fmtDateCn(best.date)}，睡了 ${fmtDur(durationOf(best))}`,
      M,
      H - 150,
    );
  }
  ctx.strokeStyle = C.hairline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(M, H - 110);
  ctx.lineTo(W - M, H - 110);
  ctx.stroke();
  ctx.fillStyle = C.coral;
  ctx.font = "600 30px 'Fraunces', Georgia, serif";
  ctx.fillText("夜航睡眠", M, H - 62);
  ctx.fillStyle = C.muted;
  ctx.font = "400 26px sans-serif";
  ctx.fillText("把每一晚，睡成想要的样子。", M + 150, H - 62);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("生成图片失败"))),
      "image/png",
    );
  });
}

/** 优先系统分享，降级为下载 */
export async function shareCard(blob: Blob): Promise<"shared" | "downloaded"> {
  const file = new File([blob], "夜航睡眠-七日报告.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "我的七日睡眠报告" });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "shared"; // 用户取消
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
