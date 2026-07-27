import { LayoutDashboard, Plug, Code2, ClipboardList, Play, History, TrendingUp } from "lucide-react";

/* 성능 QA · 메뉴 IA (앱 성능 주력 · 부하 별도) — FQA와 동일한 준비·설계 / 실행·분석 골격 */
export const NQA_SECTIONS = [
  { group: "모니터링", items: [
    { id: "nqa-dashboard", label: "대시보드", icon: LayoutDashboard },
  ] },
  { group: "준비 · 설계", items: [
    { id: "nqa-targets", label: "환경", icon: Plug },
    { id: "nqa-scenarios", label: "부하 테스트", icon: Code2 },
  ] },
  { group: "실행 · 분석", items: [
    { id: "nqa-run", label: "측정 실행", icon: Play },
    { id: "nqa-history", label: "실행 이력", icon: History },
  ] },
];

/* 성능 QA 하위 워크스페이스 — 앱 성능(랩 기반 클라이언트 성능)·부하(서버 부하). 필드(RUM)는 벤더 콘솔·전문 APM과 중복·저ROI로 제외. */
export const NQA_SUBTYPES = [
  { id: "perf", label: "앱 성능", ready: true },
  { id: "load", label: "부하", ready: true },
];

/* 부하(v1) — 서버 엔드포인트 자극(HTTP). 기능 QA와 완전 독립. */
export const NQA_PROTOCOLS = ["HTTP/HTTPS"];
export const NQA_LOAD_ENVS = ["개발", "스테이징"];
export const NQA_HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
export const NQA_AUTH_TYPES = ["Bearer 토큰", "API Key", "OAuth 2.0 (client credentials)", "없음"];
// (외부 Secrets 백엔드 제거 — 시크릿은 공통 "변수" 화면에서 관리·참조)
export const NQA_MAX_AGENTS = 10; // 테넌트 부하 생성 한도(쿼터) — 데모 상수. 실제는 테넌트/플랜별 admin 설정.

/* 측정 플랫폼 — 앱 우선(Android/iOS), Web은 고스트(준비중). FQA(웹 우선·앱 고스트)의 반전. */
export const NQA_PLATFORMS = [
  { id: "Web", label: "Web", ready: true },
  { id: "Android", label: "Android", ready: false },
  { id: "iOS", label: "iOS", ready: false },
];
export const NQA_PLAT_K = { Android: "pass", iOS: "info", Web: "active" };
export const NQA_TIERS = ["고사양", "중사양", "저사양"];
/* 측정 도구 — 방식(랩=온디맨드 프로파일링 / 필드=실사용자 집계 telemetry) 구분. */
export const NQA_TOOLS = {
  Android: [
    { name: "Perfetto", method: "랩" },
    { name: "Macrobenchmark", method: "랩" },
    { name: "dumpsys/simpleperf", method: "랩" },
    { name: "Android Vitals", method: "필드" },
    { name: "Firebase Performance", method: "필드" },
  ],
  iOS: [
    { name: "Instruments (xctrace)", method: "랩" },
    { name: "MetricKit", method: "필드" },
  ],
  Web: [
    { name: "Lighthouse", method: "랩" },
    { name: "CrUX / RUM", method: "필드" },
  ],
};
/* 도구별 수집 지표 — 대상 레벨 표기(정보). SLA·임계 선택은 측정 계획에서. */
export const NQA_TOOL_METRICS = {
  "Perfetto": ["기동시간", "메모리", "FPS/jank", "CPU", "전력"],
  "Macrobenchmark": ["기동시간", "FPS/jank"],
  "dumpsys/simpleperf": ["메모리", "CPU", "FPS/jank"],
  "Android Vitals": ["ANR", "충돌", "기동시간", "FPS/jank"],
  "Firebase Performance": ["기동시간", "네트워크", "커스텀 트레이스"],
  "Instruments (xctrace)": ["기동시간", "메모리", "CPU", "FPS", "전력"],
  "MetricKit": ["기동시간", "행(hang)", "메모리", "CPU", "배터리", "디스크"],
  "Lighthouse": ["LCP", "CLS", "TBT", "INP", "성능점수"],
  "CrUX / RUM": ["LCP", "CLS", "INP(필드)"],
};

/* 네트워크 — 실측(비결정적) vs 셰이핑(대역폭·지연·손실 프로파일, 재현 가능). */
export const NQA_NETWORKS = ["Wi-Fi (실측)", "5G (실측)", "LTE (실측)", "Fast 3G (셰이핑)", "Slow 3G (셰이핑)", "오프라인"];
export const NQA_STARTS = ["Cold", "Warm", "Hot"];
export const NQA_THERMAL_LEVELS = ["경고", "심각"];

