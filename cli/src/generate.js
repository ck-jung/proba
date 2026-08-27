"use strict";
/* ═══════════════════════════════════════════════════════════════════
   PROBA 스텝 → Playwright .spec.ts

   참고 구현이다. 실 제품에서는 이 생성기를 **서버가 소유한다** —
   프론트·서버에 이중 구현하면 반드시 어긋난다(목업 fqa/screens.jsx 주석과 같은 결정).
   여기서는 서버 없이 스텝만 있으면 돌려볼 수 있게 CLI 에 붙여 둔다.

   설계
     · 매핑 표는 src/dsl.js 단일 출처다. 여기서 역방향을 따로 적지 않는다.
     · 모르는 스텝은 버리지 않고 주석으로 남긴다 — 파서와 같은 원칙(손실 0).
     · 코드 스텝은 test.step() 으로 감싸지 않는다(아래 wrap 참조).
   ═══════════════════════════════════════════════════════════════════ */

const D = require("./dsl");

/* 🔑 wrap — test.step() 으로 감쌀 것인가
     true (기본)  결과 화면 타임라인에 스텝별로 뜬다. 실 실행은 이쪽.
     false        평문. 왕복 테스트가 쓴다(파서는 test.step 을 한 문장으로 보므로).

   감싸도 코드 스텝만은 예외다. 코드 스텝끼리 변수를 주고받기 때문이다 —
   자세한 이유는 parse.js 진입점 주석 참고(팝업 예시). */

const IND = "  ";

/* 경로에 ${저장변수} 가 있으면 템플릿 리터럴로 낸다.
   저장 변수만 허용한다 — ${계정 ID} 처럼 식별자가 아닌 것은 문자열로 둔다. */
