// ============================================================
// PQA(앱 성능 · 클라이언트 성능) — 데이터/시드. Android 우선 · iOS 확장 가능.
// nqa/data.js에서 분리(2026-07).
// ============================================================
import { LayoutDashboard, Plug, Code2, ClipboardList, Play, History, TrendingUp } from "lucide-react";

// 메뉴: 모니터링(대시보드) → 준비·설계 → 실행·분석 — 다른 QA 도메인과 동일
export const PQA_SECTIONS = [
  { group: "모니터링", items: [
    { id: "perf-dashboard", label: "대시보드", icon: LayoutDashboard },
  ] },
  { group: "준비 · 설계", items: [
    { id: "perf-targets", label: "대상 앱", icon: Plug },
    { id: "perf-scenarios", label: "측정 시나리오", icon: Code2 },
    { id: "perf-plan", label: "측정 계획", icon: ClipboardList },
  ] },
  { group: "실행 · 분석", items: [
    { id: "perf-run", label: "측정 실행", icon: Play },
    { id: "perf-history", label: "실행 이력", icon: History },
    { id: "perf-trend", label: "성능 추이", icon: TrendingUp },
  ] },
];
export const PERF_PLATFORMS = [{ id: "Android", label: "Android", ready: true }, { id: "iOS", label: "iOS", ready: false }];
/* 스토어(Play)는 뺐다 — 스토어에는 벤치마크 테스트 APK가 없어 Macrobenchmark를 실행할 수 없다.
   AP-002가 3경로를 적고 있으나 PQA에서는 2경로만 성립한다(요구사항 정정 대상). */
export const PERF_BUILD_SOURCES = ["CI 아티팩트", "직접 업로드"];
export const PERF_VARIANTS = ["release·profileable", "release", "benchmark", "debug(비권장)"];
// 측정 유형 — 모두 Jetpack Macrobenchmark로 실행. 시작(startup)은 여정 스텝이 없는 유형.
// Macrobenchmark 내장 지표 — SLA 게이트 기준 · agg=집계(퍼센타일/최댓값), dir=낮을수록 좋음(down)
// (CPU·네트워크·크래시/ANR은 스톡 Macrobenchmark 출력이 아니라 제외 — 크래시/ANR은 RUM/필드 영역)
export const PERF_METRICS = [
  { id: "e2e", label: "E2E 소요시간", agg: "P95", unit: "ms", dir: "down" },
  { id: "frame", label: "프레임 시간", agg: "P95", unit: "ms", dir: "down" },
  { id: "jank", label: "프레임 오버런", agg: "P95", unit: "ms", dir: "down" },
  { id: "mem", label: "메모리 RSS", agg: "Max", unit: "MB", dir: "down" },
  { id: "batt", label: "전력", agg: "평균", unit: "mW", dir: "down" },
];
// 사내 랩 단일 구성 — 티어별 실기기 풀(8대). 전력 계측(ODPM)은 Pixel 8 리그(power:true). slot=랙 위치.
/* 🔑 러너는 Pod가 아니라 '랩 호스트 PC'에 상주하는 에이전트다.
   단말이 USB로 붙어 있어 그 호스트에서만 실행할 수 있고, 랩은 대개 고객사 사내에 있어
   우리 K8s 클러스터에 노드로 편입할 수 없다. 연결도 반대 방향이다 —
   플랫폼이 러너를 부르는 게 아니라 러너가 아웃바운드로 접속해 잡을 받아간다.
   adb로 두 APK를 설치하고 am instrument로 실행하므로 호스트에 JDK·Gradle·앱 소스가 필요 없다. */
export const PERF_LAB = {
  id: "lab1", name: "사내 디바이스 랩", host: "qa-lab-01", os: "Ubuntu 22.04",
  agent: "exq-lab-agent 1.2.0", adb: "35.0.2", status: "온라인", lastSeen: "방금 전",
  maxParallel: 4,   // 호스트 부하가 측정값을 오염시키므로 동시 실행 상한을 둔다
  devices: 8,
};

/* status는 adb 인식 여부다 — 러너 에이전트가 하트비트에 실어 보낸다.
   점유 상태는 두지 않는다: 계획 단위 직렬 실행이라 같은 단말을 동시에 쓰는 일이 없다. */
