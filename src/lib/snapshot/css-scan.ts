const SPACE = /\s*/y;
const VALUE_END = /[;}]/g;
const FAMILY = /-family/iy;

function skipSpace(css: string, from: number): number {
  SPACE.lastIndex = from;
  SPACE.exec(css);
  return SPACE.lastIndex;
}

function valueAfterColon(css: string, from: number): { value: string; end: number } | null {
  const colon = skipSpace(css, from);
  if (css[colon] !== ":") return null;
  const start = skipSpace(css, colon + 1);
  VALUE_END.lastIndex = start;
  const end = VALUE_END.exec(css)?.index ?? css.length;
  if (end > start) return { value: css.slice(start, end), end };
  if (start > colon + 1) return { value: css.slice(start - 1, start), end: start };
  return null;
}

export function stripComments(css: string): string {
  let out = "";
  let at = 0;
  for (;;) {
    const open = css.indexOf("/*", at);
    if (open < 0) break;
    const close = css.indexOf("*/", open + 2);
    if (close < 0) break;
    out += css.slice(at, open);
    at = close + 2;
  }
  return at === 0 ? css : out + css.slice(at);
}

export function* cssRules(css: string): Generator<[selector: string, body: string]> {
  const brace = /[{}]/g;
  let since = 0;
  let current = brace.exec(css);
  while (current) {
    const open = current.index;
    if (css[open] === "}") {
      since = open + 1;
      current = brace.exec(css);
      continue;
    }
    const next = brace.exec(css);
    if (!next) return;
    if (css[next.index] === "{") {
      since = open + 1;
      current = next;
      continue;
    }
    if (open > since) yield [css.slice(since, open), css.slice(open + 1, next.index)];
    since = next.index + 1;
    current = brace.exec(css);
  }
}

export function* fontDeclarations(css: string): Generator<[selector: string, value: string]> {
  const brace = /[{}]/g;
  const font = /font/gi;
  let known = -2;
  const nextFont = (from: number): number => {
    if (known === -1 || known >= from) return known;
    font.lastIndex = from;
    known = font.exec(css)?.index ?? -1;
    return known;
  };
  let since = 0;
  for (;;) {
    brace.lastIndex = since;
    const found = brace.exec(css);
    if (!found) return;
    const open = found.index;
    if (css[open] === "}") {
      since = open + 1;
      continue;
    }
    const end = brace.exec(css)?.index ?? css.length;
    let hit: { value: string; end: number } | null = null;
    for (let at = nextFont(open + 1); at !== -1 && at < end && !hit; at = nextFont(at + 1)) {
      const after = at + 4;
      FAMILY.lastIndex = after;
      hit = (FAMILY.test(css) ? valueAfterColon(css, after + 7) : null) ?? valueAfterColon(css, after);
    }
    if (hit) {
      yield [css.slice(since, open), hit.value];
      since = hit.end;
    } else since = open + 1;
  }
}

export function* colorFunctions(css: string): Generator<{ index: number; end: number; name: string; args: string }> {
  const head = /\b(rgba?|hsla?)\(/gi;
  let from = 0;
  for (;;) {
    head.lastIndex = from;
    const found = head.exec(css);
    if (!found) return;
    const open = head.lastIndex;
    const close = css.indexOf(")", open);
    if (close < 0) return;
    const start = skipSpace(css, open);
    if (close === open) {
      from = found.index + 1;
      continue;
    }
    yield { index: found.index, end: close + 1, name: found[1], args: css.slice(close > start ? start : start - 1, close) };
    from = close + 1;
  }
}

export function* customProperties(css: string, named?: RegExp): Generator<[name: string, value: string]> {
  const run = /[\w-]+/g;
  for (let found = run.exec(css); found; found = run.exec(css)) {
    const at = found[0].indexOf("--");
    if (at < 0 || at > found[0].length - 3) continue;
    const name = found[0].slice(at);
    if (named && !named.test(name.slice(2))) continue;
    const hit = valueAfterColon(css, run.lastIndex);
    if (!hit) continue;
    yield [name, hit.value];
    run.lastIndex = hit.end;
  }
}