function pathArg(p) {
  const s = String(p == null ? "" : p);
  const vars = s.match(/\$\{([^}]*)\}/g) || [];
  const ok = vars.length > 0 && vars.every((v) => /^\$\{[A-Za-z_$][A-Za-z0-9_$]*\}$/.test(v));
  if (!ok) return D.q(s);
  return "`" + s.replace(/`/g, "\\`") + "`";
}

/* JSONPath 아주 얕은 것만 — $.a.b → body.a.b. 배열 인덱스 등은 미지원(주석으로 남긴다) */
function jsonPath(p) {
  const m = String(p || "").match(/^\$((?:\.[A-Za-z_$][A-Za-z0-9_$]*)+)$/);
  return m ? "body" + m[1] : null;
}

/* ───────── 스텝 하나 → 코드 줄들 ───────── */
function stepLines(st, ctx) {
  const act = st.act;
  const loc = st.loc || "";
  const val = st.val == null ? "" : String(st.val);

  /* 코드 스텝도 자리표시자는 값으로 바꾼다 — 안 그러면 그 글자를 그대로 입력한다.
     "원본 보존" 은 우리가 이해 못 한 코드를 버리지 않는다는 뜻이지,
     실행되지 않는 코드를 내보낸다는 뜻이 아니다. */
  if (act === "코드 스텝") return { code: D.codePlaceholders(st.code || "").split("\n"), raw: true };

  if (act === "이동") return { code: ["await page.goto(" + pathArg(loc) + ");"] };

  if (act === "화면 검증") {
    const m = D.assertToCode(val);
    if (!m) return { skip: "검증 형태를 모릅니다: " + val };
    return { code: ["await expect(page." + D.dslToCode(loc) + ")" + m + ";"] };
  }

  const A = D.ACTS[act];
  if (A) {
    const arg = A.arg(val);
    return { code: ["await page." + D.dslToCode(loc) + "." + A.m(val) + "(" + arg + ");"] };
  }

  /* ── API ── */
  if (act === "요청") {
    const m = loc.match(/^([A-Z]+)\s+(\S+)$/);
    if (!m) return { skip: "요청 형태를 모릅니다: " + loc };
    ctx.api = true;
    const opt = [];
    if (st.body && String(st.body).trim()) opt.push("data: " + String(st.body).trim());
    if (st.headers && String(st.headers).trim()) opt.push("headers: " + String(st.headers).trim());
    const out = [
      "res = await request." + m[1].toLowerCase() + "(" + pathArg(m[2]) +
        (opt.length ? ", { " + opt.join(", ") + " }" : "") + ");",
      "body = await res.json().catch(() => ({}));",
    ];
    // save: "orderId = $.orderId" — 이후 스텝이 ${orderId} 로 쓴다
    /* 🔑 저장 변수는 여기서 선언하지 않는다 — test.step() 블록 안이라 스코프가 닫힌다.
       이름만 모아 두고 상단에 let 으로 한 번 선언한다(아래 generateSpec).
       코드 스텝을 감싸지 않는 것과 같은 이유다. */
    const sv = String(st.save || "").match(/^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(\S+)\s*$/);
    if (sv) {
      const src = jsonPath(sv[2]);
      if (src) { out.push(sv[1] + " = " + src + ";"); ctx.saved[sv[1]] = true; }
      else out.push("// 저장 경로를 해석하지 못했습니다: " + sv[2]);
    }
    return { code: out };
  }

  if (act === "응답 검증") {
    ctx.api = true;
    if (loc === "상태코드") return { code: ["expect(res.status()).toBe(" + (parseInt(val, 10) || 0) + ");"] };
    const src = jsonPath(loc);
    if (!src) return { skip: "응답 경로를 해석하지 못했습니다: " + loc };
    if (val === "존재") return { code: ["expect(" + src + ").toBeDefined();"] };
    return { code: ["expect(String(" + src + ")).toBe(" + D.q(D.stripQuotes(val)) + ");"] };
  }

  return { skip: "미지원 스텝: " + act };
}

/* ───────── 진입점 ─────────
   c    { id, name, steps }
   opt  { wrap = true }
   반환 { code, stats: { steps, emitted, skipped, notes } } */
function generateSpec(c, opt) {
  const wrap = !opt || opt.wrap !== false;
  const steps = (c && c.steps) || [];
  const ctx = { api: false, saved: {} };
  const body = [];
  let emitted = 0, skipped = 0;
  const notes = [];

  steps.forEach((st, i) => {
    const r = stepLines(st, ctx);
    if (r.skip) {
      skipped++; notes.push(r.skip);
      body.push(IND + "// ⚠ " + r.skip + "  (스텝 " + (i + 1) + ")");
      return;
    }
    emitted++;
    // 코드 스텝은 감싸지 않는다 — 스텝 간 변수 공유가 깨진다
    if (!wrap || r.raw) { r.code.forEach((l) => body.push(IND + l)); return; }
    const title = (st.act + (st.loc ? " · " + st.loc : "")).replace(/\s+/g, " ");
    body.push(IND + "await test.step(" + D.q(title) + ", async () => {");
    r.code.forEach((l) => body.push(IND + IND + l));
    body.push(IND + "});");
  });

  const fixtures = ["page"].concat(ctx.api ? ["request"] : []).join(", ");
  const head = [
    "import { test, expect } from '@playwright/test';",
    "",
    "/* 자동 생성 — PROBA 스텝에서 만들었습니다. 직접 고치지 마세요.",
    "   스텝이 정본이고 이 파일은 실행할 때마다 다시 만들어집니다.",
    "   경로는 상대경로이며 playwright.config 의 baseURL 이 받습니다. */",
    "",
    "const ACCT = { id: process.env.PROBA_ACCT_ID || '', pw: process.env.PROBA_ACCT_PW || '' };",
  ];
  if (ctx.api) head.push("let res, body;");
  const saved = Object.keys(ctx.saved);
  if (saved.length) head.push("let " + saved.join(", ") + ";   // 요청 스텝이 저장한 값 — 블록 밖에서 선언해야 뒤 스텝이 본다");
  head.push("", "test(" + D.q(((c && c.id) || "TC") + " " + ((c && c.name) || "")) .trim() + ", async ({ " + fixtures + " }) => {");

  return {
    code: head.concat(body, ["});", ""]).join("\n"),
    stats: { steps: steps.length, emitted, skipped, notes },
  };
}

module.exports = { generateSpec, pathArg, jsonPath };
