import { AlarmClock, Info } from "lucide-react";
import { alarm, useAlarm } from "@/lib/alarm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function AlarmPanel() {
  const state = useAlarm();

  return (
    <section className="py-8">
      <p className="label-caps text-muted-foreground">wake up</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">起床闹钟</h2>

      <div className="mt-6 grid gap-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlarmClock className="h-5 w-5 text-primary" aria-hidden />
            <Label htmlFor="alarm-enabled" className="text-base">
              启用闹钟
            </Label>
          </div>
          <Switch
            id="alarm-enabled"
            checked={state.enabled}
            onCheckedChange={(v) => alarm.setEnabled(v)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="alarm-time">起床时间</Label>
          <Input
            id="alarm-time"
            type="time"
            value={state.time}
            onChange={(e) => alarm.setTime(e.target.value)}
            className="bg-secondary/60 font-display text-2xl tracking-tight"
          />
        </div>

        <Button
          variant="outline"
          className="border-border bg-transparent"
          onClick={() => alarm.preview()}
        >
          试听铃声
        </Button>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-sm leading-relaxed text-muted-foreground">
          网页版闹钟需要本页面保持打开（屏幕可以熄灭，但不要关闭标签页）。
          铃声音量会在一分钟内缓缓变大，不会把你惊醒。若手机支持，
          建议同时设一个系统闹钟兜底。
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3.5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          开启后，如果你设定了目标上床时间，到点前 30 分钟会收到就寝提醒。
        </p>
      </div>
    </section>
  );
}