export const PERF_DEVICES = [
  { id: "d1", model: "Galaxy S24", os: "Android 14", tier: "고사양", slot: "R1-01", status: "온라인", caps: { trace: true, fps: true, power: false } },
  { id: "d2", model: "Galaxy S24", os: "Android 14", tier: "고사양", slot: "R1-02", status: "온라인", caps: { trace: true, fps: true, power: false } },
  { id: "d3", model: "Galaxy A54", os: "Android 14", tier: "중사양", slot: "R1-03", status: "온라인", caps: { trace: true, fps: true, power: false } },
  { id: "d4", model: "Galaxy A54", os: "Android 14", tier: "중사양", slot: "R1-04", status: "연결 끊김", caps: { trace: true, fps: true, power: false } },
  { id: "d5", model: "Galaxy A15", os: "Android 14", tier: "저사양", slot: "R1-05", status: "온라인", caps: { trace: true, fps: true, power: false } },
  { id: "d6", model: "Galaxy A15", os: "Android 14", tier: "저사양", slot: "R1-06", status: "온라인", caps: { trace: true, fps: true, power: false } },
  { id: "d7", model: "Pixel 8", os: "Android 15", tier: "고사양", slot: "R1-07", status: "온라인", caps: { trace: true, fps: true, power: true } },
  { id: "d8", model: "Pixel 8", os: "Android 15", tier: "고사양", slot: "R1-08", status: "온라인", caps: { trace: true, fps: true, power: true } },
];
export const INIT_PERF_APPS = [
  { id: 1, name: "온마켓", platform: "Android", pkg: "com.onmarket.app", version: "9.12.0", versionCode: "91200", variant: "release·profileable", source: "CI 아티팩트", build: "onmarket-9.12.0-stg.apk", signed: true, artifactUrl: "https://ci.onmarket.io/artifacts/app/9.12.0/onmarket-9.12.0-stg.apk", benchApkUrl: "https://ci.onmarket.io/artifacts/app/9.12.0/macrobenchmark-9.12.0-stg.apk", benchApk: "macrobenchmark-9.12.0-stg.apk", tokenRef: "${ci_token}", buildFile: "", benchModule: ":benchmark", deploySecret: "whsec_9c1e4f2a8b3d7e6f" },
  /* 직접 업로드 — CI 파이프라인이 없는 앱. 앱 APK와 벤치마크 APK를 사람이 올린다.
     CI 아티팩트가 아니므로 배포 웹훅(배포 시 자동 실행)을 쓸 수 없다 — 수동·스케줄 실행만 가능하다. */
  { id: 3, name: "온마켓 파트너", platform: "Android", pkg: "com.onmarket.partner", version: "2.8.0", versionCode: "2080", variant: "release·profileable", source: "직접 업로드", build: "partner-2.8.0-release.apk", signed: true, artifactUrl: "", benchApkUrl: "", benchApk: "partner-macrobenchmark-2.8.0.apk", tokenRef: "", buildFile: "partner-2.8.0-release.apk", benchModule: ":benchmark", deploySecret: "" },
  { id: 2, name: "온마켓 셀러", platform: "Android", pkg: "com.onmarket.seller", version: "5.4.1", versionCode: "5041", variant: "release·profileable", source: "CI 아티팩트", build: "onmarket-seller-5.4.1-stg.apk", signed: true, artifactUrl: "https://ci.onmarket.io/artifacts/seller/5.4.1/onmarket-seller-5.4.1-stg.apk", benchApkUrl: "", benchApk: "", tokenRef: "${ci_token}", buildFile: "", benchModule: ":benchmark", deploySecret: "whsec_9c1e4f2a8b3d7e6f" },
];
export const INIT_PERF_SCENARIOS = [
  { id: 1, name: "앱 콜드 스타트", appId: 1, journey: "앱 시작(Startup)", desc: "홈 화면에서 앱을 완전히 종료한 뒤 콜드 스타트", metrics: ["e2e", "mem"], traceSection: "", status: "활성", startMode: "Cold", scriptModule: ":benchmark", scriptRef: "StartupBenchmark#coldStartup", iterations: 10 },
  { id: 2, name: "홈→상품목록 진입·스크롤", appId: 1, journey: "사용 흐름(Flow)", desc: "로그인 → 홈 진입 → 상품 탭 → 리스트 스크롤 10회", metrics: ["e2e", "frame", "jank", "mem", "batt"], traceSection: "home_scroll", status: "활성", startMode: "", scriptModule: ":benchmark", scriptRef: "HomeScrollBenchmark#scrollHome", iterations: 10 },
  { id: 3, name: "장바구니 담기 여정", appId: 1, journey: "사용 흐름(Flow)", desc: "상품 상세 진입 → 장바구니 담기 → 장바구니 뱃지 확인", metrics: ["e2e", "frame", "jank"], traceSection: "add_to_cart", status: "초안", startMode: "", scriptModule: ":benchmark", scriptRef: "CartBenchmark#addToCart", iterations: 10 },
  { id: 5, name: "파트너 앱 콜드 스타트", appId: 3, journey: "앱 시작(Startup)", desc: "홈에서 파트너 앱을 콜드 스타트", metrics: ["e2e", "mem"], traceSection: "", status: "활성", startMode: "Cold", scriptModule: ":benchmark", scriptRef: "PartnerStartupBenchmark#coldStartup", iterations: 10 },
  /* 미확정 — 등록만 하고 아직 측정한 적이 없다.
     플랫폼은 벤치마크 코드를 읽지 않으므로 무엇이 측정되는지 모른다. 첫 측정 결과에서 확정된다. */
  { id: 4, name: "결제 진입·완료", appId: 1, journey: "", desc: "장바구니 → 결제 화면 진입 → 결제 완료", metrics: [], traceSection: "", status: "활성", startMode: "", scriptModule: ":benchmark", scriptRef: "CheckoutBenchmark#addToCartAndCheckout", iterations: 0 },
];
export const INIT_PERF_PLANS = [
  { id: 1, name: "온마켓 릴리스 성능 게이트", appId: 1, scenarioIds: [1, 2], matrix: { deviceIds: ["d1", "d3", "d4", "d5"] }, budget: { "1": { e2e: 800, mem: 300 }, "2": { e2e: 2000, frame: 20, jank: 8, mem: 400 } }, schedule: { mode: "event", freq: "weekly", time: "09:00", dow: 1, dom: 1, cron: "0 9 * * 1", tz: "Asia/Seoul", active: true, ev: { deploy: true }, summary: "이벤트: 배포" }, status: "활성" },
  /* 직접 업로드 앱은 배포 웹훅이 없어 이벤트 트리거를 쓸 수 없다 — 수동 실행 */
  { id: 3, name: "파트너 앱 시작 성능", appId: 3, scenarioIds: [5], matrix: { deviceIds: ["d1", "d5"] }, budget: { "5": { e2e: 900, mem: 320 } }, schedule: { mode: "manual", freq: "weekly", time: "09:00", dow: 1, dom: 1, cron: "0 9 * * 1", tz: "Asia/Seoul", active: true, ev: {}, summary: "예약 없음" }, status: "활성" },
  { id: 2, name: "저사양 스크롤 성능", appId: 1, scenarioIds: [2, 4], matrix: { deviceIds: ["d5"] }, budget: { "2": { e2e: 2500, frame: 22, jank: 12 } }, schedule: { mode: "manual", freq: "weekly", time: "09:00", dow: 1, dom: 1, cron: "0 9 * * 1", tz: "Asia/Seoul", active: true, ev: {}, summary: "예약 없음" }, status: "초안" },
];

