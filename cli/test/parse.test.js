"use strict";
/* ═══════════════════════════════════════════════════════════════════
   파서 회귀 테스트

   Playwright 버전을 올릴 때 codegen 출력 포맷이 바뀌면 파서가 조용히 깨진다.
   그 사고를 막는 유일한 방법이 이 테스트다.

     1) fixtures/*.spec.ts  : 실제 codegen 이 뱉는 코드 (버전 올릴 때 새로 떠서 갱신)
     2) 기대 스텝            : 그 코드가 어떤 스텝이 되어야 하는가
     3) npm test            : 어긋나면 실패

   버전을 올리는 절차
     · playwright 버전 변경 → 아래 fixture 를 실제 codegen 으로 다시 뜬다
     · npm test 통과 확인 → 통과하면 안전, 실패하면 파서를 고친다
   ═══════════════════════════════════════════════════════════════════ */
const assert = require("assert");
const { parseSpec, toDsl } = require("../src/parse.js");

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); pass++; console.log("  \x1b[32m✓\x1b[0m " + name); }
  catch (e) { fail++; console.log("  \x1b[31m✗\x1b[0m " + name + "\n    " + e.message); }
};

/* ───────── 로케이터 DSL 변환 ───────── */
console.log("\n로케이터 → DSL");
t("getByRole + name", () => assert.equal(toDsl("getByRole('button', { name: '로그인' })"), "role=button[로그인]"));
t("getByRole (name 없음)", () => assert.equal(toDsl("getByRole('checkbox')"), "role=checkbox"));
t("getByRole + exact", () => assert.equal(toDsl("getByRole('link', { name: '요금제', exact: true })"), "role=link[요금제]"));
t("getByTestId", () => assert.equal(toDsl("getByTestId('username')"), "[data-testid=username]"));
t("getByPlaceholder", () => assert.equal(toDsl("getByPlaceholder('검색어')"), "placeholder=검색어"));
t("getByLabel", () => assert.equal(toDsl("getByLabel('비밀번호')"), "label=비밀번호"));
t("locator(css)", () => assert.equal(toDsl("locator('#btn_subscribe')"), "#btn_subscribe"));
t("체인은 표현 불가 → null", () => assert.equal(toDsl("getByRole('button').first()"), null));
t("frameLocator 는 표현 불가 → null", () => assert.equal(toDsl("frameLocator('iframe').getByRole('button')"), null));

/* ───────── codegen 출력 → 스텝 ───────── */
const BASE = "https://stg.tworld.co.kr";
const SPEC = `import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://stg.tworld.co.kr/login');
  await page.getByTestId('username').fill('qa_user01');
  await page.getByTestId('password').fill('P@ssw0rd!');
  await page.getByRole('checkbox', { name: '자동 로그인' }).check();
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByText('환영합니다')).toBeVisible();
  await page.getByRole('combobox').selectOption('premium');
  await page.getByPlaceholder('검색어').press('Enter');
  await expect(page.getByTestId('cart-count')).toContainText('1');
  await expect(page.getByTestId('coupon')).toBeHidden();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: '이용약관' }).click();
  const page1 = await page1Promise;
});`;

const ACCTS = [{ acct: "qa_user01" }, { acct: "qa_vip01" }];
const { steps, stats } = parseSpec(SPEC, BASE, ACCTS);
const at = (i) => steps[i] || {};

