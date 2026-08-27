"use strict";
/* ═══════════════════════════════════════════════════════════════════
   스텝 ↔ 코드 매핑 · 단일 출처

   파서(codegen → 스텝)와 생성기(스텝 → 코드)가 이 표 하나를 본다.
   양쪽에 따로 적으면 반드시 어긋난다 — test/roundtrip.test.js 가 그걸 잡는다.

   🔑 왕복은 "스텝 기준" 으로만 같다. 코드는 같지 않을 수 있다.
      예: toHaveText 와 toContainText 는 둘 다 스텝 text = "..." 이 되고,
          생성기는 그중 toContainText 로만 되돌린다. 스텝이 정본이므로 이것이 맞다.
   ═══════════════════════════════════════════════════════════════════ */

/* ───────── 문자열 리터럴 ───────── */
const STR = "(?:'((?:[^'\\\\]|\\\\.)*)'|\"((?:[^\"\\\\]|\\\\.)*)\"|`((?:[^`\\\\]|\\\\.)*)`)";
function unq(m1, m2, m3) {
  const v = m1 !== undefined ? m1 : m2 !== undefined ? m2 : m3;
  return v === undefined ? null : String(v).replace(/\\(['"`\\])/g, "$1");
}
/* 작은따옴표 코드 리터럴 — 생성기 출력용 */
function q(s) {
  return "'" + String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
}

/* ───────── 1. 로케이터 표 ─────────
   get  Playwright getter 이름
   dsl  getter 인자 → PROBA DSL 문자열   (파서가 쓴다)
   re   PROBA DSL 문자열 → getter 인자   (생성기가 쓴다)

   role= 은 이름(name)이 붙어 형태가 달라 따로 다룬다.
   어느 것에도 안 맞으면 locator(셀렉터) 로 본다 — CSS·XPath 가 여기로 온다. */
const LOCATORS = [
  { get: "getByTestId",     dsl: (v) => "[data-testid=" + v + "]", re: /^\[data-testid=([\s\S]+)\]$/ },
  { get: "getByText",       dsl: (v) => "text=" + v,               re: /^text=([\s\S]+)$/ },
  { get: "getByLabel",      dsl: (v) => "label=" + v,              re: /^label=([\s\S]+)$/ },
  { get: "getByPlaceholder",dsl: (v) => "placeholder=" + v,        re: /^placeholder=([\s\S]+)$/ },
  { get: "getByAltText",    dsl: (v) => "alt=" + v,                re: /^alt=([\s\S]+)$/ },
  { get: "getByTitle",      dsl: (v) => "title=" + v,              re: /^title=([\s\S]+)$/ },
];

/* 코드 → DSL. 단일 getter 호출만 표현한다.
   .first() / .nth(2) / .filter() / frameLocator() 처럼 체인이 붙으면 null → 코드 스텝 */
function codeToDsl(chain) {
  const c = String(chain || "").trim();

  // getByRole('button', { name: '로그인', exact: true })
  let m = c.match(new RegExp("^getByRole\\(\\s*" + STR + "\\s*(?:,\\s*\\{([\\s\\S]*)\\})?\\s*\\)$"));
  if (m) {
    const role = unq(m[1], m[2], m[3]);
    const nm = (m[4] || "").match(new RegExp("name\\s*:\\s*" + STR));
    const name = nm ? unq(nm[1], nm[2], nm[3]) : null;
    return name ? "role=" + role + "[" + name + "]" : "role=" + role;
  }
  for (const L of LOCATORS) {
    m = c.match(new RegExp("^" + L.get + "\\(\\s*" + STR + "\\s*(?:,[\\s\\S]*)?\\)$"));
    if (m) return L.dsl(unq(m[1], m[2], m[3]));
  }
  m = c.match(new RegExp("^locator\\(\\s*" + STR + "\\s*(?:,[\\s\\S]*)?\\)$"));
  if (m) return unq(m[1], m[2], m[3]);
  return null;   // 표현 불가 → 코드 스텝
}

/* DSL → 코드. codeToDsl 의 역방향. 순서가 표와 같아야 왕복이 맞는다. */
function dslToCode(loc) {
  const s = String(loc || "");
  const m = s.match(/^role=([a-zA-Z][a-zA-Z-]*)(?:\[([\s\S]*)\])?$/);
  if (m) return m[2] != null ? "getByRole(" + q(m[1]) + ", { name: " + q(m[2]) + " })" : "getByRole(" + q(m[1]) + ")";
  for (const L of LOCATORS) {
    const r = s.match(L.re);
    if (r) return L.get + "(" + q(r[1]) + ")";
  }
  return "locator(" + q(s) + ")";
}

/* ───────── 2. 액션 표 ─────────
   act  PROBA 스텝의 act
   m    Playwright 메서드 (val 에 따라 갈리면 함수)
   arg  메서드 인자 코드 (없으면 "")

   파서 쪽 매핑(코드 → act)은 parse.js 의 toStep 이 갖는다.
   메서드 이름이 여기 없으면 코드 스텝으로 보존된다(dblclick·hover·setInputFiles 등). */
const ACTS = {
  "클릭":      { m: () => "click",  arg: () => "" },
  "입력":      { m: () => "fill",   arg: (v) => valArg(v) },
  "체크":      { m: (v) => (String(v).indexOf("해제") >= 0 ? "uncheck" : "check"), arg: () => "" },
  "선택":      { m: () => "selectOption", arg: (v) => valArg(v) },
  "키 누르기":  { m: () => "press",  arg: (v) => q(stripQuotes(v)) },
};

/* ───────── 3. 화면 검증 표 ─────────
   파서가 만드는 val 형태 ↔ Playwright matcher.
   value/text 는 값을 품고 있어 정규식으로 뽑는다. */
const ASSERTS = [
  { val: "visible = true",  code: () => ".toBeVisible()" },
  { val: "visible = false", code: () => ".toBeHidden()" },
  { val: "checked = true",  code: () => ".toBeChecked()" },
  { val: "enabled = true",  code: () => ".toBeEnabled()" },
  { val: "enabled = false", code: () => ".toBeDisabled()" },
];
const ASSERT_VALUE = /^value\s*=\s*"([\s\S]*)"$/;
const ASSERT_TEXT  = /^text\s*=\s*"([\s\S]*)"$/;

function assertToCode(val) {
  const v = String(val || "").trim();
  for (const A of ASSERTS) if (v === A.val) return A.code();
  let m = v.match(ASSERT_VALUE); if (m) return ".toHaveValue(" + q(m[1]) + ")";
  m = v.match(ASSERT_TEXT);      if (m) return ".toContainText(" + q(m[1]) + ")";
  return null;   // 모르는 검증 — 생성기가 코드 스텝으로 떨군다
}

/* ───────── 4. 값(val) → 코드 인자 ─────────
   파서가 남기는 형태는 셋이다:
     "실제 문자열"   따옴표를 포함한 리터럴
     ${계정 ID}      실행 시점에 주입되는 계정 (비밀번호는 값이 아니라 참조만 남는다)
     ${row.컬럼}     데이터 구동 행 — 이번 범위 밖이지만 자리는 만들어 둔다 */
function stripQuotes(v) {
  const s = String(v == null ? "" : v);
  return /^".*"$/.test(s) ? s.slice(1, -1) : s;
}
function valArg(v) {
  const s = String(v == null ? "" : v).trim();
  if (s === "${계정 ID}") return "ACCT.id";
  if (s === "${계정 비밀번호}") return "ACCT.pw";
  const row = s.match(/^\$\{row\.([A-Za-z0-9_]+)\}$/);
  if (row) return "row." + row[1];
  return q(stripQuotes(s));
}

/* ───────── 5. 코드 스텝 안의 자리표시자 ─────────
   변환된 스텝은 valArg 가 ACCT.pw 로 바꾸지만, 코드 스텝은 원본이 그대로 나간다.
   그대로 두면 '${계정 비밀번호}' 라는 **글자를** 입력해 로그인이 실패한다
   (작은따옴표 문자열이라 JS 가 보간하지 않는다. 백틱이면 없는 변수를 찾다 죽는다).

   즉 저장은 참조로 하되 실행 직전에는 반드시 값으로 바뀌어야 한다.
   파서가 심는 자리표시자와 여기가 짝이다 — 한쪽만 고치면 조용히 로그인이 깨진다. */
const PLACEHOLDERS = [
  [/(['"`])\$\{계정 비밀번호\}\1/g, "ACCT.pw"],
  [/(['"`])\$\{계정 ID\}\1/g, "ACCT.id"],
];
function codePlaceholders(src) {
  let s = String(src == null ? "" : src);
  PLACEHOLDERS.forEach(function (p) { s = s.replace(p[0], p[1]); });
  return s;
}

module.exports = { STR, unq, q, LOCATORS, codeToDsl, dslToCode, ACTS, assertToCode, valArg, stripQuotes, codePlaceholders };
