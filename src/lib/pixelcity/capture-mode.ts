export type CaptureMode = "auto" | "detailed";

export const parseCaptureMode = (v: string | null | undefined): CaptureMode => (v === "detailed" ? "detailed" : "auto");

export interface CityRequest<T, E> {
  loading: boolean;
  error: E | null;
  failedMode: CaptureMode | null;
  shown: { url: string; mode: CaptureMode; city: T } | null;
  switching: CaptureMode | null;
  switchError: { mode: CaptureMode; error: E } | null;
}

export type CityEvent<T, E> =
  | { type: "ask"; url: string; mode: CaptureMode }
  | { type: "built"; url: string; mode: CaptureMode; city: T }
  | { type: "failed"; url: string; mode: CaptureMode; error: E }
  | { type: "dismiss" }
  | { type: "clear" };

export const idle = <T, E>(loading = false): CityRequest<T, E> => ({ loading, error: null, failedMode: null, shown: null, switching: null, switchError: null });

/**
 * A request for another mode of the page on screen never takes the city away:
 * it replaces it only when it succeeds, and a failure is kept beside the city it could not replace.
 */
export function cityStep<T, E>(s: CityRequest<T, E>, e: CityEvent<T, E>): CityRequest<T, E> {
  switch (e.type) {
    case "clear":
      return idle();
    case "dismiss":
      return { ...s, switchError: null };
    case "ask":
      if (s.shown?.url !== e.url) return idle(true);
      return s.shown.mode === e.mode ? { ...s, switching: null } : { ...s, switching: e.mode, switchError: null };
    case "built":
      return { ...idle(), shown: { url: e.url, mode: e.mode, city: e.city } };
    case "failed":
      if (s.shown?.url === e.url) return { ...s, switching: null, switchError: { mode: e.mode, error: e.error } };
      return { ...idle(), error: e.error, failedMode: e.mode };
  }
}