// 측정 실행 — 계획을 1회 돌린 실행 인스턴스(회차). 서브잡=시나리오×단말. 이력·추이가 파생.
// 성능 추이용으로 빌드별 시계열을 생성한다 — 빌드 5~6(9.11.2·9.12.0-rc1)에 회귀 유입, 6~7에서 개선. 저사양(d5)은 게이트 상시 초과.
const _PR_DEV = { d1: ["Galaxy S24", "R1-01"], d3: ["Galaxy A54", "R1-03"], d5: ["Galaxy A15", "R1-05"] };
const _PR_BUILDS = [
  ["9.10.0", "91000", "2026-06-16 08:05", "2026-06-16 08:14"],
  ["9.10.1", "91010", "2026-06-23 08:05", "2026-06-23 08:13"],
  ["9.11.0", "91100", "2026-06-30 08:05", "2026-06-30 08:15"],
  ["9.11.1", "91110", "2026-07-07 08:05", "2026-07-07 08:14"],
  ["9.11.2", "91120", "2026-07-10 08:05", "2026-07-10 08:15"],
  ["9.12.0-rc1", "91200", "2026-07-14 08:05", "2026-07-14 08:16"],
  ["9.12.0-rc2", "91201", "2026-07-18 08:05", "2026-07-18 08:15"],
  ["9.12.0", "91202", "2026-07-22 08:10", "2026-07-22 08:19"],
];
const _PR_F = {
  e2e:   [1.00, 1.00, 0.98, 0.99, 1.13, 1.14, 1.03, 1.02],
  frame: [1.00, 1.00, 0.99, 1.00, 1.08, 1.09, 1.02, 1.01],
  jank:  [1.00, 1.05, 0.95, 1.00, 1.30, 1.35, 1.06, 1.02],
  mem:   [1.00, 1.01, 1.02, 1.02, 1.03, 1.03, 1.02, 1.01],
};
const _PR_BASE = {
  1: { d1: { e2e: 600, mem: 270 }, d3: { e2e: 690, mem: 285 }, d5: { e2e: 745, mem: 288 } },
  2: { d1: { e2e: 1560, frame: 16.0, jank: 1.6, mem: 350 }, d3: { e2e: 1780, frame: 18.0, jank: 3.8, mem: 378 }, d5: { e2e: 1880, frame: 19.2, jank: 6.8, mem: 380 } },
  5: { d1: { e2e: 680, mem: 250 }, d5: { e2e: 880, mem: 268 } },
};
const _PR_SCN = { 1: ["앱 콜드 스타트", "앱 시작(Startup)"], 2: ["홈→상품목록 진입·스크롤", "사용 흐름(Flow)"], 5: ["파트너 앱 콜드 스타트", "앱 시작(Startup)"] };
const _PR_DIDC = { d1: 1, d3: 3, d5: 5 };
const _PR_ROUND = (mid, v) => (mid === "e2e" || mid === "mem") ? Math.round(v) : Math.round(v * 10) / 10;
/* 앱 3용 변동 — 2.8.0(인덱스 2)에서 시작 성능 악화 */
const _PR_F3 = { e2e: [1.00, 1.02, 1.36], mem: [1.00, 1.01, 1.06] };
const _PR_SUB = (bi, did, sid, budget, f) => {
  const base = _PR_BASE[sid][did]; const metrics = {}; let fail = false, gated = false;
  const wob = 1 + (((bi * 7 + _PR_DIDC[did]) % 5) - 2) * 0.006;
  Object.keys(base).forEach((mid) => {
    const tab = f || _PR_F; const v = _PR_ROUND(mid, base[mid] * (tab[mid] ? tab[mid][bi] : 1) * wob);
    metrics[mid] = v; const b = budget ? budget[mid] : undefined;
    if (b != null) { gated = true; if (v > b) fail = true; }
  });
  const [scn, journey] = _PR_SCN[sid];
  return { did, batt: 70 + ((bi * 11 + _PR_DIDC[did] * 7) % 25), temp: Math.round((29 + ((bi * 3 + _PR_DIDC[did]) % 6) * 0.7) * 10) / 10, model: _PR_DEV[did][0], slot: _PR_DEV[did][1], sid, scn, journey, iters: 10, iter: 10, status: fail ? "실패" : "완료", metrics, verdict: gated ? (fail ? "FAIL" : "PASS") : "—" };
};
/* 🔑 환경 고정은 우리가 판단하지 않는다 — Macrobenchmark의 판정을 받아 적는다.
   suppressErrors를 플랫폼이 빈 값으로 덮어쓴다: 앱 저장소 설정으로 LOW-BATTERY·DEBUGGABLE이
   억눌리면 저전력·디버그 빌드에서 잰 값이 조용히 정상 결과로 들어온다(F9와 같은 계열).
   lockClocks는 하지 않는다 — 루팅이 필요하고 Macrobenchmark에는 불필요하다(온도는 라이브러리가 자동 완화). */
