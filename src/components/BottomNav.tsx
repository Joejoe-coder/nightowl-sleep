import { BarChart3, AlarmClock, AudioLines, type LucideIcon } from "lucide-react";

export type TabKey = "report" | "sounds" | "alarm";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "report", label: "报告", icon: BarChart3 },
  { key: "sounds", label: "助眠", icon: AudioLines },
  { key: "alarm", label: "闹钟", icon: AlarmClock },
];

export function BottomNav({
  tab,
  onChange,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
}) {
  return (
    <nav
      aria-label="主导航"
      className="hairline-t fixed inset-x-0 bottom-0 z-40 bg-background/92 backdrop-blur-md"
    >
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-3">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-[11px]">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
