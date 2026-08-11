// ============================================================
// 공통 UI 프리미티브 (단일 출처)
// - LQA(App.jsx) 적용 완료. 신규/NQA 화면은 여기서 import.
// - LQA · FQA · 관리자 콘솔 전 영역이 이 단일 출처를 사용(2026-07-01 통일).
//
// 🔑 테마 (2026-08-07)
//   기본은 dark. <ThemeProvider value="light"> 로 감싼 하위 트리만 light 로 렌더한다.
//   화면별로 점진 전환할 수 있고, 되돌릴 때도 Provider 만 걷어내면 된다.
//   ※ 화면 자체의 인라인 클래스는 여기서 못 바꾼다 — 그건 화면에서 정리해야 한다.
// ============================================================
import { useState, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { X, Search } from "lucide-react";
import { C } from "./theme.js";

/* 🔑 오버레이는 반드시 이 Portal 로 감싼다.
   position:fixed 는 조상에 transform·filter·contain 이 하나라도 있으면
   뷰포트가 아니라 그 조상 기준으로 갇힌다 — Dim 이 화면 일부만 덮는 원인이다.
   body 직속으로 렌더하면 조상이 무엇이든 항상 화면 전체를 덮는다. */
export const Portal = ({ children }) => createPortal(children, document.body);

const ThemeCtx = createContext("light");  // 전면 라이트 전환(2026-08-07). 다크가 필요하면 <ThemeProvider value="dark">
export const ThemeProvider = ThemeCtx.Provider;
export const useTheme = () => useContext(ThemeCtx);
const L = (t) => t === "light";

export function Badge({ kind = "info", children }) {
  const t = useTheme();
  const dark = {
    pass: "bg-emerald-900 text-emerald-300", fail: "bg-red-900 text-red-300",
    warn: "bg-amber-900 text-amber-300", info: "bg-slate-700 text-slate-300",
    active: "bg-teal-900 text-teal-300", draft: "bg-slate-700 text-slate-400",
    crit: "bg-red-900 text-red-300", major: "bg-amber-900 text-amber-300", minor: "bg-slate-700 text-slate-300",
    teal: "bg-teal-900 text-teal-300", live: "bg-red-900 text-red-300",
  };
  const light = {
    pass: "bg-emerald-100 text-emerald-700", fail: "bg-red-100 text-red-700",
    warn: "bg-amber-100 text-amber-700", info: "bg-slate-200 text-slate-700",
    active: "bg-sky-100 text-sky-700", draft: "bg-slate-200 text-slate-500",
    crit: "bg-red-100 text-red-700", major: "bg-amber-100 text-amber-700", minor: "bg-slate-200 text-slate-700",
    teal: "bg-sky-100 text-sky-700", live: "bg-red-100 text-red-700",
  };
  const m = L(t) ? light : dark;
  return <span className={"px-2 py-0.5 rounded text-xs font-semibold " + (m[kind] || m.info)}>{children}</span>;
}

export function ScoreBar({ label, value, color }) {
  const t = useTheme();
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1"><span className={L(t) ? "text-slate-500" : "text-slate-400"}>{label}</span><span className={"font-semibold " + (L(t) ? "text-slate-900" : "text-slate-100")}>{value}</span></div>
      <div className={"h-2 rounded " + (L(t) ? "bg-slate-200" : "bg-slate-800")}><div className="h-2 rounded" style={{ width: value + "%", background: color || C.teal }} /></div>
    </div>
  );
}

export function Card({ children, className = "" }) {
  const t = useTheme();
  const base = L(t) ? "rounded-xl border border-slate-200 bg-white shadow-sm " : "rounded-xl border border-slate-800 bg-slate-900 ";
  return <div className={base + className}>{children}</div>;
}

export function Field({ label, children, hint }) {
  const t = useTheme();
  return <div><div className={"text-xs font-semibold mb-1.5 " + (L(t) ? "text-slate-600" : "text-slate-400")}>{label}</div>{children}{hint && <div className={"mt-1 text-xs " + (L(t) ? "text-slate-500" : "text-slate-500")}>{hint}</div>}</div>;
}

export function Btn({ kind = "ghost", icon: Icon, children, onClick, disabled, title, className = "" }) {
  const t = useTheme();
  const dark = {
    primary: "bg-teal-600 hover:bg-teal-500 text-white",
    ghost: "bg-slate-800 hover:bg-slate-700 text-slate-200",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    soft: "bg-slate-800 hover:bg-slate-700 text-slate-300",
  };
  const light = {
    primary: "bg-sky-600 hover:bg-sky-700 text-white",
    ghost: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    soft: "bg-slate-100 hover:bg-slate-200 text-slate-700",
  };
  const m = L(t) ? light : dark;
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed " + (m[kind] || m.ghost) + " " + className}>
      {Icon && <Icon size={15} />}{children}
    </button>
  );
}

export function Input(props) {
  const t = useTheme();
  const base = L(t)
    ? "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500 "
    : "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-teal-500 ";
  return <input {...props} className={base + (props.className || "")} />;
}

export function Select({ children, ...p }) {
  const t = useTheme();
  const base = L(t)
    ? "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-500"
    : "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-500";
  return <select {...p} className={base}>{children}</select>;
}

