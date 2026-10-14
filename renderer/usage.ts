import { copyFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface UsageLimits {
  monthlySeconds: number;
  dailyCaptures: number;
  bootSeconds: number;
}

export interface UsageState {
  month: string;
  seconds: number;
  boots: number;
  captures: number;
  day: string;
  dayCaptures: number;
}

export type Pause = "monthly" | "daily" | "unrecorded";

export interface Usage {
  persistent: boolean;
  boot(): void;
  tick(): void;
  takeCapture(): Pause | null;
  paused(): Pause | null;
  snapshot(): UsageState & { monthlySeconds: number; dailyCaptures: number; persistent: boolean; paused: Pause | null };
}

const monthOf = (t: number) => new Date(t).toISOString().slice(0, 7);
const monthStart = (t: number) => Date.parse(`${monthOf(t)}-01T00:00:00Z`);
const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);
const fresh = (t: number): UsageState => ({ month: monthOf(t), seconds: 0, boots: 0, captures: 0, day: dayOf(t), dayCaptures: 0 });

const isState = (v: unknown): v is UsageState => {
  const s = v as Record<string, unknown>;
  return !!s && typeof s === "object" && typeof s.month === "string" && typeof s.day === "string" && [s.seconds, s.boots, s.captures, s.dayCaptures].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0);
};

export function createUsage(path: string | null, limits: UsageLimits, now: () => number = Date.now, log: (line: Record<string, unknown>) => void = () => undefined): Usage {
  let broken = false;
  let state = fresh(now());

  if (path) {
    let text: string | null = null;
    try {
      text = readFileSync(path, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") broken = true;
    }
    if (text !== null) {
      let saved: unknown = null;
      try {
        saved = JSON.parse(text);
      } catch {
        saved = null;
      }
      if (isState(saved)) state = saved;
      else {
        state = { ...fresh(now()), seconds: limits.monthlySeconds };
        try {
          copyFileSync(path, `${path}.unreadable-${now()}`);
        } catch {
          broken = true;
        }
        log({ event: "usage_unreadable", path, assumed: "the month's allowance is spent" });
      }
    }
    if (broken) log({ event: "usage_unavailable", path });
  }

  let last = now();
  const roll = (t: number) => {
    if (state.month !== monthOf(t)) state = fresh(t);
    if (state.day !== dayOf(t)) state = { ...state, day: dayOf(t), dayCaptures: 0 };
  };
  const save = () => {
    if (!path || broken) return;
    try {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(`${path}.tmp`, JSON.stringify(state));
      renameSync(`${path}.tmp`, path);
    } catch (err) {
      broken = true;
      log({ event: "usage_unwritable", path, error: String(err instanceof Error ? err.message : err).slice(0, 120) });
    }
  };
  const advance = () => {
    const t = now();
    const from = Math.max(last, monthStart(t));
    roll(t);
    state.seconds += Math.max(0, (t - from) / 1000);
    last = t;
  };
  const paused = (): Pause | null => {
    if (broken) return "unrecorded";
    if (state.seconds >= limits.monthlySeconds) return "monthly";
    if (state.dayCaptures >= limits.dailyCaptures) return "daily";
    return null;
  };

  return {
    persistent: !!path,
    boot() {
      roll(now());
      state.boots++;
      state.seconds += limits.bootSeconds;
      last = now();
      save();
    },
    tick() {
      advance();
      save();
    },
    takeCapture() {
      advance();
      const why = paused();
      if (why) return why;
      state.captures++;
      state.dayCaptures++;
      save();
      return null;
    },
    paused() {
      advance();
      return paused();
    },
    snapshot() {
      advance();
      return { ...state, seconds: Math.round(state.seconds), monthlySeconds: limits.monthlySeconds, dailyCaptures: limits.dailyCaptures, persistent: !!path, paused: paused() };
    },
  };
}
