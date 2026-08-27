"use strict";
/* ═══════════════════════════════════════════════════════════════════
   실행 테스트 — 생성된 코드를 진짜로 돌려본다

   왕복 테스트(roundtrip)는 "두 방향이 합의하는가" 를 본다.
   여기서는 "실행하면 무엇을 하는가" 를 본다. 문법 검사로는 못 잡는 것들이 있다:

     · 블록 스코프 — test.step() 안에서 선언한 변수를 다음 스텝이 읽으면 ReferenceError
       (개발 중 실제로 이 버그를 냈다. 문법은 멀쩡했고 실행에서만 죽는다)
     · 저장 변수가 진짜로 흘러가는가 — ${orderId} 가 응답 값으로 치환되는가
     · 호출 순서와 인자

   브라우저는 쓰지 않는다. test/_stub.js 가 page·request·expect 를 대신하고
   호출 목록을 기록한다. 실제 브라우저 실행은 이 CLI 의 범위가 아니다.
   ═══════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { generateSpec } = require("../src/generate");
const stub = require("./_stub");

let pass = 0, fail = 0;
function t(name, fn) {
  return fn().then(
    () => { pass++; console.log("  \x1b[32m✓\x1b[0m " + name); },
    (e) => { fail++; console.log("  \x1b[31m✗\x1b[0m " + name + "\n    " + (e && e.message)); }
  );
}

/* 생성물을 실행 가능한 형태로 바꾼다.
   TS 요소는 import 한 줄뿐이라 require 로 갈아끼우면 그대로 돈다 — 트랜스파일러가 필요 없다. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "proba-exec-"));
let seq = 0;
async function runSpec(c, opt) {
  const g = generateSpec(c, opt);
  /* 생성물의 import 를 CJS 로 갈아끼운다. 늘어나면 여기도 늘려야 한다 —
     안 그러면 .cjs 파일에 ESM 문법이 남아 SyntaxError 로 전부 깨진다. */
  const js = g.code
    .replace(
      /^import \{ test, expect \} from '@playwright\/test';$/m,
      "const { test, expect } = require(" + JSON.stringify(path.resolve(__dirname, "_stub.js")) + ");"
    )
    .replace(/^import fs from 'fs';$/m, "const fs = require('fs');");
  const file = path.join(TMP, "case" + ++seq + ".cjs");
  fs.writeFileSync(file, js, "utf8");
  require(file);                 // test(...) 가 등록된다
  return { calls: await stub.run(), code: g.code, stats: g.stats };
}
const has = (calls, s) => calls.some((c) => c.indexOf(s) >= 0);
function want(calls, s) { if (!has(calls, s)) throw new Error("호출이 없음: " + s + "\n    실제: " + JSON.stringify(calls, null, 1)); }

