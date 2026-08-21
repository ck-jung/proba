"use strict";
/* ═══════════════════════════════════════════════════════════════════
   Playwright codegen 출력(.spec.ts) → PROBA 스텝

   설계 원칙
     · 아는 패턴만 스텝으로 바꾼다.
     · 모르는 것은 버리지 않고 '코드 스텝'으로 원본을 보존한다  → 손실 0
     · 그래서 파서 커버리지가 낮아도 결과는 항상 실행 가능하다.
       (커버리지를 넓힐수록 코드 스텝이 줄어들 뿐)
   ═══════════════════════════════════════════════════════════════════ */

/* ───────── 1. 문장 분해 ─────────
   test(...) 콜백 안의 문장만 뽑는다. 세미콜론으로 끝나지 않으면 다음 줄과 합친다. */
function statements(src) {
  const lines = String(src || "").split(/\r?\n/);
  const out = [];
  let buf = [];
  let depth = 0;      // test 콜백 안인지
  let started = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!started) {
      // test('...', async ({ page }) => {   부터 시작
      if (/^test\s*\(/.test(line) || /async\s*\(\s*\{\s*page/.test(line)) { started = true; depth = 1; }
      continue;
    }
    if (!line) continue;
    if (line === "});" && depth === 1 && buf.length === 0) break;   // 콜백 종료

    buf.push(line);
    // 괄호 균형이 맞고 세미콜론으로 끝나면 한 문장 완성
    const joined = buf.join(" ");
    if (/;$/.test(line) && balanced(joined)) {
      out.push({ text: joined, raw: buf.slice() });
      buf = [];
    }
  }
  if (buf.length) out.push({ text: buf.join(" "), raw: buf.slice() });
  return out;
}
function balanced(s) {
  let p = 0, b = 0, c = 0;
  for (const ch of s) {
    if (ch === "(") p++; else if (ch === ")") p--;
    else if (ch === "[") b++; else if (ch === "]") b--;
    else if (ch === "{") c++; else if (ch === "}") c--;
  }
  return p <= 0 && b <= 0 && c <= 0;
}

/* ───────── 2. 로케이터 체인 → PROBA DSL ─────────
   단일 getter 호출만 DSL로 표현한다.
   .first() / .nth(2) / .filter() / frameLocator() 처럼 체인이 붙으면 표현 불가 → null (코드 스텝行) */
const STR = "(?:'((?:[^'\\\\]|\\\\.)*)'|\"((?:[^\"\\\\]|\\\\.)*)\"|`((?:[^`\\\\]|\\\\.)*)`)";
function unq(m1, m2, m3) {
  const v = m1 !== undefined ? m1 : m2 !== undefined ? m2 : m3;
  return v === undefined ? null : String(v).replace(/\\(['"`\\])/g, "$1");
}

function toDsl(chain) {
  const c = String(chain || "").trim();

  // getByRole('button', { name: '로그인', exact: true })
  let m = c.match(new RegExp("^getByRole\\(\\s*" + STR + "\\s*(?:,\\s*\\{([\\s\\S]*)\\})?\\s*\\)$"));
  if (m) {
    const role = unq(m[1], m[2], m[3]);
    const opts = m[4] || "";
    const nm = opts.match(new RegExp("name\\s*:\\s*" + STR));
    const name = nm ? unq(nm[1], nm[2], nm[3]) : null;
    return name ? "role=" + role + "[" + name + "]" : "role=" + role;
  }
  const simple = [
    ["getByTestId", (v) => "[data-testid=" + v + "]"],
    ["getByText", (v) => "text=" + v],
    ["getByLabel", (v) => "label=" + v],
    ["getByPlaceholder", (v) => "placeholder=" + v],
    ["getByAltText", (v) => "alt=" + v],
    ["getByTitle", (v) => "title=" + v],
    ["locator", (v) => v],
  ];
  for (const [fn, fmt] of simple) {
    m = c.match(new RegExp("^" + fn + "\\(\\s*" + STR + "\\s*(?:,[\\s\\S]*)?\\)$"));
    if (m) return fmt(unq(m[1], m[2], m[3]));
  }
  return null;   // 표현 불가 → 코드 스텝
}

/* ───────── 3. 문장 → 스텝 ───────── */
const ACTIONS = "click|fill|press|check|uncheck|dblclick|hover|selectOption|setInputFiles|type|clear|focus|tap";
const ASSERTS = "toBeVisible|toBeHidden|toContainText|toHaveText|toHaveValue|toBeChecked|toBeEnabled|toBeDisabled";

function relPath(url, base) {
  let s = String(url || "");
  if (base && s.indexOf(base) === 0) s = s.slice(base.length);
  s = s.replace(/^https?:\/\/[^/]+/, "");
  if (!s) return "/";
  return s.charAt(0) === "/" ? s : "/" + s;
}

/* 시크릿·계정 치환 — 평문 비밀번호가 케이스에 남지 않게 한다.
     · 로케이터에 password 힌트가 있으면  → ${계정 비밀번호} (원본 값은 버린다)
     · 값이 세션 계정 풀의 계정 ID와 같으면 → ${계정 ID}
   accts: [{ role, acct }]  — CLI가 세션 정보에서 받는다 (비밀번호 실값은 받지 않는다) */
const PW_HINT = /pass|pw\b|passwd|비밀번호|암호/i;
function redact(loc, val, accts) {
  if (val === null || val === undefined) return val;
  if (PW_HINT.test(loc)) return "${계정 비밀번호}";
  const hit = (accts || []).some((a) => a && a.acct && a.acct === val);
  return hit ? "${계정 ID}" : val;
}

function toStep(st, base, accts) {
  const t = st.text;

  // await page.goto('...')
  let m = t.match(new RegExp("^await\\s+page\\.goto\\(\\s*" + STR + "[\\s\\S]*\\);$"));
  if (m) return { act: "이동", loc: relPath(unq(m[1], m[2], m[3]), base), val: "-" };

  // await expect(page.<chain>).<assert>(...)
  m = t.match(new RegExp("^await\\s+expect\\(\\s*page\\.([\\s\\S]+?)\\s*\\)\\s*\\.(" + ASSERTS + ")\\(([\\s\\S]*)\\);$"));
  if (m) {
    const loc = toDsl(m[1]);
    if (!loc) return null;
    const kind = m[2];
    const arg = (m[3] || "").trim();
    const s = arg.match(new RegExp("^" + STR));
    const v = s ? unq(s[1], s[2], s[3]) : null;
    if (kind === "toBeVisible") return { act: "화면 검증", loc, val: "visible = true" };
    if (kind === "toBeHidden") return { act: "화면 검증", loc, val: "visible = false" };
    if (kind === "toBeChecked") return { act: "화면 검증", loc, val: "checked = true" };
    if (kind === "toBeEnabled") return { act: "화면 검증", loc, val: "enabled = true" };
    if (kind === "toBeDisabled") return { act: "화면 검증", loc, val: "enabled = false" };
    if (kind === "toHaveValue") return v === null ? null : { act: "화면 검증", loc, val: 'value = "' + v + '"' };
    if (v === null) return null;
    return { act: "화면 검증", loc, val: 'text = "' + v + '"' };   // toContainText / toHaveText
  }

  // await page.<chain>.<action>(...)
  m = t.match(new RegExp("^await\\s+page\\.([\\s\\S]+?)\\.(" + ACTIONS + ")\\(([\\s\\S]*)\\);$"));
  if (m) {
    const loc = toDsl(m[1]);
    if (!loc) return null;
    const act = m[2];
    const arg = (m[3] || "").trim();
    const s = arg.match(new RegExp("^" + STR));
    const v = s ? unq(s[1], s[2], s[3]) : null;
    if (act === "click" || act === "tap") return { act: "클릭", loc, val: "-" };
    if (act === "fill" || act === "type") {
      const r = redact(loc, v, accts);
      if (r === null) return { act: "입력", loc, val: '""' };
      return { act: "입력", loc, val: /^\$\{/.test(r) ? r : '"' + r + '"' };   // 변수 참조는 따옴표 없이
    }
    if (act === "check") return { act: "체크", loc, val: "체크" };
    if (act === "uncheck") return { act: "체크", loc, val: "해제" };
    if (act === "selectOption") return v === null ? null : { act: "선택", loc, val: '"' + v + '"' };
    if (act === "press") return v === null ? null : { act: "키 누르기", loc, val: v };
    return null;   // dblclick/hover/setInputFiles/clear/focus → 코드 스텝으로 보존
  }

  return null;
}

/* ───────── 4. 진입점 ─────────
   반환: { steps, stats }
   연속된 미변환 문장은 하나의 '코드 스텝'으로 묶어 원본을 보존한다. */
function parseSpec(src, base, accts) {
  const sts = statements(src);
  const steps = [];
  let pending = [];
  const unknown = [];

  const flush = () => {
    if (!pending.length) return;
    steps.push({ act: "코드 스텝", loc: "", val: "", code: pending.join("\n") });
    pending = [];
  };

  for (const st of sts) {
    const s = toStep(st, base, accts);
    if (s) { flush(); steps.push(s); }
    else { pending.push(st.raw.join("\n")); unknown.push(st.text); }
  }
  flush();

  const codeSteps = steps.filter((s) => s.act === "코드 스텝").length;
  const mapped = sts.length - unknown.length;
  return {
    steps,
    stats: {
      statements: sts.length,
      mapped,
      unmapped: unknown.length,
      codeSteps,
      coverage: sts.length ? Math.round((mapped / sts.length) * 100) : 100,
      unknown,
    },
  };
}

module.exports = { parseSpec, toDsl, statements };
