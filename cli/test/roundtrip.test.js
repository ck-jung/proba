"use strict";
/* ═══════════════════════════════════════════════════════════════════
   왕복 테스트 — 파서와 생성기가 같은 표를 보는지 강제한다

     codegen 출력 → 파서 → 스텝 → 생성기 → spec' → 파서 → 스텝'
                             └────── 같아야 한다 ──────┘

   한쪽만 고치면 여기서 깨진다. 사람이 지키는 규칙이 아니라 테스트가 강제하는 규칙이다.

   🔑 "코드가 같은가" 가 아니라 "스텝이 같은가" 를 본다.
      코드는 같지 않아도 된다 — toHaveText 와 toContainText 는 둘 다 스텝
      text = "..." 이 되고 생성기는 그중 하나로만 되돌린다. 스텝이 정본이므로 맞다.

   🔑 wrap:false 로 낸다. 파서는 test.step(...) 을 한 문장으로 보므로
      감싼 출력은 코드 스텝이 되어 버린다. 여기서 확인하려는 것은 감싸기가 아니라
      매핑 표의 두 방향이 합의하는가다.
   ═══════════════════════════════════════════════════════════════════ */

const { parseSpec } = require("../src/parse");
const { generateSpec } = require("../src/generate");

const { t, done } = require("./_run.js").suite();
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* 스텝 비교용 — 코드 스텝의 원본 문자열은 공백이 달라질 수 있어 정규화한다 */
const norm = (steps) => steps.map((s) => ({
  act: s.act, loc: s.loc, val: s.val,
  code: s.code ? String(s.code).replace(/\s+/g, " ").trim() : undefined,
}));

function roundtrip(src, base) {
  const a = parseSpec(src, base || "", []);
  const gen = generateSpec({ id: "TC-1", name: "왕복", steps: a.steps }, { wrap: false });
  const b = parseSpec(gen.code, base || "", []);
  return { a: norm(a.steps), b: norm(b.steps), code: gen.code, gen };
}

console.log("\n\x1b[1m왕복 (파서 ↔ 생성기)\x1b[0m");

t("웹 액션 — 이동·클릭·입력·검증", () => {
  const r = roundtrip(`
import { test, expect } from '@playwright/test';
test('t', async ({ page }) => {
  await page.goto('https://x.io/login');
  await page.getByTestId('email').fill('a@b.io');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByText('환영합니다')).toBeVisible();
});`, "https://x.io");
  if (!eq(r.a, r.b)) throw new Error("스텝이 달라짐\n  전 " + JSON.stringify(r.a) + "\n  후 " + JSON.stringify(r.b));
  if (r.a.length !== 4) throw new Error("스텝 4개가 아님: " + r.a.length);
});

t("로케이터 6종 — testid·text·label·placeholder·alt·title", () => {
  const r = roundtrip(`
test('t', async ({ page }) => {
  await page.getByTestId('a').click();
  await page.getByText('b').click();
  await page.getByLabel('c').click();
  await page.getByPlaceholder('d').click();
  await page.getByAltText('e').click();
  await page.getByTitle('f').click();
});`);
  if (!eq(r.a, r.b)) throw new Error("로케이터 왕복 실패\n  " + JSON.stringify(r.a) + "\n  " + JSON.stringify(r.b));
  if (r.a.length !== 6) throw new Error("6개가 아님: " + r.a.length);
});

t("role — 이름 있는 것과 없는 것", () => {
  const r = roundtrip(`
test('t', async ({ page }) => {
  await page.getByRole('button', { name: '저장' }).click();
  await page.getByRole('navigation').click();
});`);
  if (!eq(r.a, r.b)) throw new Error("role 왕복 실패\n  " + JSON.stringify(r.a) + "\n  " + JSON.stringify(r.b));
});

t("검증 매처 6종", () => {
  const r = roundtrip(`
test('t', async ({ page }) => {
  await expect(page.getByTestId('a')).toBeVisible();
  await expect(page.getByTestId('b')).toBeHidden();
  await expect(page.getByTestId('c')).toBeChecked();
  await expect(page.getByTestId('d')).toBeEnabled();
  await expect(page.getByTestId('e')).toBeDisabled();
  await expect(page.getByTestId('f')).toHaveValue('v');
});`);
  if (!eq(r.a, r.b)) throw new Error("검증 왕복 실패\n  " + JSON.stringify(r.a) + "\n  " + JSON.stringify(r.b));
});

t("toHaveText 는 toContainText 로 되돌아온다 (스텝은 같다)", () => {
  const r = roundtrip(`
test('t', async ({ page }) => {
  await expect(page.getByTestId('a')).toHaveText('안녕');
});`);
  if (!eq(r.a, r.b)) throw new Error("스텝이 달라짐");
  if (r.code.indexOf("toContainText") < 0) throw new Error("toContainText 로 안 나옴");
});

t("체크·해제·선택·키 누르기", () => {
  const r = roundtrip(`
test('t', async ({ page }) => {
  await page.getByLabel('동의').check();
  await page.getByLabel('수신').uncheck();
  await page.getByLabel('지역').selectOption('서울');
  await page.getByTestId('q').press('Enter');
});`);
  if (!eq(r.a, r.b)) throw new Error("왕복 실패\n  " + JSON.stringify(r.a) + "\n  " + JSON.stringify(r.b));
});

