import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import type { SleepRecord } from "../../db/schema";
import { ScoreRing } from "@/components/ScoreRing";
import { SleepChart } from "@/components/SleepChart";
import { RecordDialog } from "@/components/RecordDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Moon,
  Plus,
  Settings2,
  LogOut,
  Pencil,
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  buildInsights,
  durationOf,
  fmtDateCn,
  fmtDur,
  sleepScore,
  streakOf,
  todayStr,
} from "@/lib/sleep";

export default function Dashboard() {
  const { user, isLoading: authLoading, logout } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const recordsQuery = trpc.sleep.list.useQuery(
    { limit: 60 },
    { enabled: !!user },
  );
  const settingsQuery = trpc.sleep.getSettings.useQuery(undefined, {
    enabled: !!user,
  });

  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<SleepRecord | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleting, setDeleting] = useState<SleepRecord | null>(null);

  const utils = trpc.useUtils();
  const removeMut = trpc.sleep.remove.useMutation({
    onSuccess: async () => {
      await utils.sleep.list.invalidate();
      setDeleting(null);
    },
  });

  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);
  const target = settingsQuery.data?.targetMinutes ?? 480;
  const targetBed = settingsQuery.data?.targetBedTime ?? "23:00";

  const latest = records[0] ?? null;
  const latestScore = latest ? sleepScore(latest, target) : null;
  const latestDur = latest ? durationOf(latest) : null;

  const recent7 = records.slice(0, 7);
  const avg7 =
    recent7.length > 0
      ? Math.round(
          recent7.reduce((s, r) => s + durationOf(r), 0) / recent7.length,
        )
      : null;
  const avgLatency =
    recent7.length > 0
      ? Math.round(
          recent7.reduce((s, r) => s + r.latencyMin, 0) / recent7.length,
        )
      : null;
  const streak = streakOf(records);
  const insights = useMemo(
    () => buildInsights(records, target),
    [records, target],
  );

  if (authLoading || !user) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-5 py-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  const firstName = user.name?.split(" ")[0] ?? "";

  return (
    <div className="min-h-dvh pb-28">
      {/* 顶栏 */}
      <header className="hairline-b sticky top-0 z-40 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <Moon className="h-5 w-5 text-primary" aria-hidden />
            <span className="font-display text-lg tracking-tight">夜航睡眠</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="睡眠目标设置"
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings2 className="h-5 w-5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="账号菜单"
                  className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="bg-secondary text-xs">
                      {(user.name ?? "我").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5">
        {/* 概览 */}
        <section className="py-8">
          <p className="label-caps text-muted-foreground">
            sleep report · {fmtDateCn(todayStr())}
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-snug tracking-tight">
            {firstName ? `${firstName}，` : ""}把每一晚
            <span className="text-primary">睡成想要的样子</span>。
          </h1>

          <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-10">
            <ScoreRing score={latestScore} />
            <div className="w-full flex-1">
              {latest ? (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <dt className="label-caps text-muted-foreground">昨夜时长</dt>
                    <dd className="font-display mt-1.5 text-2xl tracking-tight">
                      {fmtDur(latestDur!)}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-caps text-muted-foreground">醒来感觉</dt>
                    <dd className="font-display mt-1.5 text-2xl tracking-tight">
                      {["很糟糕", "不太好", "一般", "不错", "很棒"][
                        latest.quality - 1
                      ]}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-caps text-muted-foreground">上床 / 起床</dt>
                    <dd className="font-display mt-1.5 text-2xl tracking-tight">
                      {latest.bedTime} – {latest.wakeTime}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-caps text-muted-foreground">入睡耗时</dt>
                    <dd className="font-display mt-1.5 text-2xl tracking-tight">
                      {latest.latencyMin} 分钟
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="text-muted-foreground">
                  <p className="text-base leading-relaxed">
                    还没有睡眠记录。明早醒来后，花十秒钟记下你的第一晚。
                  </p>
                  <Button
                    size="lg"
                    className="mt-5"
                    onClick={() => {
                      setEditing(null);
                      setRecordOpen(true);
                    }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    记录第一晚
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 统计行 */}
          {records.length > 0 && (
            <div className="mt-10 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
              <Stat label="7 次均值" value={avg7 != null ? fmtDur(avg7) : "—"} />
              <Stat label="连续记录" value={`${streak} 天`} />
              <Stat
                label="平均入睡"
                value={avgLatency != null ? `${avgLatency} 分钟` : "—"}
              />
            </div>
          )}
        </section>

        {records.length > 0 && (
          <>
            {/* 图表 */}
            <section className="hairline-t py-8">
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="label-caps text-muted-foreground">近 14 天</h2>
                <span className="text-xs text-muted-foreground">
                  目标 {fmtDur(target)} · {targetBed} 前上床
                </span>
              </div>
              <SleepChart records={records} targetMinutes={target} />
            </section>

            {/* 建议 */}
            <section className="hairline-t py-8">
              <h2 className="label-caps mb-5 text-muted-foreground">
                给你的建议
              </h2>
              <ul className="grid gap-3">
                {insights.map((it, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
                  >
                    {it.tone === "warn" ? (
                      <AlertTriangle
                        className="text-warn mt-0.5 h-4.5 w-4.5 shrink-0"
                        aria-hidden
                      />
                    ) : it.tone === "good" ? (
                      <CheckCircle2
                        className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                        aria-hidden
                      />
                    ) : (
                      <TrendingUp
                        className="mt-0.5 h-4.5 w-4.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    <p className="text-sm leading-relaxed">{it.text}</p>
                  </li>
                ))}
              </ul>
            </section>

            {/* 历史 */}
            <section className="hairline-t py-8">
              <h2 className="label-caps mb-5 text-muted-foreground">
                历史记录
              </h2>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {records.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-4 px-4 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{fmtDateCn(r.date)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.bedTime} – {r.wakeTime} ·{" "}
                        {qualityShort(r.quality)}
                        {r.note ? ` · ${r.note}` : ""}
                      </p>
                    </div>
                    <span className="font-display shrink-0 text-lg tracking-tight">
                      {fmtDur(durationOf(r))}
                    </span>
                    <div className="flex shrink-0 items-center">
                      <button
                        aria-label={`编辑 ${fmtDateCn(r.date)} 的记录`}
                        onClick={() => {
                          setEditing(r);
                          setRecordOpen(true);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`删除 ${fmtDateCn(r.date)} 的记录`}
                        onClick={() => setDeleting(r)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>

      {/* 记录按钮 */}
      <button
        onClick={() => {
          setEditing(null);
          setRecordOpen(true);
        }}
        aria-label="记录睡眠"
        className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_28px_hsl(var(--primary)/0.35)] transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-[max(1.25rem,calc(50%-21rem))]"
      >
        <Plus className="h-6 w-6" />
      </button>

      <RecordDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        record={editing}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent className="border-border bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条记录？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? fmtDateCn(deleting.date) : ""}
              的睡眠记录将被删除，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && removeMut.mutate({ id: deleting.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className="font-display mt-1.5 text-xl tracking-tight">{value}</p>
    </div>
  );
}

function qualityShort(q: number) {
  return ["很糟糕", "不太好", "一般", "不错", "很棒"][q - 1] ?? "—";
}
