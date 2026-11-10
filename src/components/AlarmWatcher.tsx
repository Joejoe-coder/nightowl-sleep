import { useEffect } from "react";
import { BellRing, X } from "lucide-react";
import { alarm, useAlarm } from "@/lib/alarm";

/** 全局闹钟监听：挂在 Dashboard 顶层，响铃时全屏覆盖 */
export function AlarmWatcher({ targetBedTime }: { targetBedTime: string | null }) {
  const state = useAlarm();

  useEffect(() => {
    alarm.start();
  }, []);

  useEffect(() => {
    alarm.setTargetBedTime(targetBedTime);
  }, [targetBedTime]);

  return (
    <>
      {/* 页面内提醒（就寝提示等） */}
      {state.notice && !state.ringing && (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-popover px-4 py-3.5 shadow-lg">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="flex-1 text-sm leading-relaxed">{state.notice}</p>
            <button
              onClick={() => alarm.dismissNotice()}
              aria-label="关闭提醒"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 响铃全屏覆盖 */}
      {state.ringing && (
        <div
          role="alert"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/97 px-8 backdrop-blur-sm"
        >
          <p className="label-caps text-muted-foreground">good morning</p>
          <p className="font-display mt-6 text-8xl tracking-tight text-primary">
            {state.time}
          </p>
          <p className="mt-6 text-base text-muted-foreground">
            早上好，记得记下昨晚的睡眠。
          </p>
          <button
            onClick={() => alarm.stopRinging()}
            className="mt-12 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-lg font-medium text-primary-foreground shadow-[0_8px_28px_hsl(var(--primary)/0.35)] transition-transform hover:scale-105 active:scale-95"
          >
            停止
          </button>
        </div>
      )}
    </>
  );
}
