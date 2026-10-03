"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CaptureResponse } from "@/app/api/capture/route";
import { unlockAudio } from "@/audio/sfx";
import { Hud } from "@/components/hud/Hud";
import { fmt } from "@/components/hud/format";
import { Landing, type Step } from "@/components/landing/Landing";
import { generateCity } from "@/lib/city/generate";
import { buildRenderModel } from "@/lib/render/render-model";
import { CityRuntime } from "./runtime";
import { useSkyline } from "./store";

const CityScene = dynamic(() => import("@/components/scene/CityScene"), { ssr: false });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function SkylineApp() {
  const phase = useSkyline((s) => s.phase);
  const error = useSkyline((s) => s.error);
  const [runtime, setRuntime] = useState<CityRuntime | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [initial, setInitial] = useState("");
  const run = useRef(0);

  const build = useCallback(async (input: string) => {
    const id = ++run.current;
    const t0 = performance.now();
    unlockAudio();
    const store = useSkyline.getState();
    store.set({ phase: "capturing", error: null, input });
    const host = (() => {
      if (input.startsWith("sample:")) return "the offline sample";
      try {
        return new URL(/^https?:\/\//.test(input) ? input : `https://${input}`).hostname;
      } catch {
        return input;
      }
    })();
    const log: Step[] = [{ key: "resolve", text: `Surveying ${host}`, at: 0, done: false }];
    const push = (s: Omit<Step, "at">) => {
      if (run.current !== id) return;
      const at = performance.now() - t0;
      for (const p of log) p.done = true;
      log.push({ ...s, at });
      setSteps([...log]);
    };
    setSteps([...log]);
    const fetchTimer = setTimeout(() => push({ key: "fetch", text: "Fetching the document over HTTPS", done: false }), 380);

    let res: CaptureResponse;
    try {
      const r = await fetch("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: input }),
      });
      res = (await r.json()) as CaptureResponse;
    } catch {
      res = { ok: false, error: { code: "internal", title: "Couldn't reach the surveyor", detail: "The capture service didn't respond." } };
    }
    clearTimeout(fetchTimer);
    if (run.current !== id) return;

    if (!res.ok) {
      setSteps([]);
      store.set({ phase: "landing", error: res.error });
      return;
    }

    const doc = res.doc;
    push({ key: "parse", text: `Parsed ${fmt(doc.stats.elements)} elements → ${fmt(doc.stats.kept)} structural nodes`, done: false });
    await wait(160);
    const g0 = performance.now();
    const city = generateCity(doc);
    const render = buildRenderModel(city);
    const generateMs = performance.now() - g0;
    push({ key: "zone", text: `Zoned ${fmt(doc.stats.districts)} districts across ${fmt(doc.stats.maxDomDepth)} levels of nesting`, done: false });
    await wait(160);
    push({
      key: "raise",
      text: `Raising ${fmt(city.structures.length)} structures · ${fmt(city.images.length)} billboards`,
      done: false,
    });
    await wait(260);
    if (run.current !== id) return;

    try {
      const params = new URLSearchParams(window.location.search);
      params.set("url", input);
      window.history.replaceState(null, "", `?${params.toString()}`);
    } catch {}

    store.set({
      doc,
      city,
      render,
      meta: { ...res.timings, cached: res.cached, generateMs },
      integrity: 1,
      destroyed: 0,
      selected: null,
      hover: null,
      lastHit: null,
      mode: "explore",
    });
    setRuntime(new CityRuntime(doc, city, render));
    setLeaving(true);
    await wait(1100);
    if (run.current !== id) return;
    store.set({ phase: "city" });
    setLeaving(false);
    setSteps([]);
  }, []);

  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("url");
    if (u) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitial(u);
      void build(u);
    }
  }, [build]);

  const exit = useCallback(() => {
    run.current++;
    if (document.pointerLockElement) document.exitPointerLock();
    useSkyline.getState().reset();
    setRuntime(null);
    setSteps([]);
    try {
      window.history.replaceState(null, "", window.location.pathname);
    } catch {}
  }, []);

  return (
    <main className="app">
      {runtime && (
        <div className="stage">
          <CityScene key={runtime.city.seed + runtime.doc.source.finalUrl} runtime={runtime} />
          {phase === "city" && <Hud runtime={runtime} onExit={exit} />}
        </div>
      )}
      {phase !== "city" && (
        <Landing
          key={initial}
          busy={phase === "capturing"}
          leaving={leaving}
          steps={steps}
          error={error}
          initial={initial}
          onSubmit={(u) => void build(u)}
        />
      )}
    </main>
  );
}
