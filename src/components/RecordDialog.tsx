import { useEffect, useState } from "react";
import { trpc } from "@/providers/trpc";
import type { SleepRecord } from "../../db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { qualityLabels, todayStr } from "@/lib/sleep";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 传入则为编辑已有记录，否则新增 */
  record?: SleepRecord | null;
};

export function RecordDialog({ open, onOpenChange, record }: Props) {
  const utils = trpc.useUtils();
  const [date, setDate] = useState(todayStr());
  const [bedTime, setBedTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [latency, setLatency] = useState(15);
  const [quality, setQuality] = useState(3);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (record) {
      setDate(record.date);
      setBedTime(record.bedTime);
      setWakeTime(record.wakeTime);
      setLatency(record.latencyMin);
      setQuality(record.quality);
      setNote(record.note ?? "");
    } else {
      setDate(todayStr());
      setBedTime("23:00");
      setWakeTime("07:00");
      setLatency(15);
      setQuality(3);
      setNote("");
    }
  }, [open, record]);

  const upsert = trpc.sleep.upsert.useMutation({
    onSuccess: async () => {
      await utils.sleep.list.invalidate();
      onOpenChange(false);
    },
    onError: (e) => setError(e.message || "保存失败，请重试"),
  });

  const submit = () => {
    if (!date || !bedTime || !wakeTime) {
      setError("请填完整日期和时间");
      return;
    }
    upsert.mutate({
      date,
      bedTime,
      wakeTime,
      latencyMin: latency,
      quality,
      note: note.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-popover">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">
            {record ? "修改记录" : "记录睡眠"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            日期按起床那天算；上床时间在前一天也没关系。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="rec-date">日期</Label>
            <Input
              id="rec-date"
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="bg-secondary/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rec-bed">上床时间</Label>
              <Input
                id="rec-bed"
                type="time"
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
                className="bg-secondary/60"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rec-wake">起床时间</Label>
              <Input
                id="rec-wake"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="bg-secondary/60"
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-baseline justify-between">
              <Label>入睡耗时</Label>
              <span className="font-display text-lg">{latency} 分钟</span>
            </div>
            <Slider
              value={[latency]}
              onValueChange={([v]) => setLatency(v)}
              min={0}
              max={120}
              step={5}
              aria-label="入睡耗时（分钟）"
            />
          </div>

          <div className="grid gap-2">
            <Label>醒来感觉</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {qualityLabels.map((label, i) => {
                const v = i + 1;
                const active = quality === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setQuality(v)}
                    aria-pressed={active}
                    className={`rounded-md border px-1 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary/50 text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rec-note">备注（可选）</Label>
            <Textarea
              id="rec-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="比如：喝了咖啡 / 半夜醒过一次…"
              maxLength={500}
              rows={2}
              className="resize-none bg-secondary/60"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            onClick={submit}
            disabled={upsert.isPending}
            size="lg"
            className="w-full"
          >
            {upsert.isPending ? "保存中…" : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