(async () => {
console.log("\n\x1b[1m생성된 코드 실행\x1b[0m");

await t("웹 스텝이 순서대로 호출된다", async () => {
  const r = await runSpec({ id: "TC-1", name: "로그인", steps: [
    { act: "이동", loc: "/login", val: "-" },
    { act: "입력", loc: "[data-testid=email]", val: '"a@b.io"' },
    { act: "클릭", loc: "role=button[로그인]", val: "-" },
    { act: "화면 검증", loc: "text=환영합니다", val: "visible = true" },
  ]});
  const acts = r.calls.filter((c) => c.indexOf("[step]") !== 0);
  const expected = [
    "goto(/login)",
    "getByTestId(email).fill(a@b.io)",
    "getByRole(button, 로그인).click()",
    "expect(getByText(환영합니다)).toBeVisible()",
  ];
  if (JSON.stringify(acts) !== JSON.stringify(expected))
    throw new Error("호출이 다름\n    기대 " + JSON.stringify(expected) + "\n    실제 " + JSON.stringify(acts));
});

await t("계정 변수가 환경변수로 흘러간다", async () => {
  process.env.PROBA_ACCT_ID = "qa_user01";
  process.env.PROBA_ACCT_PW = "s3cret";
  const r = await runSpec({ id: "TC-2", name: "계정", steps: [
    { act: "입력", loc: "[data-testid=id]", val: "${계정 ID}" },
    { act: "입력", loc: "[data-testid=pw]", val: "${계정 비밀번호}" },
  ]});
  want(r.calls, "getByTestId(id).fill(qa_user01)");
  want(r.calls, "getByTestId(pw).fill(s3cret)");
});

await t("★ 코드 스텝의 비밀번호 자리표시자가 실제 값으로 실행된다", async () => {
  /* 녹화 때 치환한 ${계정 비밀번호} 는 실행 직전에 값이 되어야 한다.
     안 바뀌면 그 글자를 그대로 입력해 로그인이 조용히 실패한다.
     팝업 로그인이 코드 스텝으로 떨어지므로 이 경로가 실제로 쓰인다. */
  process.env.PROBA_ACCT_PW = "real-pw-9";
  const r = await runSpec({ id: "TC-PW", name: "팝업 로그인", steps: [
    { act: "코드 스텝", loc: "", val: "",
      code: "await page.getByLabel('비밀번호').fill('${계정 비밀번호}');" },
  ]});
  want(r.calls, "getByLabel(비밀번호).fill(real-pw-9)");
  if (JSON.stringify(r.calls).indexOf("계정 비밀번호") >= 0)
    throw new Error("자리표시자가 그대로 입력됐다 — 로그인이 깨진다");
});

await t("★ 워커 슬롯마다 다른 계정을 쓴다 (F4)", async () => {
  /* 환경변수 하나로는 워커가 여럿일 때 전부 같은 계정을 쓴다 — 세션이 서로를 밀어낸다.
     TEST_PARALLEL_INDEX 로 계정 풀에서 자기 몫을 고른다. */
  const pool = path.join(TMP, "pool.json");
  fs.writeFileSync(pool, JSON.stringify([
    { id: "qa_user01", pw: "pw-0" }, { id: "qa_user02", pw: "pw-1" },
  ]), "utf8");
  process.env.PROBA_ACCT_POOL = pool;
  const steps = [{ act: "입력", loc: "[data-testid=id]", val: "${계정 ID}" }];

  process.env.TEST_PARALLEL_INDEX = "0";
  want((await runSpec({ id: "W0", name: "슬롯0", steps })).calls, "fill(qa_user01)");
  process.env.TEST_PARALLEL_INDEX = "1";
  want((await runSpec({ id: "W1", name: "슬롯1", steps })).calls, "fill(qa_user02)");

  delete process.env.PROBA_ACCT_POOL; delete process.env.TEST_PARALLEL_INDEX;
});

await t("계정 풀이 없으면 환경변수로 떨어진다 (로그인 없는 케이스)", async () => {
  delete process.env.PROBA_ACCT_POOL;
  process.env.PROBA_ACCT_ID = "fallback-id";
  const r = await runSpec({ id: "NP", name: "폴백", steps: [
    { act: "입력", loc: "[data-testid=id]", val: "${계정 ID}" },
  ]});
  want(r.calls, "fill(fallback-id)");
});

await t("잘못된 요청 본문은 스텝을 건너뛰고 나머지는 실행된다", async () => {
  const r = await runSpec({ id: "BJ", name: "본문오류", steps: [
    { act: "클릭", loc: "role=button[a]", val: "-" },
    { act: "요청", loc: "POST /x", val: "-", body: "} 문법오류" },
    { act: "클릭", loc: "role=button[b]", val: "-" },
  ]});
  want(r.calls, "getByRole(button, a).click()");
  want(r.calls, "getByRole(button, b).click()");
  if (r.stats.skipped !== 1) throw new Error("skipped 가 1이 아님");
  if (String(r.stats.notes).indexOf("JSON") < 0) throw new Error("이유가 안 남음");
});

await t("제목에 후행 공백이 없다", async () => {
  const g = generateSpec({ id: "TC-1", name: "", steps: [] });
  if (g.code.indexOf("test('TC-1'") < 0)
    throw new Error("제목이 다름: " + g.code.split("\n").find((l) => l.startsWith("test(")));
});

await t("★ 저장 변수가 스텝 경계를 넘는다 (블록 스코프)", async () => {
  const r = await runSpec({ id: "TC-3", name: "결제", steps: [
    { act: "요청", loc: "POST /v1/orders/checkout", val: "-", body: '{ "payment": "card" }', save: "orderId = $.orderId" },
    { act: "응답 검증", loc: "상태코드", val: "200" },
    { act: "이동", loc: "/orders/${orderId}", val: "-" },
  ]});
  // 응답의 orderId 가 다음 스텝의 경로에 실제로 박혀야 한다
  want(r.calls, "goto(/orders/" + stub.RESPONSE.orderId + ")");
  want(r.calls, "expect(200).toBe(200)");
});

await t("★ 코드 스텝이 뒤 코드 스텝에 변수를 넘긴다 (팝업)", async () => {
  const r = await runSpec({ id: "TC-4", name: "팝업", steps: [
    { act: "코드 스텝", loc: "", val: "", code: "const p1 = page.waitForEvent('popup');" },
    { act: "클릭", loc: "role=link[약관]", val: "-" },
    { act: "코드 스텝", loc: "", val: "", code: "const opened = await p1;" },
  ]});
  want(r.calls, "waitForEvent(popup)");
  want(r.calls, "getByRole(link, 약관).click()");
});

await t("API 응답 본문 검증", async () => {
  const r = await runSpec({ id: "TC-5", name: "API", steps: [
    { act: "요청", loc: "POST /v1/orders", val: "-" },
    { act: "응답 검증", loc: "$.orderId", val: "존재" },
    { act: "응답 검증", loc: "$.total", val: "12000" },
  ]});
  want(r.calls, "request.post(/v1/orders)");
  // 스텁은 문자열을 따옴표 없이 기록한다 — 응답 값이 실제로 흘러왔는지만 본다
  want(r.calls, "expect(" + stub.RESPONSE.orderId + ").toBeDefined()");
  want(r.calls, "expect(" + stub.RESPONSE.total + ").toBe(" + stub.RESPONSE.total + ")");
});

await t("타임라인 제목이 스텝마다 붙는다", async () => {
  const r = await runSpec({ id: "TC-6", name: "타임라인", steps: [
    { act: "이동", loc: "/a", val: "-" },
    { act: "클릭", loc: "role=button[확인]", val: "-" },
  ]});
  const steps = r.calls.filter((c) => c.indexOf("[step]") === 0);
  if (steps.length !== 2) throw new Error("test.step 이 2개가 아님: " + JSON.stringify(steps));
  if (steps[0] !== "[step] 이동 · /a") throw new Error("제목이 다름: " + steps[0]);
});

await t("미지원 스텝이 있어도 나머지는 실행된다 (손실 0)", async () => {
  const r = await runSpec({ id: "TC-7", name: "미지원", steps: [
    { act: "클릭", loc: "role=button[a]", val: "-" },
    { act: "두들기기", loc: "x", val: "-" },
    { act: "클릭", loc: "role=button[b]", val: "-" },
  ]});
  want(r.calls, "getByRole(button, a).click()");
  want(r.calls, "getByRole(button, b).click()");
  if (r.stats.skipped !== 1) throw new Error("skipped 가 1이 아님");
});

await t("체크·해제·선택·키 누르기", async () => {
  const r = await runSpec({ id: "TC-8", name: "폼", steps: [
    { act: "체크", loc: "label=동의", val: "체크" },
    { act: "체크", loc: "label=수신", val: "해제" },
    { act: "선택", loc: "label=지역", val: '"서울"' },
    { act: "키 누르기", loc: "[data-testid=q]", val: "Enter" },
  ]});
  want(r.calls, "getByLabel(동의).check()");
  want(r.calls, "getByLabel(수신).uncheck()");
  want(r.calls, "getByLabel(지역).selectOption(서울)");
  want(r.calls, "getByTestId(q).press(Enter)");
});

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
console.log("\n" + (fail ? "\x1b[31m" : "\x1b[32m") + pass + " passed, " + fail + " failed\x1b[0m\n");
process.exit(fail ? 1 : 0);
})();
