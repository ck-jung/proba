"use strict";
/* ═══════════════════════════════════════════════════════════════════
   가짜 @playwright/test — 생성된 코드를 브라우저 없이 실행해 보기 위한 것

   목적은 "문법이 맞나" 가 아니라 "실행하면 무엇을 호출하나" 다.
   문법 검사로는 못 잡는 것들을 여기서 잡는다:
     · 블록 스코프 — test.step() 안에서 선언한 변수를 다음 스텝이 읽으면 ReferenceError
     · 저장 변수가 실제로 흘러가는가 — ${orderId} 가 진짜 값으로 치환되는가
     · 호출 순서

   테스트 전용이다. 배포에는 포함되지 않는다(package.json files 는 bin·src 만 싣는다).
   ═══════════════════════════════════════════════════════════════════ */

const calls = [];
const rec = (s) => { calls.push(s); return s; };
const fmt = (v) => (typeof v === "string" ? v : JSON.stringify(v));

/* 로케이터 — 액션 메서드만 갖는다. dsl.js 의 ACTS 와 같은 목록이어야 한다. */
const ACTION_METHODS = ["click", "fill", "check", "uncheck", "selectOption", "press"];
function makeLocator(desc) {
  const o = { __desc: desc };
  ACTION_METHODS.forEach((m) => {
    o[m] = async (...a) => rec(desc + "." + m + "(" + a.map(fmt).join(", ") + ")");
  });
  return o;
}

/* page — dsl.js 의 LOCATORS 와 같은 getter 를 갖는다 */
const page = {
  goto: async (u) => rec("goto(" + u + ")"),
  getByTestId: (v) => makeLocator("getByTestId(" + v + ")"),
  getByText: (v) => makeLocator("getByText(" + v + ")"),
  getByLabel: (v) => makeLocator("getByLabel(" + v + ")"),
  getByPlaceholder: (v) => makeLocator("getByPlaceholder(" + v + ")"),
  getByAltText: (v) => makeLocator("getByAltText(" + v + ")"),
  getByTitle: (v) => makeLocator("getByTitle(" + v + ")"),
  locator: (v) => makeLocator("locator(" + v + ")"),
  getByRole: (r, o) => makeLocator("getByRole(" + r + (o && o.name ? ", " + o.name : "") + ")"),
  waitForEvent: async (e) => rec("waitForEvent(" + e + ")"),
};

/* request — 응답은 고정값. 저장 변수가 흘러가는지 보려는 것이지 서버를 흉내 내려는 게 아니다. */
const RESPONSE = { orderId: "ORD-1", total: 12000 };
const request = {};
["get", "post", "put", "patch", "delete"].forEach((m) => {
  request[m] = async (url, opt) => {
    rec("request." + m + "(" + url + (opt ? ", " + JSON.stringify(opt) : "") + ")");
    return { status: () => 200, json: async () => RESPONSE };
  };
});

const MATCHERS = ["toBeVisible", "toBeHidden", "toBeChecked", "toBeEnabled", "toBeDisabled",
                  "toHaveValue", "toContainText", "toHaveText", "toBe", "toBeDefined"];
function expect(x) {
  const desc = x && x.__desc ? x.__desc : fmt(x);
  const o = {};
  MATCHERS.forEach((m) => {
    o[m] = async (...a) => rec("expect(" + desc + ")." + m + "(" + a.map(fmt).join(", ") + ")");
  });
  return o;
}

/* test(name, fn) — 바로 실행한다. 러너 흉내는 내지 않는다. */
const collected = [];
function test(name, fn) { collected.push({ name, fn }); }
test.step = async (title, fn) => { rec("[step] " + title); await fn(); };

async function run() {
  calls.length = 0;
  /* 등록 목록을 먼저 비운다 — 하나가 실패해도 다음 테스트로 새지 않게. */
  const list = collected.slice();
  collected.length = 0;
  for (const t of list) await t.fn({ page, request });
  return calls.slice();
}

module.exports = { test, expect, run, calls, RESPONSE };