console.log("\ncodegen 출력 → 스텝");
t("goto → 이동 (상대경로)", () => assert.deepEqual(at(0), { act: "이동", loc: "/login", val: "-" }));
t("fill → 입력 · 계정 ID 치환", () => assert.deepEqual(at(1), { act: "입력", loc: "[data-testid=username]", val: "${계정 ID}" }));
t("🔒 비밀번호는 평문이 남지 않는다", () => {
  assert.deepEqual(at(2), { act: "입력", loc: "[data-testid=password]", val: "${계정 비밀번호}" });
  assert.ok(!JSON.stringify(steps).includes("P@ssw0rd"), "평문 비밀번호가 스텝에 남아 있습니다");
});
t("check → 체크", () => assert.deepEqual(at(3), { act: "체크", loc: "role=checkbox[자동 로그인]", val: "체크" }));
t("click → 클릭", () => assert.deepEqual(at(4), { act: "클릭", loc: "role=button[로그인]", val: "-" }));
t("toBeVisible → 화면 검증", () => assert.deepEqual(at(5), { act: "화면 검증", loc: "text=환영합니다", val: "visible = true" }));
t("selectOption → 선택", () => assert.deepEqual(at(6), { act: "선택", loc: "role=combobox", val: '"premium"' }));
t("press → 키 누르기", () => assert.deepEqual(at(7), { act: "키 누르기", loc: "placeholder=검색어", val: "Enter" }));
t("toContainText → 화면 검증(text)", () => assert.deepEqual(at(8), { act: "화면 검증", loc: "[data-testid=cart-count]", val: 'text = "1"' }));
t("toBeHidden → visible = false", () => assert.deepEqual(at(9), { act: "화면 검증", loc: "[data-testid=coupon]", val: "visible = false" }));

console.log("\n손실 없음 (변환 못 한 것은 코드 스텝으로 보존)");
t("팝업 처리는 코드 스텝으로 원본 보존", () => {
  const code = steps.filter((s) => s.act === "코드 스텝").map((s) => s.code).join("\n");
  assert.ok(code.includes("waitForEvent('popup')"), "waitForEvent 가 보존되지 않았습니다");
  assert.ok(code.includes("const page1 = await page1Promise"), "page1 대입이 보존되지 않았습니다");
});
t("모든 문장이 스텝 또는 코드 스텝에 담긴다", () => {
  assert.equal(stats.mapped + stats.unmapped, stats.statements);
});
t("커버리지 80% 이상", () => assert.ok(stats.coverage >= 80, "커버리지 " + stats.coverage + "%"));

/* ───────── 비밀번호 치환 (코드 스텝 포함) ───────── */
t("코드 스텝 안의 비밀번호도 치환된다 — 팝업 로그인", () => {
  const r = parseSpec(`
test('t', async ({ page }) => {
  const p1 = page.waitForEvent('popup');
  const page1 = await p1;
  await page1.getByRole('textbox', { name: '아이디' }).fill('myid');
  await page1.getByRole('textbox', { name: '비밀번호' }).fill('SuperSecret@123');
});`, "", []);
  const blob = JSON.stringify(r);
  if (/SuperSecret/.test(blob)) throw new Error("평문 비밀번호가 남았다");
  if (!/myid/.test(blob)) throw new Error("정상 입력값까지 날아갔다");
  if (r.stats.redacted !== 1) throw new Error("redacted 가 1이 아님: " + r.stats.redacted);
});

t("stats.unknown 에도 원문이 남지 않는다 (화면에 찍힌다)", () => {
  const r = parseSpec(`
test('t', async ({ page }) => {
  const page1 = await p1;
  await page1.getByLabel('password').fill('pw-in-unknown');
});`, "", []);
  if (/pw-in-unknown/.test(JSON.stringify(r.stats.unknown))) throw new Error("unknown 에 원문이 남았다");
});

t("힌트가 없으면 손대지 않는다 — 값으로 추측하지 않는다", () => {
  const r = parseSpec(`
test('t', async ({ page }) => {
  const page1 = await p1;
  await page1.getByLabel('메모').fill('Abcd1234!');
});`, "", []);
  if (!/Abcd1234!/.test(JSON.stringify(r))) throw new Error("정상 입력을 날렸다");
  if (r.stats.redacted !== 0) throw new Error("헛치환");
});

console.log(`\n${fail ? "\x1b[31m" : "\x1b[32m"}${pass} passed, ${fail} failed\x1b[0m  (커버리지 ${stats.coverage}%)\n`);
process.exit(fail ? 1 : 0);
