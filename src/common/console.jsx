// ============================================================
// 관리자 콘솔 (서비스 관리자 · 전체 조직 횡단)
// 도메인 무관 플랫폼 영역 — App.jsx에서 분리(2026-07-01).
// 구성: 조직/사용자/AI모델/사용량·과금/감사로그 + ConsoleShell.
// ============================================================
import { useState } from "react";
import { ArrowLeft, Building2, Cpu, CreditCard, Plus, ScrollText, Search, Shield, UserCog, Users } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useApp } from "./context.js";
import { C, KIND } from "./theme.js";
import { Badge, Card, Btn, Field, Input, Select, PageToolbar, EmptyState, SearchInput } from "./ui.jsx";

// 도메인별 사용량 (월별) — LQA(평가·토큰), FQA(기능 실행·러너 시간), NQA(측정 실행·부하생성기 워커 시간)
// 조직 생성 시점 반영: t3(데모 조직)은 2026-05 신규 → 04월엔 데이터 없음.
const USAGE_BY_MONTH = {
  "2026-06": [
    { tenant: "t1", lqaEvals: 142, lqaTokensM: 12.4, fqaRuns: 86, fqaRunnerHrs: 31, nqaRuns: 14, nqaWorkerHrs: 38, cost: 1980000 },
    { tenant: "t2", lqaEvals: 38, lqaTokensM: 2.8, fqaRuns: 22, fqaRunnerHrs: 8, nqaRuns: 3, nqaWorkerHrs: 6, cost: 462000 },
    { tenant: "t3", lqaEvals: 6, lqaTokensM: 0.3, fqaRuns: 4, fqaRunnerHrs: 1, nqaRuns: 0, nqaWorkerHrs: 0, cost: 21000 },
  ],
  "2026-05": [
    { tenant: "t1", lqaEvals: 118, lqaTokensM: 10.1, fqaRuns: 71, fqaRunnerHrs: 25, nqaRuns: 11, nqaWorkerHrs: 29, cost: 1610000 },
    { tenant: "t2", lqaEvals: 30, lqaTokensM: 2.1, fqaRuns: 18, fqaRunnerHrs: 6, nqaRuns: 2, nqaWorkerHrs: 4, cost: 372000 },
    { tenant: "t3", lqaEvals: 3, lqaTokensM: 0.15, fqaRuns: 2, fqaRunnerHrs: 1, nqaRuns: 0, nqaWorkerHrs: 0, cost: 9000 },
  ],
  "2026-04": [
    { tenant: "t1", lqaEvals: 95, lqaTokensM: 8.3, fqaRuns: 60, fqaRunnerHrs: 21, nqaRuns: 9, nqaWorkerHrs: 23, cost: 1290000 },
    { tenant: "t2", lqaEvals: 24, lqaTokensM: 1.7, fqaRuns: 14, fqaRunnerHrs: 5, nqaRuns: 1, nqaWorkerHrs: 2, cost: 291000 },
  ],
};
const USAGE_MONTHS = ["2026-06", "2026-05", "2026-04"];

