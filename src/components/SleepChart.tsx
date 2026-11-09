import type { SleepRecord } from "../../db/schema";
import { addDays, durationOf, todayStr } from "@/lib/sleep";

type Props = {
  records: SleepRecord[];
  targetMinutes: number;
  days?: number;
};

/** 近 N 天睡眠时长柱状图（纯 CSS 布局），横向虚线为目标线 */
export function SleepChart({ records, targetMinutes, days = 14 }: Props) {
  const byDate = new Map(records.map((r) => [r.date, r]));
  const end = todayStr();
  const items: { date: string; dur: number | null; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const rec = byDate.get(date);
    const d = new Date(`${date}T12:00:00`);
    items.push({
      date,
      dur: rec ? durationOf(rec) : null,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    });
  }

  const maxVal = targetMinutes * 1.35;
  const H = 140; // 绘图区高度(px)
  const targetY = H - (targetMinutes / maxVal) * H;

  return (
    <div>
      <div
        role="img"
        aria-label={`近 ${days} 天睡眠时长柱状图，目标线 ${(targetMinutes / 60).toFixed(1)} 小时`}
      >
        <div className="relative" style={{ height: H }}>
          {/* 目标虚线 */}
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed"
            style={{ top: targetY, borderColor: "hsl(var(--warn))" }}
          />
          <div
            className="grid h-full items-end gap-[6px]"
            style={{ gridTemplateColumns: `repeat(${days}, minmax(0,1fr))` }}
          >
            {items.map((it) => {
              const h =
                it.dur == null ? 0 : Math.max(4, (it.dur / maxVal) * H);
              const good = it.dur != null && it.dur >= targetMinutes * 0.9;
              return (
                <div
                  key={it.date}
                  className="flex h-full items-end"
                  title={
                    it.dur == null
                      ? `${it.label} 无记录`
                      : `${it.label} ${(it.dur / 60).toFixed(1)} 小时`
                  }
                >
                  <div
                    className="w-full rounded-t-[3px]"
                    style={{
                      height: h,
                      backgroundColor:
                        it.dur == null
                          ? "transparent"
                          : good
                            ? "hsl(var(--primary))"
                            : "hsl(var(--muted-foreground) / 0.45)",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div
          className="mt-1.5 grid gap-[6px]"
          style={{ gridTemplateColumns: `repeat(${days}, minmax(0,1fr))` }}
        >
          {items.map((it, i) => (
            <span
              key={it.date}
              className="text-center text-[9px] leading-none text-muted-foreground"
            >
              {i % 2 === 0 ? it.label : ""}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-0 w-5 border-t border-dashed"
            style={{ borderColor: "hsl(var(--warn))" }}
          />
          目标 {(targetMinutes / 60).toFixed(1)} 小时
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-primary" />
          达标（≥90% 目标）
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-muted-foreground/45" />
          未达标
        </span>
      </div>
    </div>
  );
}