/* 웹 성능(v1) — 브라우저·뷰포트 매트릭스 + Lighthouse 셰이핑 조건. */
export const NQA_BROWSERS = ["Chrome", "Edge", "Safari", "Firefox"];
export const NQA_VIEWPORTS = ["Desktop 1920×1080", "Desktop 1366×768", "Mobile 390×844 (에뮬)", "Tablet 820×1180"];
export const NQA_WEB_NET = ["No throttle", "Fast 4G (셰이핑)", "Slow 4G (셰이핑)", "Fast 3G (셰이핑)"];
export const NQA_CPU_THROTTLE = ["없음", "2x", "4x", "6x"];
export const NQA_CACHE = ["Cold (캐시 없음)", "Warm (캐시 사용)"];

/* 단말 제공자·가용상태·측정역량 — 향후 디바이스 팜 연동을 위한 골격(사양 vs 인스턴스 분리). */
export const NQA_PROVIDERS = ["사내", "BrowserStack", "AWS Device Farm", "Firebase Test Lab", "HeadSpin"];
export const NQA_DEV_STATUS = ["온라인", "점유중", "오프라인"];
export const NQA_DEV_ST_K = { "온라인": "pass", "점유중": "warn", "오프라인": "draft" };
export const NQA_CAP_LABELS = { trace: "트레이스", fps: "FPS", throttle: "스로틀", thermal: "발열" };
export const NQA_PROVIDER_CAPS = {
  "사내": { trace: true, fps: true, throttle: true, thermal: true },
  "BrowserStack": { trace: true, fps: true, throttle: true, thermal: false },
  "AWS Device Farm": { trace: true, fps: true, throttle: true, thermal: false },
  "Firebase Test Lab": { trace: true, fps: true, throttle: false, thermal: false },
  "HeadSpin": { trace: true, fps: true, throttle: true, thermal: false },
};

