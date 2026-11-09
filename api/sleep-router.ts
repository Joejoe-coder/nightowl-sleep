import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { sleepRecords, sleepSettings } from "../db/schema";
import { authedQuery, createRouter } from "./middleware";

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const recordInput = z.object({
  date: z.string().regex(dateRe, "日期格式应为 YYYY-MM-DD"),
  bedTime: z.string().regex(timeRe, "时间格式应为 HH:MM"),
  wakeTime: z.string().regex(timeRe, "时间格式应为 HH:MM"),
  latencyMin: z.number().int().min(0).max(600),
  quality: z.number().int().min(1).max(5),
  note: z.string().max(500).optional(),
});

export const sleepRouter = createRouter({
  /** 最近 N 条记录，按归属日期倒序 */
  list: authedQuery
    .input(z.object({ limit: z.number().int().min(1).max(365).default(60) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select()
        .from(sleepRecords)
        .where(eq(sleepRecords.userId, ctx.user.id))
        .orderBy(desc(sleepRecords.date))
        .limit(input.limit);
    }),

  /** 按日期新增或覆盖一条记录（每天一条） */
  upsert: authedQuery.input(recordInput).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db
      .insert(sleepRecords)
      .values({
        userId: ctx.user.id,
        date: input.date,
        bedTime: input.bedTime,
        wakeTime: input.wakeTime,
        latencyMin: input.latencyMin,
        quality: input.quality,
        note: input.note ?? null,
      })
      .onDuplicateKeyUpdate({
        set: {
          bedTime: input.bedTime,
          wakeTime: input.wakeTime,
          latencyMin: input.latencyMin,
          quality: input.quality,
          note: input.note ?? null,
        },
      });
    return { ok: true as const };
  }),

  remove: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(sleepRecords)
        .where(
          and(
            eq(sleepRecords.id, input.id),
            eq(sleepRecords.userId, ctx.user.id),
          ),
        );
      return { ok: true as const };
    }),

  /** 读取目标设置；没有则返回默认 */
  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(sleepSettings)
      .where(eq(sleepSettings.userId, ctx.user.id))
      .limit(1);
    return (
      rows[0] ?? {
        userId: ctx.user.id,
        targetMinutes: 480,
        targetBedTime: "23:00",
        updatedAt: new Date(0),
      }
    );
  }),

  updateSettings: authedQuery
    .input(
      z.object({
        targetMinutes: z.number().int().min(240).max(720),
        targetBedTime: z.string().regex(timeRe, "时间格式应为 HH:MM"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .insert(sleepSettings)
        .values({
          userId: ctx.user.id,
          targetMinutes: input.targetMinutes,
          targetBedTime: input.targetBedTime,
        })
        .onDuplicateKeyUpdate({
          set: {
            targetMinutes: input.targetMinutes,
            targetBedTime: input.targetBedTime,
          },
        });
      return { ok: true as const };
    }),
});
