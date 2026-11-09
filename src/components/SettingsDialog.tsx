import { useEffect, useState } from "react";
import { trpc } from "@/providers/trpc";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** 睡眠目标设置：目标时长 + 目标上床时间 */
export function SettingsDialog({ open, onOpenChange }: Props) {
  const utils = trpc.useUtils();
  const settings = trpc.sleep.getSettings.useQuery(undefined, {
    enabled: open,
  });
  const [hours, setHours] = useState(8);
  const [bedTime, setBedTime] = useState("23:00");

  useEffect(() => {
    if (settings.data) {
      setHours(settings.data.targetMinutes / 60);
      setBedTime(settings.data.targetBedTime);
    }
  }, [settings.data]);

  const save = trpc.sleep.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.sleep.invalidate();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-popover">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">
            睡眠目标
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            评分和图表都会以这里的目标为基准。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          <div className="grid gap-3">
            <div className="flex items-baseline justify-between">
              <Label>目标时长</Label>
              <span className="font-display text-lg">{hours.toFixed(1)} 小时</span>
            </div>
            <Slider
              value={[hours]}
              onValueChange={([v]) => setHours(v)}
              min={5}
              max={11}
              step={0.5}
              aria-label="目标睡眠时长（小时）"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="set-bed">目标上床时间</Label>
            <Input
              id="set-bed"
              type="time"
              value={bedTime}
              onChange={(e) => setBedTime(e.target.value)}
              className="bg-secondary/60"
            />
          </div>

          <Button
            onClick={() =>
              save.mutate({
                targetMinutes: Math.round(hours * 60),
                targetBedTime: bedTime,
              })
            }
            disabled={save.isPending || settings.isLoading}
            size="lg"
            className="w-full"
          >
            {save.isPending ? "保存中…" : "保存目标"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
