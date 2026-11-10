# 夜航睡眠 · 睡眠管理

记录每一晚，看清自己的睡眠节奏。移动端优先的全栈睡眠记录应用。

## 功能

- **睡眠记录**：每天一条，记上床/起床时间、入睡耗时、醒来感觉（1–5）和备注；同一天重复保存即覆盖更新
- **睡眠评分**：0–100 分圆环，由时长贴合度（55%）、主观质量（30%）、入睡耗时（15%）加权得出
- **趋势图表**：近 14 天时长柱状图，带目标虚线与达标着色
- **睡眠建议**：基于最近 7 次记录的规则化建议（时长缺口、作息波动、入睡耗时、主观质量）
- **目标设置**：目标时长（5–11 小时）与目标上床时间，评分和图表以此为基准
- **助眠白噪音**：20 种声音全部由 WebAudio 算法实时生成（粉/白/棕噪音、雨、雷、海浪、溪流、篝火、风扇、火车、猫咪呼噜、心跳、虫鸣、颂钵等），零音频文件、零版权成本、循环无接缝；支持多音混音、独立音量与睡眠定时（到点前渐弱）
- **分享报告卡片**：Canvas 生成 1080×1350 的七日报告图（平均评分、三项统计、七日柱状图、最佳一晚），优先调起系统分享，降级为下载
- **起床闹钟**：渐进音量铃声（60 秒爬满）、就寝提醒（目标上床时间前 30 分钟）、响铃全屏界面；网页闹钟需保持页面打开，界面已如实说明
- **账号与云同步**：Kimi OAuth 登录，记录存云端数据库，换设备不丢
- **PWA**：可安装到手机主屏 / 桌面，离线壳 + 网络优先的页面缓存策略

## 技术栈

React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui · Hono + tRPC + Drizzle ORM + MySQL · Kimi OAuth（JWT 会话）· vite-plugin-pwa · Fraunces（展示数字）+ 系统中文字体

## 本地开发

```bash
npm install
cp .env.example .env   # 填入数据库与 OAuth 配置
npm run db:push        # 同步表结构
npm run dev            # http://localhost:3000
```

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发服务器（HMR + API） |
| `npm run build` | 生产构建（前端 → `dist/public`，后端 → `dist/boot.js`） |
| `npm start` | 启动生产服务器 |
| `npm run check` | TypeScript 类型检查 |
| `npm run db:push` | 同步数据库结构 |

## 目录结构

```
api/          Hono + tRPC 服务端（sleep-router.ts 为睡眠业务）
contracts/    前后端共享类型与常量
db/           Drizzle schema 与迁移
src/pages/    Dashboard（报告/助眠/闹钟三标签）、Login、NotFound
src/components/  ScoreRing / SleepChart / RecordDialog / SettingsDialog
               SoundMixer / AlarmPanel / AlarmWatcher / BottomNav
src/lib/sleep.ts   时长、评分、建议、连续天数等纯函数
src/lib/sound.ts   白噪音 DSP 生成器（20 种声景）
src/lib/player.ts  混音播放引擎（单例，切页不中断）
src/lib/alarm.ts   闹钟调度与渐进铃声
src/lib/shareCard.ts  分享卡片 Canvas 渲染
```