const INIT_AUDIT = [
  { t: "2026-06-11 21:04", actor: "이민준", tenant: "t1", action: "부하 측정 실행", target: "로그인 순차 부하 · 용량 점검 (RUN-0611)" },
  { t: "2026-06-11 21:12", actor: "system", tenant: "t1", action: "결함 등록", target: "DEF-2001 (SLA p95 초과)" },
  { t: "2026-06-11 14:36", actor: "이민준", tenant: "t1", action: "평가 실행", target: "요금/청구 평가 (48 TC)" },
  { t: "2026-06-11 14:36", actor: "system", tenant: "t1", action: "결함 등록", target: "DEF-1842 (PII)" },
  { t: "2026-06-11 11:20", actor: "김지훈", tenant: "t1", action: "권한 변경", target: "QA엔지니어 · 챗봇연결 조회→허용" },
  { t: "2026-06-10 17:02", actor: "한도윤", tenant: "-", action: "모델 등록", target: "Gemini 2.0 Flash" },
  { t: "2026-06-10 15:48", actor: "최서연", tenant: "t1", action: "기능 실행", target: "회원가입 스위트 (32 TC)" },
  { t: "2026-06-10 09:15", actor: "한도윤", tenant: "t3", action: "조직 정지", target: "데모 조직" },
  { t: "2026-06-09 16:40", actor: "박지영", tenant: "t2", action: "멤버 초대", target: "newuser@onmarket.io" },
  { t: "2026-06-09 13:30", actor: "이민준", tenant: "t1", action: "측정 시나리오 생성", target: "커머스 조회 혼합 부하" },
  { t: "2026-06-09 10:05", actor: "최서연", tenant: "t1", action: "평가 계획 생성", target: "주문/멤버십 안내" },
  { t: "2026-06-08 18:22", actor: "한도윤", tenant: "-", action: "계정 정지", target: "오현태 (demo.com)" },
];

