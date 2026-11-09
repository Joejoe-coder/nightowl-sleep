import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** 一条睡眠记录：以"起床日"为归属日期，上床时间可能在前一天 */
export const sleepRecords = mysqlTable(
  "sleep_records",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    /** 归属日期 YYYY-MM-DD（起床当天） */
    date: varchar("date", { length: 10 }).notNull(),
    /** 上床时间 HH:MM */
    bedTime: varchar("bedTime", { length: 5 }).notNull(),
    /** 起床时间 HH:MM */
    wakeTime: varchar("wakeTime", { length: 5 }).notNull(),
    /** 入睡耗时（分钟） */
    latencyMin: int("latencyMin").notNull().default(15),
    /** 主观睡眠质量 1-5 */
    quality: int("quality").notNull().default(3),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("sleep_records_user_date").on(t.userId, t.date)],
);

export type SleepRecord = typeof sleepRecords.$inferSelect;
export type InsertSleepRecord = typeof sleepRecords.$inferInsert;

/** 每个用户一行的睡眠目标设置 */
export const sleepSettings = mysqlTable("sleep_settings", {
  userId: bigint("userId", { mode: "number", unsigned: true })
    .primaryKey()
    .references(() => users.id),
  /** 目标睡眠时长（分钟），默认 8 小时 */
  targetMinutes: int("targetMinutes").notNull().default(480),
  /** 目标上床时间 HH:MM */
  targetBedTime: varchar("targetBedTime", { length: 5 })
    .notNull()
    .default("23:00"),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type SleepSettings = typeof sleepSettings.$inferSelect;
