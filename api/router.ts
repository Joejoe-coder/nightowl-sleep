import { authRouter } from "./auth-router";
import { sleepRouter } from "./sleep-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  sleep: sleepRouter,
});

export type AppRouter = typeof appRouter;
