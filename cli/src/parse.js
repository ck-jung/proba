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
   test(...) 콜백 안의 문장만 뽑는다. 세미콜론으로 끝나지 않으면 다음 줄과 합친다.

   🔑 콜백 밖의 test.use({...}) 는 의도적으로 버린다 — 코드 스텝으로도 남기지 않는다.
      codegen 1.60 부터 --viewport-size 를 이렇게 앞에 붙여 내보낸다:

        test.use({ viewport: { height: 720, width: 1280 } });

      해상도·locale·storageState 같은 것은 '이 케이스가 무엇을 검증하는가'가 아니라
      '어떤 조건에서 돌릴 것인가'다. 그건 케이스가 아니라 실행 계획이 정한다.
      케이스에 박아 두면 계획이 지정한 해상도를 케이스가 덮어써 버린다.

      그래서 여기서 세는 '문장 수'에는 test.use 가 포함되지 않고,
      커버리지 100% 가 나와도 그 줄은 애초에 대상이 아니었다는 뜻이다.
      test.use 에 우리가 받아야 할 정보가 생기면 그때 별도 필드로 뽑는다. */
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
   🔑 매핑 표는 src/dsl.js 단일 출처다. 생성기(generate.js)가 같은 표의 역방향을 쓴다.
      여기에 따로 적으면 두 방향이 어긋나고, roundtrip 테스트가 그걸 잡는다. */
const { STR, unq, codeToDsl } = require("./dsl");
const toDsl = codeToDsl;

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

/* 🔑 코드 스텝 안의 비밀번호도 치환한다 — 여기는 "원본 보존" 원칙의 예외다.

   왜 예외인가: 파서가 변환하지 못한 구간(팝업 로그인이 대표적이다 — page1. 이라
   패턴에 안 걸린다)은 코드 스텝으로 원본이 통째로 들어간다. 그러면 위 redact 가
   손대지 못하고 평문 비밀번호가 steps.json 에 남는다. 실제로 그렇게 샜다.

   손실 0 은 편의고 평문 비밀번호는 사고다. 사고 쪽이 이긴다.

   판단은 위 redact 와 같은 기준(PW_HINT)을 쓴다 — .fill()/.type() 호출 앞의
   로케이터에 비밀번호 힌트가 있으면 그 인자만 바꾼다. 값 자체를 보고 추측하지 않는다
   (정상 입력값을 날리는 쪽이 더 나쁘다). 힌트가 없으면 못 잡으므로,
   CLI 가 로그인이 포함된 녹화는 결과를 확인하라고 알린다. */
function redactCode(src) {
  let hits = 0;
  const out = String(src || "").split("\n").map((line) => {
    let done = line, changed = false;
    ["fill", "type"].forEach((fn) => {
      const i = done.indexOf("." + fn + "(");
      if (i < 0) return;
      if (!PW_HINT.test(done.slice(0, i))) return;          // 로케이터에 힌트가 없으면 손대지 않는다
      const head = done.slice(0, i);
      const tail = done.slice(i);
      const re = new RegExp("^\\." + fn + "\\(\\s*" + STR + "\\s*\\)");
      if (!re.test(tail)) return;
      done = head + tail.replace(re, "." + fn + "('${계정 비밀번호}')");
      changed = true;
    });
    if (changed) hits++;
    return done;
  }).join("\n");
  return { code: out, hits };
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
   연속된 미변환 문장은 하나의 '코드 스텝'으로 묶어 원본을 보존한다.

   ⚠️ 코드 생성기에게 — 코드 스텝은 test.step() 으로 감싸지 말 것.

   코드 스텝끼리 변수를 주고받는다. 대표적인 것이 새 창(팝업)이다:

     const page1Promise = page.waitForEvent('popup');   ← 코드 스텝 A
     await page.getByRole('link').click();               ← 클릭 (변환됨)
     const page1 = await page1Promise;                   ← 코드 스텝 B  A의 변수를 쓴다
     await page1.getByLabel('카드번호').fill('...');      ← 코드 스텝 C  B의 변수를 쓴다

   변환된 스텝이 사이에 끼면 flush() 때문에 A와 B가 별개의 코드 스텝으로 갈린다.
   이때 각 스텝을 test.step(async () => { ... }) 으로 감싸면 블록마다 스코프가 닫혀
   B에서 page1Promise 를 못 찾는다 — ReferenceError 로 죽는다.

   타임라인을 위해 test.step() 으로 감싸고 싶어지지만, 코드 스텝은 예외로 둔다.
   잃는 것도 없다: 코드 스텝은 뜻을 모르는 구간이라 타임라인에 붙일 이름이 "코드 스텝"
   말고는 없고, 그건 정보가 아니다.

   파서가 page. 만 보므로(page1. 은 안 본다) 팝업이 열리면 그 이후가 통째로
   코드 스텝이 된다. 실행은 되지만 스텝 편집과 자가보정은 안 된다.
   팝업을 스텝으로 다루려면 스텝에 "어느 창인가" 축이 필요하고,
   그러면 스텝이 서로 독립이라는 성질이 깨진다 — 빈도를 보고 정할 일이다. */
function parseSpec(src, base, accts) {
  const sts = statements(src);
  const steps = [];
  let pending = [];
  const unknown = [];

  let redacted = 0;
  const flush = () => {
    if (!pending.length) return;
    const r = redactCode(pending.join("\n"));
    redacted += r.hits;
    steps.push({ act: "코드 스텝", loc: "", val: "", code: r.code });
    pending = [];
  };

  for (const st of sts) {
    const s = toStep(st, base, accts);
    if (s) { flush(); steps.push(s); }
    /* 🔑 unknown 은 화면에 그대로 찍힌다 — 여기도 치환해야 한다.
       스텝만 가리고 통계에 원문을 남기면 아무것도 안 가린 것과 같다. */
    else { pending.push(st.raw.join("\n")); unknown.push(redactCode(st.text).code); }
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
      redacted,          // 코드 스텝 안에서 비밀번호로 판단해 치환한 줄 수

      coverage: sts.length ? Math.round((mapped / sts.length) * 100) : 100,
      unknown,
    },
  };
}

module.exports = { parseSpec, toDsl, statements };