/* 측정 시나리오 — 사용자 흐름 + 측정 마커. 저작: 템플릿 / 기능 재사용 / 액션 조립. */
export const NQA_SCN_SOURCES = ["템플릿", "기능 재사용", "액션 조립"];
export const NQA_SCN_SRC_K = { "템플릿": "info", "기능 재사용": "active", "액션 조립": "warn" };
export const NQA_MARKERS = ["LCP", "CLS", "TBT", "INP", "성능점수", "네트워크 페이로드"];
export const NQA_SCN_TEMPLATES = [
  { name: "홈 페이지 로드 (LCP)", steps: [{ type: "flow", act: "페이지 이동", detail: "홈 URL" }, { type: "measure", metric: "LCP" }, { type: "measure", metric: "성능점수" }] },
  { name: "상품 페이지 진입", steps: [{ type: "flow", act: "페이지 이동", detail: "홈" }, { type: "flow", act: "클릭", detail: "상품 링크" }, { type: "measure", metric: "LCP" }, { type: "measure", metric: "CLS" }] },
  { name: "검색 상호작용 (INP)", steps: [{ type: "flow", act: "페이지 이동", detail: "검색" }, { type: "flow", act: "입력", detail: "질의어" }, { type: "measure", metric: "INP" }, { type: "measure", metric: "TBT" }] },
  { name: "리스트 스크롤 (CLS)", steps: [{ type: "flow", act: "페이지 이동", detail: "상품 리스트" }, { type: "flow", act: "스크롤", detail: "하단까지" }, { type: "measure", metric: "CLS" }] },
];
/* 부하 시나리오 — 대상(SUT) 선택 + 워크로드(비율 혼합/순차 진행) + 부하 형상. SLA 판정은 측정 계획. */
export const NQA_LOAD_UNITS = ["가상 사용자(VU)", "도착률(RPS)"];
export const NQA_LOAD_SHAPES = [
  { id: "스테디", label: "스테디", hint: "일정 부하 유지 — 기준 성능 확인" },
  { id: "램프업", label: "램프업", hint: "점진 증가 — 한계·변곡점 탐색" },
  { id: "스파이크", label: "스파이크", hint: "순간 급증 — 급변 대응·복구력" },
  { id: "스트레스", label: "스트레스(계단)", hint: "계단식 증가 — 포화점까지" },
  { id: "소크", label: "소크(내구)", hint: "장시간 유지 — 누수·성능 저하" },
];
/* 부하 시나리오 시드 — 대상(nqaSystems)과 sutId로 연결. 비율 혼합은 endpoints 가중치 사용, 순차 진행은 journey 순서 참조. 워크로드는 상관 유무로 자동 판정(forceOrder로 수동 순차). */
export const INIT_NQA_SCENARIOS = [
  { id: 1, name: "커머스 로그인 순차 부하", sutId: 1, unit: "가상 사용자(VU)", shape: "램프업", peak: 800, rampUp: 5, sustain: 20, rampDown: 3, thinkTime: 3, dataset: "accounts_10k", forceOrder: false, agents: 3, sla: { p95: 1500, p99: 2500, errRate: 1.0, minRps: 600 }, endpoints: [{ method: "GET", path: "/v1/products", weight: 50, headers: [], body: "", expect: 200, extracts: [] }, { method: "POST", path: "/v1/auth/login", weight: 30, headers: [{ k: "Content-Type", v: "application/json" }], body: '{ "phone": "${row.phone}", "pw": "${row.pw}" }', expect: 200, extracts: [{ var: "token", path: "$.data.token" }, { var: "userId", path: "$.data.userId" }] }, { method: "GET", path: "/v1/users/${userId}", weight: 20, headers: [{ k: "Authorization", v: "Bearer ${token}" }], body: "", expect: 200, extracts: [] }], journey: [{ method: "POST", path: "/v1/auth/login" }, { method: "GET", path: "/v1/users/${userId}" }, { method: "GET", path: "/v1/products" }] },
  { id: 2, name: "커머스 조회 혼합 부하", sutId: 1, unit: "도착률(RPS)", shape: "스테디", peak: 1500, maxVU: 2000, rampUp: 3, sustain: 15, rampDown: 2, thinkTime: 1, dataset: "", forceOrder: false, agents: 3, sla: { p95: 800, p99: 1500, errRate: 0.5, minRps: 1200 }, endpoints: [{ method: "GET", path: "/v1/products", weight: 60, headers: [], body: "", expect: 200, extracts: [] }, { method: "GET", path: "/v1/users/me", weight: 40, headers: [{ k: "Authorization", v: "Bearer ${shop_token}" }], body: "", expect: 200, extracts: [] }], journey: [] },
  { id: 3, name: "예약 오픈 스파이크", sutId: 2, unit: "가상 사용자(VU)", shape: "스파이크", peak: 400, baseline: 80, spikeHold: 30, rampUp: 1, sustain: 5, rampDown: 1, thinkTime: 2, dataset: "", forceOrder: false, agents: 2, sla: { p95: 1200, p99: 2000, errRate: 2.0, recoverySec: 60 }, endpoints: [{ method: "GET", path: "/v1/availability", weight: 70, headers: [], body: "", expect: 200, extracts: [] }, { method: "POST", path: "/v1/reservations", weight: 30, headers: [{ k: "Content-Type", v: "application/json" }, { k: "Authorization", v: "Bearer ${booking_token}" }], body: '{ "slotId": "S-1001", "seats": 2 }', expect: 201, extracts: [] }], journey: [] },
  { id: 4, name: "커머스 용량 한계 측정", sutId: 1, unit: "도착률(RPS)", shape: "스트레스", peak: 3500, start: 500, step: 500, steps: 6, stepHold: 3, maxVU: 3000, thinkTime: 1, dataset: "", forceOrder: false, agents: 3, sla: { p95: 1500, p99: 2500, errRate: 2.0, capacity: 2100 }, endpoints: [{ method: "GET", path: "/v1/products", weight: 70, headers: [], body: "", expect: 200, extracts: [] }, { method: "GET", path: "/v1/users/me", weight: 30, headers: [{ k: "Authorization", v: "Bearer ${shop_token}" }], body: "", expect: 200, extracts: [] }], journey: [] },
  { id: 5, name: "예약 내구 부하(소크)", sutId: 2, unit: "가상 사용자(VU)", shape: "소크", peak: 200, soakH: 4, rampUp: 2, sustain: 10, rampDown: 2, thinkTime: 3, dataset: "", forceOrder: false, agents: 2, sla: { p95: 1000, p99: 1800, errRate: 0.5, driftPct: 10 }, endpoints: [{ method: "GET", path: "/v1/availability", weight: 60, headers: [], body: "", expect: 200, extracts: [] }, { method: "GET", path: "/v1/reservations", weight: 40, headers: [{ k: "Authorization", v: "Bearer ${booking_token}" }], body: "", expect: 200, extracts: [] }], journey: [] },
];

