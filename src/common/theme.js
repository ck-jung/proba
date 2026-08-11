// ============================================================
// 공통 테마 — 색상 팔레트 · 점수/판정 색상 규칙
// LQA · FQA · NQA 전 도메인 공용 (단일 출처)
// ============================================================

// 차트·게이지 색상 팔레트
export const C = { ok: "#059669", err: "#dc2626", warn: "#d97706", teal: "#0ea5e9", blue: "#2563eb", grid: "#e2e8f0", axis: "#94a3b8" };
// CL 은 C 의 별칭 — 전면 라이트 전환 이후 둘이 같다 (기존 import 호환용)
export const CL = C;

// 판정(PASS/FAIL/WARN) → Badge kind
export const vKind = (v) => (v === "PASS" ? "pass" : v === "FAIL" ? "fail" : "warn");

// 점수(0~100) → 색상 규칙: ≥80 정상(teal) / ≥60 주의(warn) / <60 위험(err)
export const scoreColor = (v) => (v >= 80 ? C.teal : v >= 60 ? C.warn : C.err);

// 상태/속성 값 → Badge kind 매핑 (전 화면 단일 출처)
export const KIND = {
  priority:     { "높음": "fail", "중간": "warn", "낮음": "info" },
  caseStatus:   { "승인": "active", "검토중": "warn", "초안": "draft" },
  targetStatus: { "연결됨": "pass", "오류": "fail", "미확인": "warn" },
  channel:      { "REST API": "info", "Web 대화": "active", "Mobile 앱": "info" },
  trigger:      { "수동": "info", "스케줄": "active", "이벤트": "warn" },
  runStatus:    { "진행중": "warn", "완료": "pass", "오류": "fail" },
  severity:     { Critical: "crit", Major: "major", Minor: "minor" },
  issueStatus:  { Open: "fail", "In Progress": "warn", Resolved: "pass" },
  domain:       { LQA: "active", FQA: "info", PQA: "pass", NQA: "warn" },
  userStatus:   { "활성": "pass", "대기": "warn", "차단": "fail" },
  modelStatus:  { "활성": "pass", "비활성": "draft" },
  tenantStatus: { "활성": "pass", "정지": "fail" },
  plan:         { Enterprise: "active", Team: "info", Trial: "draft" },
};