export const PERF_ENV = { suppress: "", listener: "SideEffectRunListener", clocks: "미적용(Macrobenchmark 불필요)" };
const _PR_RUN = (idNum, planId, planName, bi, devs, sids, budgets, trig, appName, builds) => {
  const subs = []; devs.forEach((did) => sids.forEach((sid) => subs.push(_PR_SUB(bi, did, sid, budgets[sid], (builds ? _PR_F3 : null)))));
  const [ver, verCode, startedAt, endedAt] = (builds || _PR_BUILDS)[bi];
  const verdict = subs.some((s) => s.verdict === "FAIL") ? "불합격" : (subs.some((s) => s.verdict === "PASS") ? "합격" : "미판정");
  /* 판정(사람이 보는 것)과 게이트 결과(CI가 읽는 것)는 다른 축이다 — 미판정·기준선은 통과가 아니다 */
  const gateResult = verdict === "합격" ? "통과" : verdict === "불합격" ? "실패" : "판정 없음";
  return { id: "PRUN-" + idNum, planId, plan: planName, app: appName || "온마켓", ver, verCode, no: 0, status: "완료", verdict, gateResult, envLock: PERF_ENV, by: "이민준", trig, at: startedAt, startedAt, endedAt, queuedAt: idNum, devices: devs.length, scns: sids.length, power: false, subjobs: subs };
};
/* 앱 3(파트너) — 빌드 3개. 2.8.0에서 시작 성능이 악화됐다가 유지된다. */
const _PR_BUILDS3 = [
  ["2.7.0", "2070", "2026-06-25 10:05", "2026-06-25 10:09"],
  ["2.7.1", "2071", "2026-07-09 10:05", "2026-07-09 10:09"],
  ["2.8.0", "2080", "2026-07-23 10:05", "2026-07-23 10:10"],
];
const _P3_BUD = { 5: { e2e: 900, mem: 320 } };
const _P1_BUD = { 1: { e2e: 800, mem: 300 }, 2: { e2e: 2000, frame: 20, jank: 8, mem: 400 } };
const _P2_BUD = { 2: { e2e: 2500, frame: 22, jank: 12 } };
export const INIT_PERF_RUNS = (() => {
  const out = [];
  _PR_BUILDS.forEach((b, bi) => out.push(_PR_RUN(1101 + bi, 1, "온마켓 릴리스 성능 게이트", bi, ["d1", "d3", "d5"], [1, 2], _P1_BUD, bi === _PR_BUILDS.length - 1 ? "이벤트" : (bi % 3 === 0 ? "스케줄" : "이벤트"))));
  for (let bi = 2; bi < _PR_BUILDS.length; bi++) out.push(_PR_RUN(1201 + bi, 2, "저사양 스크롤 성능", bi, ["d5"], [2], _P2_BUD, bi % 2 === 0 ? "수동" : "스케줄"));
  // 직접 업로드 앱 — 배포 웹훅이 없어 트리거가 전부 수동이다
  _PR_BUILDS3.forEach((b, bi) => out.push(_PR_RUN(1301 + bi, 3, "파트너 앱 시작 성능", bi, ["d1", "d5"], [5], _P3_BUD, "수동", "온마켓 파트너", _PR_BUILDS3)));
  /* 🔑 환경 검사에 걸린 서브잡 하나 — 잰 적이 없는 것이지 불합격이 아니다.
     FAIL로 처리하면 회차가 불합격이 되고 P6 '마지막 합격' 기준선이 잘못 밀린다. */
  const errRun = out.find((r) => r.id === "PRUN-1103");
  if (errRun) {
    const t = (errRun.subjobs || []).find((x) => x.did === "d5" && x.sid === 2);
    if (t) { t.verdict = "ERROR"; t.errCode = "LOW-BATTERY"; t.status = "환경 오류"; t.metrics = {}; t.batt = 19; }
    errRun.verdict = errRun.subjobs.some((x) => x.verdict === "FAIL") ? "불합격" : (errRun.subjobs.some((x) => x.verdict === "PASS") ? "합격" : "미판정");
    errRun.gateResult = errRun.verdict === "합격" ? "통과" : errRun.verdict === "불합격" ? "실패" : "판정 없음";
  }
  const byPlan = {}; out.forEach((r) => { byPlan[r.planId] = (byPlan[r.planId] || 0) + 1; r.no = byPlan[r.planId]; });
  return out.sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
})();