export function Toggle({ on, onClick, disabled }) {
  const t = useTheme();
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} className={"w-9 h-5 rounded-full p-0.5 " + (on ? "bg-sky-500" : (L(t) ? "bg-slate-300" : "bg-slate-700")) + (disabled ? " opacity-50 cursor-not-allowed" : "")}>
      <span className="block w-4 h-4 rounded-full bg-white" style={{ transform: on ? "translateX(16px)" : "translateX(0px)", transition: "transform .15s" }} />
    </button>
  );
}

export function Modal({ title, children, onClose, wide }) {
  const t = useTheme();
  const box = L(t) ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900";
  return (
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={"w-full rounded-xl border shadow-xl " + box + " " + (wide ? "max-w-5xl" : "max-w-xl")} onClick={(e) => e.stopPropagation()}>
        <div className={"flex items-center justify-between px-5 py-3.5 border-b " + (L(t) ? "border-slate-200" : "border-slate-800")}>
          <h3 className={"font-semibold " + (L(t) ? "text-slate-900" : "text-slate-100")}>{title}</h3>
          <button onClick={onClose} className={L(t) ? "text-slate-400 hover:text-slate-700" : "text-slate-500 hover:text-slate-200"}><X size={18} /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: "84vh" }}>{children}</div>
      </div>
    </div></Portal>
  );
}

// 화면 상단 툴바 — 좌: 설명 / 우: 액션 (전 화면 공통 골격)
export function PageToolbar({ desc, children }) {
  const t = useTheme();
  return (
    <div className="flex items-center justify-between gap-3">
      <div className={"text-sm " + (L(t) ? "text-slate-500" : "text-slate-400")}>{desc}</div>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </div>
  );
}

// 빈 상태 — 아이콘 + 제목 + 보조 문구 (공통)
export function EmptyState({ icon: Icon, title, hint }) {
  const t = useTheme();
  return (
    <div className="py-12 text-center">
      {Icon && <Icon size={26} className={(L(t) ? "text-slate-300" : "text-slate-600") + " mx-auto mb-2.5"} />}
      <div className={"font-medium text-sm " + (L(t) ? "text-slate-700" : "text-slate-300")}>{title}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

// 검색 입력 — 아이콘 내장, Input/Select와 동일 톤 (공통)
export function SearchInput({ value, onChange, placeholder, className = "" }) {
  const t = useTheme();
  const box = L(t) ? "bg-white border-slate-300" : "bg-slate-800 border-slate-700";
  return (
    <div className={"flex items-center gap-2 border rounded-lg px-3 py-2 focus-within:border-sky-500 " + box + " " + className}>
      <Search size={15} className={(L(t) ? "text-slate-400" : "text-slate-500") + " shrink-0"} />
      <input value={value} onChange={onChange} placeholder={placeholder} className={"bg-transparent text-sm outline-none flex-1 w-full " + (L(t) ? "text-slate-800 placeholder-slate-400" : "text-slate-200 placeholder-slate-500")} />
    </div>
  );
}

// 세그먼트 컨트롤 (탭형 토글)
export function Seg({ options, value, onChange }) {
  const t = useTheme();
  return (
    <div className={"inline-flex rounded-lg p-0.5 " + (L(t) ? "bg-slate-200" : "bg-slate-800")}>
      {options.map((o) => <button key={o} onClick={() => onChange(o)} className={"rounded-md px-3 py-1.5 text-xs font-medium transition " + (value === o ? "bg-sky-600 text-white" : (L(t) ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-slate-200"))}>{o}</button>)}
    </div>
  );
}

// 현재 시각을 "YYYY-MM-DD HH:mm" 로 포맷 (실행 이력 시각 표기 통일용)
export const fmtTs = (d) => { const z = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes()); };
export const nowStamp = () => fmtTs(new Date());
export const stampPlus = (sec) => fmtTs(new Date(Date.now() + (sec || 0) * 1000));

// 실행 이력 "시각" 셀 — 시작(전체 일시) / 종료(같은 날이면 시간만) 2줄 표시 (전 도메인 공통)
export function RunTime({ start, end }) {
  const t = useTheme();
  if (!start || start === "-") return <span className={L(t) ? "text-slate-400" : "text-slate-600"}>-</span>;
  let endTxt = "";
  if (end && end !== "-") endTxt = end.slice(0, 10) === start.slice(0, 10) ? end.slice(11) : end;
  return (
    <div className="leading-tight">
      <div className={L(t) ? "text-slate-700" : "text-slate-300"}>{start}</div>
      <div className="text-xs text-slate-500">{endTxt ? "~ " + endTxt : "~ —"}</div>
    </div>
  );
}

// 로컬 토스트 (화면 자체 알림용) — 전역 context toast와 별개로 필요한 화면에서 사용
export function useToast() { const [m, setM] = useState(""); return [m, (t) => { setM(t); setTimeout(() => setM(""), 2000); }]; }
export function Toast({ msg }) { return msg ? <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800 shadow-xl">{msg}</div> : null; }
// end of ui.jsx
export const backTo = (w) => { const s = String(w); const c = s.charCodeAt(s.length - 1); const jong = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 : -1; return s + (jong === 0 || jong === 8 ? "로" : "으로"); };