t("CSS 셀렉터는 locator 로 돌아온다", () => {
  const r = roundtrip(`
test('t', async ({ page }) => {
  await page.locator('div.card > a:nth-child(2)').click();
});`);
  if (!eq(r.a, r.b)) throw new Error("왕복 실패");
  if (r.code.indexOf("locator('div.card") < 0) throw new Error("locator 로 안 나옴");
});

t("모르는 것은 코드 스텝으로 보존된다 (손실 0)", () => {
  const r = roundtrip(`
test('t', async ({ page }) => {
  await page.getByTestId('a').click();
  await page.mouse.wheel(0, 100);
  await page.getByTestId('b').click();
});`);
  if (!eq(r.a, r.b)) throw new Error("왕복 실패\n  " + JSON.stringify(r.a) + "\n  " + JSON.stringify(r.b));
  if (r.code.indexOf("page.mouse.wheel(0, 100)") < 0) throw new Error("원본이 사라짐");
});

t("따옴표·역슬래시가 든 문자열", () => {
  const r = roundtrip(`
test('t', async ({ page }) => {
  await page.getByTestId('a').fill("it's a \\\\ test");
});`);
  if (!eq(r.a, r.b)) throw new Error("왕복 실패\n  " + JSON.stringify(r.a) + "\n  " + JSON.stringify(r.b));
});

/* ───────── 생성기 단독 (파서가 만들지 않는 스텝) ───────── */
console.log("\n\x1b[1m생성기 단독\x1b[0m");

t("계정 변수는 값이 아니라 참조로 나온다", () => {
  const g = generateSpec({ id: "T", name: "n", steps: [
    { act: "입력", loc: "[data-testid=id]", val: "${계정 ID}" },
    { act: "입력", loc: "[data-testid=pw]", val: "${계정 비밀번호}" },
  ]});
  if (g.code.indexOf("ACCT.id") < 0 || g.code.indexOf("ACCT.pw") < 0) throw new Error("ACCT 참조가 없음");
  if (/계정 비밀번호/.test(g.code)) throw new Error("비밀번호 문자열이 코드에 남음");
});

t("저장 변수는 블록 밖에서 선언된다 (스코프)", () => {
  const g = generateSpec({ id: "T", name: "n", steps: [
    { act: "요청", loc: "POST /v1/orders", val: "-", save: "orderId = $.orderId" },
    { act: "이동", loc: "/orders/${orderId}", val: "-" },
  ]});
  const decl = g.code.indexOf("let orderId;");
  const open = g.code.indexOf("test(");
  if (decl < 0) throw new Error("let 선언이 없음");
  if (decl > open) throw new Error("test() 안에서 선언됨 — 다음 스텝이 못 본다");
  if (g.code.indexOf("`/orders/${orderId}`") < 0) throw new Error("템플릿 리터럴로 안 나옴");
});

t("코드 스텝은 test.step 으로 감싸지 않는다", () => {
  const g = generateSpec({ id: "T", name: "n", steps: [
    { act: "코드 스텝", loc: "", val: "", code: "const p1 = page.waitForEvent('popup');" },
    { act: "클릭", loc: "role=button[열기]", val: "-" },
  ]});
  const lines = g.code.split("\n");
  const i = lines.findIndex((l) => l.indexOf("waitForEvent") >= 0);
  if (i < 0) throw new Error("코드 스텝이 사라짐");
  if (lines[i - 1].indexOf("test.step") >= 0) throw new Error("코드 스텝이 감싸짐 — 변수 스코프가 깨진다");
  if (g.code.indexOf("await test.step('클릭") < 0) throw new Error("일반 스텝은 감싸야 한다");
});

t("API 스텝 — 요청·상태코드·본문 검증", () => {
  const g = generateSpec({ id: "T", name: "n", steps: [
    { act: "요청", loc: "POST /v1/orders", val: "-", body: '{ "a": 1 }' },
    { act: "응답 검증", loc: "상태코드", val: "200" },
    { act: "응답 검증", loc: "$.orderId", val: "존재" },
    { act: "응답 검증", loc: "$.total", val: "12000" },
  ]});
  for (const need of ["request.post('/v1/orders'", "expect(res.status()).toBe(200)",
                      "expect(body.orderId).toBeDefined()", "expect(String(body.total)).toBe('12000')"])
    if (g.code.indexOf(need) < 0) throw new Error("없음: " + need);
  if (g.code.indexOf("{ page, request }") < 0) throw new Error("request 픽스처가 없음");
});

t("모르는 스텝은 버리지 않고 주석으로 남긴다", () => {
  const g = generateSpec({ id: "T", name: "n", steps: [{ act: "두들기기", loc: "x", val: "-" }] });
  if (g.stats.skipped !== 1) throw new Error("skipped 가 1이 아님");
  if (g.code.indexOf("미지원 스텝: 두들기기") < 0) throw new Error("주석이 없음");
});

done();