/* 측정 계획 — 측정 시나리오 참조 + SLA 판정 임계(합격/불합격). 대상(SUT)은 시나리오에서 파생. 실행 시점(즉시/예약)은 측정 실행에서, 회귀(baseline)는 성능 추이에서 판단. 판정은 워밍업(초기 램프업)을 제외하고 목표 부하 도달 이후 구간에서 집계(고정). */
export const INIT_NQA_PLANS = [
  { id: 1, name: "로그인 순차 부하 · 용량 점검", scenarioId: 1, status: "활성", sla: { p95: 1500, p99: 2500, errRate: 1.0, minRps: 600 } },
  { id: 2, name: "조회 혼합 기준 성능", scenarioId: 2, status: "초안", sla: { p95: 800, p99: 1500, errRate: 0.5, minRps: 1200 } },
];

/* 측정 실행 — 계획을 1회 돌린 실행 인스턴스(회차) + 결과 + SLA 판정. 이력·추이가 파생. */
export const INIT_NQA_RUNS = [
  { id: "RUN-0715-21", planId: 2, no: 2, startedAt: "2026-07-15 22:00", endedAt: "2026-07-15 22:15", durationSec: 900, status: "완료", by: "이민준", result: { rps: 1460, errRate: 0.3, p50: 135, p95: 780, p99: 1210, throughput: 1455, totalReq: 1314000, verdict: "합격", breaches: [] } },
  { id: "RUN-0714-03", planId: 1, no: 3, startedAt: "2026-07-14 02:10", endedAt: "2026-07-14 02:38", durationSec: 1680, status: "완료", by: "야간 배치", result: { rps: 650, errRate: 0.6, p50: 250, p95: 1410, p99: 2160, throughput: 648, totalReq: 1092000, verdict: "합격", breaches: [] } },
  { id: "RUN-0712-11", planId: 4, no: 1, startedAt: "2026-07-12 03:00", endedAt: "2026-07-12 03:18", durationSec: 1080, status: "완료", by: "노경원", result: { rps: 2600, errRate: 1.1, p50: 420, p95: 1380, p99: 2150, throughput: 2580, totalReq: 2808000, verdict: "합격", breaches: [] } },
  { id: "RUN-0710-07", planId: 3, no: 1, startedAt: "2026-07-10 14:30", endedAt: "2026-07-10 14:37", durationSec: 420, status: "완료", by: "이벤트(배포)", result: { rps: 350, errRate: 3.2, p50: 380, p95: 1450, p99: 2400, throughput: 344, totalReq: 147000, verdict: "불합격", breaches: ["p95 1450 > 1200ms", "에러율 3.2 > 2.0%"] } },
  { id: "RUN-0708-15", planId: 5, no: 1, startedAt: "2026-07-08 22:00", endedAt: "2026-07-09 02:00", durationSec: 14400, status: "완료", by: "야간 배치", result: { rps: 160, errRate: 0.3, p50: 210, p95: 920, p99: 1650, throughput: 159, totalReq: 2304000, verdict: "합격", breaches: [] } },
  { id: "RUN-0707-02", planId: 1, no: 2, startedAt: "2026-07-07 02:10", endedAt: "2026-07-07 02:38", durationSec: 1680, status: "완료", by: "야간 배치", result: { rps: 610, errRate: 1.4, p50: 320, p95: 1720, p99: 2680, throughput: 604, totalReq: 1024800, verdict: "불합격", breaches: ["p95 1720 > 1500ms", "에러율 1.4 > 1.0%"] } },
  { id: "RUN-0705-01", planId: 2, no: 1, startedAt: "2026-07-05 22:00", endedAt: "2026-07-05 22:15", durationSec: 900, status: "완료", by: "이민준", result: { rps: 1480, errRate: 0.2, p50: 120, p95: 720, p99: 1120, throughput: 1476, totalReq: 1332000, verdict: "합격", breaches: [] } },
  { id: "RUN-0630-01", planId: 1, no: 1, startedAt: "2026-06-30 02:10", endedAt: "2026-06-30 02:38", durationSec: 1680, status: "완료", by: "야간 배치", result: { rps: 660, errRate: 0.5, p50: 240, p95: 1340, p99: 2050, throughput: 658, totalReq: 1108800, verdict: "합격", breaches: [] } },
];

/* 측정 대상(앱) 시드 — 앱 + 단말 인벤토리 + 측정 도구 + 측정 조건. 단말×조건 조합은 측정 계획에서. */
export const INIT_NQA_SYSTEMS = [
  { id: 1, name: "커머스 API 부하", subtype: "load", baseUrl: "https://api-stg.shop.example.com", protocol: "HTTP/HTTPS", loadgen: { tool: "k6", agents: 3 }, auth: { type: "없음" } },
  { id: 2, name: "예약 API 부하", subtype: "load", baseUrl: "https://api-stg.booking.example.com", protocol: "HTTP/HTTPS", loadgen: { tool: "k6", agents: 2 }, auth: { type: "없음" } },
];
