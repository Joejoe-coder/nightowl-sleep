import { useEffect, useState } from "react";
import {
  Activity,
  AudioWaveform,
  Bug,
  Cat,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  Droplets,
  Fan,
  Flame,
  HeartPulse,
  Moon,
  Sparkles,
  Timer,
  TrainFront,
  Trees,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { SOUND_PRESETS } from "@/lib/sound";
import { engine, useSoundEngine } from "@/lib/player";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, LucideIcon> = {
  pink: AudioWaveform,
  white: Activity,
  brown: Moon,
  rain: CloudRain,
  storm: CloudLightning,
  rainWindow: CloudRainWind,
  waves: Waves,
  stream: Droplets,
  waterfall: Droplets,
  wind: Wind,
  forestNight: Trees,
  crickets: Bug,
  fire: Flame,
  fan: Fan,
  aircon: Fan,
  train: TrainFront,
  purr: Cat,
  heartbeat: HeartPulse,
  deepSpace: Sparkles,
  bowl: Moon,
};

const TIMER_OPTIONS: { label: string; value: number | null }[] = [
  { label: "不定时", value: null },
  { label: "15 分钟", value: 15 },
  { label: "30 分钟", value: 30 },
  { label: "45 分钟", value: 45 },
  { label: "1 小时", value: 60 },
];

function useCountdown(endsAt: number | null): string | null {
  const [, force] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const h = window.setInterval(() => force((x) => x + 1), 10_000);
    return () => window.clearInterval(h);
  }, [endsAt]);
  if (!endsAt) return null;
  const left = Math.max(0, endsAt - Date.now());
  const m = Math.floor(left / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SoundMixer() {
  const state = useSoundEngine();
  const countdown = useCountdown(state.timerEndsAt);
  const playingCount = state.active.filter((s) => engine.isPlaying(s.id)).length;

  return (
    <section className="py-8">
      <p className="label-caps text-muted-foreground">sleep sounds</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">
        今晚听点什么
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        所有声音由算法实时生成，没有循环接缝，也不耗流量。点选即可混音，建议不超过三种。
      </p>

      {/* 播放控制条 */}
      {playingCount > 0 && (
        <div className="mt-6 rounded-xl border border-primary/40 bg-card px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              正在播放 {playingCount} 种声音
              {countdown && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {countdown} 后渐弱停止
                </span>
              )}
            </p>
            <button
              onClick={() => engine.stopAll()}
              className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              全部停止
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="label-caps shrink-0 text-muted-foreground">
              主音量
            </span>
            <Slider
              value={[state.master]}
              onValueChange={([v]) => engine.setMaster(v)}
              min={0}
              max={1}
              step={0.05}
              aria-label="主音量"
            />
          </div>
        </div>
      )}

      {/* 声音网格 */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SOUND_PRESETS.map((p) => {
          const playing = engine.isPlaying(p.id);
          const active = state.active.find((s) => s.id === p.id);
          const Icon = ICONS[p.id] ?? Moon;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-3.5 transition-colors ${
                playing
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-accent/50"
              }`}
            >
              <button
                onClick={() => engine.toggle(p.id)}
                aria-pressed={playing}
                className="flex w-full flex-col items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon
                  className={`h-5 w-5 ${playing ? "text-primary" : "text-muted-foreground"}`}
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-medium leading-tight">{p.name}</p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    {p.desc}
                  </p>
                </div>
              </button>
              {playing && active && (
                <div className="mt-3">
                  <Slider
                    value={[active.volume]}
                    onValueChange={([v]) => engine.setVolume(p.id, v)}
                    min={0}
                    max={1}
                    step={0.05}
                    aria-label={`${p.name} 音量`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 睡眠定时 */}
      <div className="hairline-t mt-8 pt-6">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="label-caps text-muted-foreground">睡眠定时</h3>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {TIMER_OPTIONS.map((opt) => {
            const selected = state.timerMin === opt.value;
            return (
              <Button
                key={opt.label}
                variant={selected ? "default" : "outline"}
                size="sm"
                onClick={() => engine.setTimer(opt.value)}
                className={selected ? "" : "border-border bg-transparent"}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          到点前一分钟音量会缓缓降低，不会把你惊醒。
        </p>
      </div>
    </section>
  );
}