function UsersConsole() {
  const { users, tenants, currentUser, openModal, setUserStatus, removeUser, toast } = useApp();
  const [scope, setScope] = useState("all");   // all | platform | <tenantId>
  const [q, setQ] = useState("");
  const tName = (id) => (tenants.find((t) => t.id === id) || {}).name || id;
  const stK = KIND.userStatus;
  const isPlat = (u) => u.tenant === "platform";
  const scopeName = (u) => (isPlat(u) ? "플랫폼(본사)" : tName(u.tenant));
  const opAdmins = users.filter((u) => isPlat(u) && u.status !== "차단").length;   // 활성 서비스 관리자 수
  const isMe = (u) => currentUser && u.name === currentUser;
  const lastAdmin = (u) => isPlat(u) && u.status !== "차단" && opAdmins <= 1;
  const stat = [["전체 사용자", users.length, "text-slate-900"], ["활성", users.filter((u) => u.status === "활성").length, "text-emerald-600"], ["승인 대기", users.filter((u) => u.status === "대기").length, "text-amber-600"], ["서비스 관리자", users.filter(isPlat).length, "text-amber-600"]];
  const inScope = (u) => scope === "all" || (scope === "platform" ? isPlat(u) : u.tenant === scope);
  const ql = q.trim().toLowerCase();
  const rows = users.filter((u) => inScope(u) && (!ql || (u.name + " " + u.email + " " + scopeName(u) + " " + u.role).toLowerCase().includes(ql)));
  const scopeOpts = [["all", "전체"], ["platform", "플랫폼(본사)"], ...tenants.map((t) => [t.id, t.name])];
  const btnA = "text-xs rounded-lg px-2 py-1 bg-emerald-600 hover:bg-emerald-600 text-white";
  const btnN = "text-xs rounded-lg px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700";
  const btnD = "text-xs rounded-lg px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-red-600";
  const stopOp = (u) => { if (isMe(u)) { toast("본인 계정은 정지할 수 없습니다", "warn"); return; } if (lastAdmin(u)) { toast("마지막 서비스 관리자는 정지할 수 없습니다", "warn"); return; } setUserStatus(u.id, "차단"); toast(u.name + " 정지", "warn"); };
  const delOp = (u) => { if (isMe(u)) { toast("본인 계정은 삭제할 수 없습니다", "warn"); return; } if (lastAdmin(u)) { toast("마지막 서비스 관리자는 삭제할 수 없습니다", "warn"); return; } if (!window.confirm(u.name + " 서비스 관리자를 삭제할까요?")) return; removeUser(u.id); toast(u.name + " 삭제됨", "warn"); };
  const actions = (u) => isPlat(u)
    ? (u.status === "대기"
        ? <div className="flex gap-1.5"><button onClick={() => { setUserStatus(u.id, "활성"); toast(u.name + " 활성화", "ok"); }} className={btnA}>승인</button><button onClick={() => { removeUser(u.id); toast(u.name + " 초대 취소", "warn"); }} className={btnN}>취소</button></div>
        : isMe(u) ? <span className="text-xs text-slate-400">—</span>
        : <div className="flex gap-1.5">{u.status === "차단" ? <button onClick={() => { setUserStatus(u.id, "활성"); toast(u.name + " 활성화", "ok"); }} className={btnN}>해제</button> : <button onClick={() => stopOp(u)} className={btnD}>정지</button>}<button onClick={() => delOp(u)} className={btnD}>삭제</button></div>)
    : (u.status === "대기"
        ? <div className="flex gap-1.5"><button onClick={() => { setUserStatus(u.id, "활성"); toast(u.name + " 사용 승인", "ok"); }} className={btnA}>승인</button><button onClick={() => { if (!window.confirm(u.name + " (" + tName(u.tenant) + ") 가입을 거부하고 계정을 삭제할까요?\n되돌릴 수 없습니다. 멤버 승인/거부는 원칙적으로 조직 관리자의 업무입니다.")) return; removeUser(u.id); toast(u.name + " 가입 거부", "warn"); }} className={btnD}>거부</button></div>
        : u.status === "차단" ? <button onClick={() => { setUserStatus(u.id, "활성"); toast(u.name + " 차단 해제", "ok"); }} className={btnN}>차단 해제</button>
        : <button onClick={() => { if (!window.confirm(u.name + " (" + tName(u.tenant) + ") 계정을 정지할까요?\n해당 사용자의 로그인이 즉시 차단되며 감사 로그에 기록됩니다.")) return; setUserStatus(u.id, "차단"); toast(u.name + " 계정 정지", "warn"); }} className={btnD}>정지</button>);
  return (
    <div className="space-y-4">
      <PageToolbar desc="전체 조직 + 플랫폼 사용자 통합 디렉터리 · 모든 처리는 감사 로그에 기록">
        <Btn kind="primary" icon={Plus} onClick={() => openModal("newOperator")}>서비스 관리자 추가</Btn>
      </PageToolbar>
      <div className="grid grid-cols-4 gap-3">
        {stat.map((x) => (<Card key={x[0]} className="p-3 text-center"><div className={"text-2xl font-bold " + x[2]}>{x[1]}</div><div className="text-xs text-slate-500 mt-0.5">{x[0]}</div></Card>))}
      </div>
      <Card>
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <div style={{ width: 200 }}><Select value={scope} onChange={(e) => setScope(e.target.value)}>{scopeOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 이메일 · 소속 검색" className="flex-1" />
          <span className="text-xs text-slate-500 whitespace-nowrap">{rows.length}명</span>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-500 text-left border-b border-slate-200"><th className="py-2.5 px-4 font-medium">사용자</th><th className="font-medium">소속</th><th className="font-medium">역할</th><th className="font-medium">상태</th><th className="font-medium">최근 로그인</th><th className="font-medium">처리</th></tr></thead>
          <tbody className="text-slate-700">
            {rows.length === 0 && <tr><td colSpan={6}><EmptyState icon={Users} title="해당하는 사용자가 없습니다" /></td></tr>}
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-slate-200 hover:bg-slate-100">
                <td className="py-3 px-4"><div className="text-slate-900 font-medium">{u.name}{isMe(u) && <span className="ml-1 text-xs text-slate-400">(본인)</span>}</div><div className="text-xs text-slate-500">{u.email}</div></td>
                <td>{isPlat(u) ? <Badge kind="warn">플랫폼(본사)</Badge> : <span className="text-slate-700">{tName(u.tenant)}</span>}</td>
                <td className="text-slate-500">{u.role}</td>
                <td><Badge kind={stK[u.status]}>{u.status}</Badge></td>
                <td className="text-slate-500 text-xs">{u.last}</td>
                <td className="pr-4">{actions(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function NewOperatorForm({ close }) {
  const { addUser, toast } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const submit = () => {
    if (!name.trim()) { toast("이름을 입력하세요", "warn"); return; }
    if (!email.trim() || !email.includes("@")) { toast("올바른 이메일을 입력하세요", "warn"); return; }
    addUser({ id: "op" + Date.now(), name: name.trim(), email: email.trim(), tenant: "platform", role: "서비스 관리자", status: "대기", last: "미로그인" });
    toast(name.trim() + " 서비스 관리자 초대됨 (대기)", "ok"); close();
  };
  return (
    <div className="space-y-4">
      <Field label="이름"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" /></Field>
      <Field label="사내 이메일"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="예: ops@autoqa.io" /></Field>
      <div className="flex justify-end gap-2 pt-1"><Btn onClick={close}>취소</Btn><Btn kind="primary" icon={Plus} onClick={submit}>추가</Btn></div>
    </div>
  );
}

function UsageConsole() {
  const { tenants } = useApp();
  const [month, setMonth] = useState(USAGE_MONTHS[0]);
  const usage = USAGE_BY_MONTH[month] || [];
  const tName = (id) => (tenants.find((t) => t.id === id) || {}).name || id;
  const total = usage.reduce((a, u) => ({ lqaEvals: a.lqaEvals + u.lqaEvals, lqaTokensM: a.lqaTokensM + u.lqaTokensM, fqaRuns: a.fqaRuns + u.fqaRuns, fqaRunnerHrs: a.fqaRunnerHrs + u.fqaRunnerHrs, nqaRuns: a.nqaRuns + u.nqaRuns, nqaWorkerHrs: a.nqaWorkerHrs + u.nqaWorkerHrs, cost: a.cost + u.cost }), { lqaEvals: 0, lqaTokensM: 0, fqaRuns: 0, fqaRunnerHrs: 0, nqaRuns: 0, nqaWorkerHrs: 0, cost: 0 });
  const won = (n) => "₩" + n.toLocaleString();
  const chartData = usage.map((u) => ({ name: tName(u.tenant), cost: Math.round(u.cost / 10000) }));
  const stat = [["LQA 평가", total.lqaEvals.toLocaleString(), "text-slate-900"], ["FQA 기능 실행", total.fqaRuns.toLocaleString(), "text-slate-900"], ["NQA 측정 실행", total.nqaRuns.toLocaleString(), "text-slate-900"], ["총 비용", won(total.cost), "text-sky-600"]];
  return (
    <div className="space-y-4">
      <PageToolbar desc="조직별 도메인 사용량·과금액 집계 (월별) · LQA 평가/토큰 · FQA 기능 실행 · NQA 측정 실행/워커 시간">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 text-xs">{USAGE_MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
      </PageToolbar>
      <div className="grid grid-cols-4 gap-3">{stat.map((x) => (<Card key={x[0]} className="p-4"><div className="text-xs text-slate-500">{x[0]}</div><div className={"mt-1 text-2xl font-bold " + x[2]}>{x[1]}</div></Card>))}</div>
      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-800 mb-3">조직별 비용 (만원)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}><CartesianGrid stroke={C.grid} vertical={false} /><XAxis dataKey="name" stroke={C.axis} fontSize={11} /><YAxis stroke={C.axis} fontSize={11} /><Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8 }} /><Bar dataKey="cost" name="비용(만원)" fill="#bae6fd" radius={[3, 3, 0, 0]} barSize={22} /></BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-500 text-left border-b border-slate-200"><th className="py-2.5 px-4 font-medium">조직</th><th className="font-medium">LQA 평가</th><th className="font-medium">LQA 토큰</th><th className="font-medium">FQA 실행</th><th className="font-medium">FQA 러너(h)</th><th className="font-medium">NQA 측정</th><th className="font-medium">NQA 워커(h)</th><th className="font-medium text-right">과금액</th></tr></thead>
          <tbody className="text-slate-700">
            {usage.map((u) => (
              <tr key={u.tenant} className="border-b border-slate-200 hover:bg-slate-100">
                <td className="py-3 px-4 font-medium text-slate-900">{tName(u.tenant)}</td>
                <td>{u.lqaEvals.toLocaleString()}</td>
                <td>{u.lqaTokensM.toFixed(1)}M</td>
                <td>{u.fqaRuns.toLocaleString()}</td>
                <td>{u.fqaRunnerHrs.toLocaleString()}</td>
                <td>{u.nqaRuns.toLocaleString()}</td>
                <td>{u.nqaWorkerHrs.toLocaleString()}</td>
                <td className="text-right font-semibold text-slate-900">{won(u.cost)}</td>
              </tr>
            ))}
            <tr className="bg-slate-100"><td className="py-2.5 px-4 font-bold text-slate-900">합계</td><td className="font-semibold">{total.lqaEvals.toLocaleString()}</td><td className="font-semibold">{total.lqaTokensM.toFixed(1)}M</td><td className="font-semibold">{total.fqaRuns.toLocaleString()}</td><td className="font-semibold">{total.fqaRunnerHrs.toLocaleString()}</td><td className="font-semibold">{total.nqaRuns.toLocaleString()}</td><td className="font-semibold">{total.nqaWorkerHrs.toLocaleString()}</td><td className="text-right font-bold text-sky-600">{won(total.cost)}</td></tr>
          </tbody>
        </table>
      </Card>
      <div className="text-xs text-slate-500">＊ 과금액은 LQA 모델 토큰 비용 + FQA 러너·NQA 부하생성기 컴퓨트 시간 기준 추정치이며, 사용량 미터링(metering_event)에서 집계됩니다.</div>
    </div>
  );
}

function AuditConsole() {
  const { tenants } = useApp();
  const tName = (id) => (id === "-" ? "전역" : (tenants.find((t) => t.id === id) || {}).name || id);
  const [q, setQ] = useState("");
  const rows = INIT_AUDIT.filter((a) => (a.actor + a.action + a.target).toLowerCase().includes(q.toLowerCase()));
  // 모든 행위를 의미별 배지로 — 파괴적(fail) · 변경/권한(warn) · 생성류(info) · 실행/기타(active)
  const aK = (act) => /삭제|차단|정지|거부|해지|중단/.test(act) ? "fail" : /권한|변경|수정/.test(act) ? "warn" : /생성|등록|추가|초대|연결/.test(act) ? "info" : "active";
  return (
    <div className="space-y-4">
      <PageToolbar desc="전체 조직 주요 행위 이력 (생성 · 변경 · 권한 · 정지 · 실행)">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="행위 · 대상 검색" className="w-64" />
      </PageToolbar>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-500 text-left border-b border-slate-200"><th className="py-2.5 px-4 font-medium">시각</th><th className="font-medium">행위자</th><th className="font-medium">조직</th><th className="font-medium">행위</th><th className="font-medium">대상</th></tr></thead>
          <tbody className="text-slate-700">
            {rows.map((a, i) => (
              <tr key={i} className="border-b border-slate-200 hover:bg-slate-100">
                <td className="py-2.5 px-4 text-slate-500 text-xs whitespace-nowrap">{a.t}</td>
                <td className="text-slate-800">{a.actor}</td>
                <td>{tName(a.tenant)}</td>
                <td><Badge kind={aK(a.action)}>{a.action}</Badge></td>
                <td className="text-slate-700">{a.target}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5}><EmptyState icon={ScrollText} title="검색 결과가 없습니다" /></td></tr>}
          </tbody>
        </table>
      </Card>
      <div className="text-xs text-slate-500">＊ 감사 로그는 audit_log에 적재되며, 변경 전/후 값과 함께 보존됩니다(데모는 요약).</div>
    </div>
  );
}

export function NewModelForm({ close }) {
  const { addModel, toast } = useApp();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("Anthropic");
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const submit = () => {
    if (!name.trim()) { toast("모델 표시 이름을 입력하세요", "warn"); return; }
    addModel({ id: "m" + Date.now(), name, provider, model: model || "(미입력)", price: price || "-", status: "활성", created: new Date().toISOString().slice(0, 10) });
    toast("모델 '" + name + "' 등록됨", "ok"); close();
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="표시 이름"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: Claude Opus" /></Field>
        <Field label="Provider"><Select value={provider} onChange={(e) => setProvider(e.target.value)}><option>Anthropic</option><option>OpenAI</option><option>Google</option><option>Internal</option><option>Bedrock</option></Select></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="모델 ID"><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="model-id" /></Field>
        <Field label="과금 단가 (1M 토큰당)"><Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$3 / 1M" /></Field>
      </div>
      {(provider === "Internal" || provider === "Bedrock") && (
        <Field label="Endpoint · 리전 (자체 호스팅 · 호환 API)"><Input placeholder="https://... 또는 리전 · 시크릿은 변수 화면에서 관리" /></Field>
      )}
      <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-500">Provider 연동 어댑터는 플랫폼에 <span className="text-slate-700">사전 구축</span>되어 있습니다. 등록은 지원 Provider의 특정 모델을 카탈로그에 올려 <span className="text-slate-700">① 조직 Judge 사용 허용 · ② 토큰 과금 단가 · ③ 호출 라우팅</span>을 정의하는 작업입니다. 새 Provider 연동은 플랫폼 개발이 필요합니다.</div>
      <div className="flex justify-end gap-2 pt-1"><Btn onClick={close}>취소</Btn><Btn kind="primary" icon={Plus} onClick={submit}>등록</Btn></div>
    </div>
  );
}

function ModelsConsole() {
  const { models, openModal, setModelStatus, toast } = useApp();
  const stat = [["전체 모델", models.length, "text-slate-900"], ["활성", models.filter((m) => m.status === "활성").length, "text-emerald-600"], ["비활성", models.filter((m) => m.status === "비활성").length, "text-slate-500"]];
  return (
    <div className="space-y-4">
      <PageToolbar desc="플랫폼 AI 모델 카탈로그 · Provider 어댑터 사전 연동 · 등록 = 조직 Judge 사용 허용 + 과금 단가 정의">
        <Btn kind="primary" icon={Plus} onClick={() => openModal("newModel")}>모델 등록</Btn>
      </PageToolbar>
      <div className="grid grid-cols-3 gap-3">{stat.map((x) => (<Card key={x[0]} className="p-3 text-center"><div className={"text-2xl font-bold " + x[2]}>{x[1]}</div><div className="text-xs text-slate-500 mt-0.5">{x[0]}</div></Card>))}</div>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-500 text-left border-b border-slate-200"><th className="py-2.5 px-4 font-medium">모델</th><th className="font-medium">Provider</th><th className="font-medium">모델 ID</th><th className="font-medium">단가</th><th className="font-medium">등록일</th><th className="font-medium">상태</th><th></th></tr></thead>
          <tbody className="text-slate-700">
            {models.map((m) => (
              <tr key={m.id} className="border-b border-slate-200 hover:bg-slate-100">
                <td className="py-3 px-4 font-medium text-slate-900">{m.name}</td>
                <td>{m.provider}</td>
                <td className="font-mono text-xs text-slate-500">{m.model}</td>
                <td>{m.price}</td>
                <td className="text-slate-500 text-xs">{m.created}</td>
                <td><Badge kind={KIND.modelStatus[m.status]}>{m.status}</Badge></td>
                <td className="pr-4"><button onClick={() => { const ns = m.status === "활성" ? "비활성" : "활성"; setModelStatus(m.id, ns); toast(m.name + " " + ns, "info"); }} className="text-xs rounded-lg px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700">{m.status === "활성" ? "비활성화" : "활성화"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function NewTenantForm({ close }) {
  const { addTenant, addUser, toast } = useApp();
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("Team");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const submit = () => {
    if (!name.trim()) { toast("조직명을 입력하세요", "warn"); return; }
    if (adminEmail && !adminEmail.includes("@")) { toast("올바른 이메일 형식이 아닙니다", "warn"); return; }
    const hasAdmin = !!adminName.trim();
    const admin = hasAdmin ? adminName.trim() + (adminEmail.trim() ? " (" + adminEmail.trim() + ")" : "") : "미지정";
    const tid = "t" + Date.now();
    addTenant({ id: tid, name, plan, users: hasAdmin ? 1 : 0, status: "활성", admin, created: new Date().toISOString().slice(0, 10) });
    // 관리자 지정 시 '대기(초대)' 사용자로 함께 등록 — 조직 목록 사용자 수·사용자 관리 탭과 일치
    if (hasAdmin) addUser({ id: "u" + Date.now(), name: adminName.trim(), email: adminEmail.trim(), tenant: tid, role: "조직관리자", status: "대기", last: "미로그인" });
    toast("조직 '" + name + "' 추가됨", "ok"); close();
  };
  return (
    <div className="space-y-4">
      <Field label="조직명"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: KT" /></Field>
      <Field label="플랜"><Select value={plan} onChange={(e) => setPlan(e.target.value)}><option>Trial</option><option>Team</option><option>Enterprise</option></Select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="조직 관리자 이름"><Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="예: 홍길동" /></Field>
        <Field label="관리자 이메일"><Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="예: gildong@company.com" /></Field>
      </div>
      <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-500">조직 관리자에게 초대 메일이 발송되며, 관리자가 멤버를 초대·권한을 부여합니다.</div>
      <div className="flex justify-end gap-2 pt-1"><Btn onClick={close}>취소</Btn><Btn kind="primary" icon={Plus} onClick={submit}>추가</Btn></div>
    </div>
  );
}

export function AssignAdminForm({ close, data }) {
  const { setTenantAdmin, toast } = useApp();
  const init = (data && data.admin && data.admin !== "미지정") ? data.admin : "";
  const parsed = init.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  const [adminName, setAdminName] = useState(parsed ? parsed[1] : init);
  const [adminEmail, setAdminEmail] = useState(parsed ? parsed[2] : "");
  const submit = () => {
    if (!adminName.trim()) { toast("관리자 이름을 입력하세요", "warn"); return; }
    if (adminEmail && !adminEmail.includes("@")) { toast("올바른 이메일 형식이 아닙니다", "warn"); return; }
    const admin = adminName.trim() + (adminEmail.trim() ? " (" + adminEmail.trim() + ")" : "");
    setTenantAdmin(data.id, admin); toast(data.name + " 조직 관리자 지정됨", "ok"); close();
  };
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">대상 조직 <span className="text-sky-600 font-medium">{data && data.name}</span></div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="조직 관리자 이름"><Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="예: 홍길동" /></Field>
        <Field label="관리자 이메일"><Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="예: gildong@company.com" /></Field>
      </div>
      <div className="text-xs text-slate-500">지정된 관리자는 해당 조직 내에서 사용자 초대 · 메뉴별 권한 부여 권한을 갖습니다.</div>
      <div className="flex justify-end gap-2 pt-1"><Btn onClick={close}>취소</Btn><Btn kind="primary" icon={UserCog} onClick={submit}>지정</Btn></div>
    </div>
  );
}

function TenantsConsole() {
  const { tenants, users, openModal, setTenantStatus, toast } = useApp();
  const userCount = (id) => users.filter((u) => u.tenant === id).length;   // 실제 사용자 레코드에서 파생 — '사용자 관리' 탭과 일치
  const stat = [["전체 조직", tenants.length, "text-slate-900"], ["활성", tenants.filter((t) => t.status === "활성").length, "text-emerald-600"], ["정지", tenants.filter((t) => t.status === "정지").length, "text-red-600"]];
  return (
    <div className="space-y-4">
      <PageToolbar desc="서비스 이용 조직 추가·관리 및 조직 관리자 지정">
        <Btn kind="primary" icon={Plus} onClick={() => openModal("newTenant")}>조직 추가</Btn>
      </PageToolbar>
      <div className="grid grid-cols-3 gap-3">
        {stat.map((x) => (<Card key={x[0]} className="p-3 text-center"><div className={"text-2xl font-bold " + x[2]}>{x[1]}</div><div className="text-xs text-slate-500 mt-0.5">{x[0]}</div></Card>))}
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-500 text-left border-b border-slate-200"><th className="py-2.5 px-4 font-medium">조직명</th><th className="font-medium">플랜</th><th className="font-medium">사용자</th><th className="font-medium">조직 관리자</th><th className="font-medium">생성일</th><th className="font-medium">상태</th><th></th></tr></thead>
          <tbody className="text-slate-700">
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-slate-200 hover:bg-slate-100">
                <td className="py-3 px-4 font-medium text-slate-900">{t.name}</td>
                <td><Badge kind={KIND.plan[t.plan]}>{t.plan}</Badge></td>
                <td>{userCount(t.id)}</td>
                <td className="text-slate-700">{t.admin}</td>
                <td className="text-slate-500 text-xs">{t.created}</td>
                <td><Badge kind={KIND.tenantStatus[t.status]}>{t.status}</Badge></td>
                <td className="pr-4"><div className="flex items-center gap-2">
                  <button onClick={() => openModal("assignAdmin", { id: t.id, name: t.name, admin: t.admin })} className="text-slate-500 hover:text-sky-600" title="조직 관리자 지정"><UserCog size={15} /></button>
                  <button onClick={() => { const ns = t.status === "활성" ? "정지" : "활성"; setTenantStatus(t.id, ns); toast(t.name + " " + ns + " 처리", ns === "활성" ? "ok" : "warn"); }} className="text-xs rounded-lg px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700">{t.status === "활성" ? "정지" : "활성화"}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const CONSOLE_NAV = [
  { id: "tenants", label: "조직 관리", icon: Building2 },
  { id: "cusers", label: "사용자 관리", icon: Users },
  { id: "models", label: "AI 모델", icon: Cpu },
  { id: "usage", label: "사용량 · 과금", icon: CreditCard },
  { id: "audit", label: "감사 로그", icon: ScrollText },
];

export function ConsoleShell() {
  const { setSpace } = useApp();
  const [cv, setCv] = useState("tenants");
  const cur = CONSOLE_NAV.find((n) => n.id === cv);
  return (
    <>
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2"><Shield size={18} className="text-amber-600" /><span className="font-bold text-slate-900">관리자 콘솔</span></div>
          <div className="mt-1 text-xs text-amber-600 font-semibold pl-7">서비스 관리자 · 전체 조직</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {CONSOLE_NAV.map((n) => { const Icon = n.icon; const on = cv === n.id; return (
            <button key={n.id} onClick={() => setCv(n.id)} className={"w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm " + (on ? "bg-amber-500 text-white font-semibold" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}><Icon size={17} />{n.label}</button>
          ); })}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <button onClick={() => setSpace("product")} className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100"><ArrowLeft size={16} />제품 워크스페이스로</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2"><cur.icon size={18} className="text-amber-600" /><h1 className="text-lg font-bold text-slate-900">{cur.label}</h1></div>
          <div className="text-sm text-slate-500">관리자 콘솔 · 전체 조직 횡단</div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {cv === "tenants" ? <TenantsConsole /> : cv === "cusers" ? <UsersConsole /> : cv === "models" ? <ModelsConsole /> : cv === "usage" ? <UsageConsole /> : <AuditConsole />}
        </div>
      </main>
    </>
  );
}
