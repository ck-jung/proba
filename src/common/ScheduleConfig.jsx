// ============================================================
// 공통 실행 스케줄/트리거 설정 — 수동 · 정기 스케줄 · 이벤트 트리거
// 도메인 차이(이벤트 목록·수동 안내문)는 props로 주입. LQA·FQA 공용.
//   events: [key, 라벨, 설명, 요약라벨][]
//   onSave(summary): 저장 시 호출(계획에 반영 등) · toast(msg,kind): 알림
// ============================================================
import { useState, useEffect, useRef } from "react";
import { Calendar, RefreshCw } from "lucide-react";
import { Field, Input, Select, Btn, Toggle, Seg } from "./ui.jsx";

const MODES = [["manual", "수동"], ["schedule", "정기 스케줄"], ["event", "이벤트 트리거"]];
// 이벤트는 도메인이 주입한다(정보성·읽기전용). 기본값은 폴백일 뿐.
const DEFAULT_EVENTS = [
  { key: "deploy", label: "배포 시", desc: "대상에 새 빌드가 배포되면 자동 실행합니다", short: "배포",
    fields: [{ k: "detect", type: "readonly", label: "감지 방식", value: "대상 설정에서 정의 (상속)" }] },
];

export function ScheduleConfig({ title = "실행 스케줄", subtitle = "백그라운드 자동 실행", manualHint = "자동 실행 없음 — 수동으로만 수행합니다.", events = DEFAULT_EVENTS, singleSelect = false, allowEvent = true, value, onChange, onSave, toast }) {
  const controlled = !!onChange;
  const v = value || {};
  const [mode, setMode] = useState(v.mode || "schedule");
  const [freq, setFreq] = useState(v.freq || "weekly");
  const [time, setTime] = useState(v.time || "09:00");
  const [dow, setDow] = useState(v.dow != null ? v.dow : 1);
  const [dom, setDom] = useState(v.dom != null ? v.dom : 1);
  const [cron, setCron] = useState(v.cron || "0 9 * * 1");
  const [tz, setTz] = useState(v.tz || "Asia/Seoul");
  const [active, setActive] = useState(v.active != null ? v.active : true);
  const [ev, setEv] = useState(() => (v.ev ? { ...Object.fromEntries(events.map((e) => [e.key, false])), ...v.ev } : Object.fromEntries(events.map((e, i) => [e.key, i === 0]))));
  const dowK = ["일", "월", "화", "수", "목", "금", "토"];
  const notify = (m, k) => { if (toast) toast(m, k); };
  const cronExpr = () => {
    const parts = time.split(":"); const hh = parts[0]; const mm = parts[1];
    if (freq === "hourly") return "0 * * * *";
    if (freq === "daily") return mm + " " + hh + " * * *";
    if (freq === "weekdays") return mm + " " + hh + " * * 1-5";
    if (freq === "weekly") return mm + " " + hh + " * * " + dow;
    if (freq === "monthly") return mm + " " + hh + " " + dom + " * *";
    return cron;
  };
  const nextRun = () => {
    if (freq === "hourly") return "매시 정각";
    if (freq === "daily") return "매일 " + time;
    if (freq === "weekdays") return "평일 " + time;
    if (freq === "weekly") return "매주 " + dowK[dow] + "요일 " + time;
    if (freq === "monthly") return "매월 " + dom + "일 " + time;
    return "Cron 식 기준";
  };
  const presets = [["매일 02:00", "daily", "02:00"], ["평일 09:00", "weekdays", "09:00"], ["1시간마다", "hourly", "09:00"]];
  const modeLabel = (MODES.find((m) => m[0] === mode) || MODES[0])[1];
  const modes = allowEvent ? MODES : MODES.filter((m) => m[0] !== "event");
  useEffect(() => { if (!allowEvent && mode === "event") setMode("manual"); }, [allowEvent, mode]);
  const saveSchedule = () => { if (onSave) onSave(nextRun()); notify("스케줄 저장됨 · " + nextRun(), "ok"); };
  const saveEvent = () => {
    const picked = events.filter((e) => ev[e.key]).map((e) => e.short).join("·");
    if (onSave) onSave(picked ? "이벤트: " + picked : "예약 없음");
    notify("이벤트 트리거 저장됨", "ok");
  };
  const summaryOf = () => {
    if (mode === "manual") return "예약 없음";
    if (mode === "schedule") return active ? nextRun() : "스케줄 중지됨";
    const picked = events.filter((e) => ev[e.key]).map((e) => e.short).join("·");
    return picked ? "이벤트: " + picked : "예약 없음";
  };
  // controlled 모드(onChange 제공): 변경을 상위(평가 계획 draft)로 방출 → 통합 저장/ dirty. 마운트 시엔 생략.
  const mounted = useRef(false);
  useEffect(() => {
    if (!controlled) return;
    if (!mounted.current) { mounted.current = true; return; }
    onChange({ mode, freq, time, dow, dom, cron, tz, active, ev, summary: summaryOf() });
  }, [mode, freq, time, dow, dom, cron, tz, active, ev]);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Calendar size={15} className="text-sky-600" />{title} <span className="text-xs font-normal text-slate-500">· {subtitle}</span></div>
        {mode === "schedule" && <div className="flex items-center gap-2 text-xs text-slate-500">스케줄 사용 <Toggle on={active} onClick={() => setActive(!active)} /></div>}
      </div>
      <div className="mb-4"><Seg options={modes.map((m) => m[1])} value={modeLabel} onChange={(lbl) => setMode((MODES.find((m) => m[1] === lbl) || MODES[0])[0])} /></div>
      {mode === "manual" && <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-500">{manualHint}</div>}
      {mode === "schedule" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (<button key={p[0]} onClick={() => { setFreq(p[1]); setTime(p[2]); }} className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200">{p[0]}</button>))}
            <button onClick={() => { setFreq("weekly"); setDow(1); setTime("09:00"); }} className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200">매주 월 09:00</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="주기"><Select value={freq} onChange={(e) => setFreq(e.target.value)}><option value="hourly">매시간</option><option value="daily">매일</option><option value="weekdays">평일</option><option value="weekly">매주</option><option value="monthly">매월</option><option value="cron">사용자 정의(Cron)</option></Select></Field>
            {freq !== "hourly" && freq !== "cron" && <Field label="시각"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>}
            {freq === "monthly" && <Field label="일(day)"><Input type="number" value={dom} onChange={(e) => setDom(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))} /></Field>}
            <Field label="타임존"><Select value={tz} onChange={(e) => setTz(e.target.value)}><option>Asia/Seoul</option><option>UTC</option></Select></Field>
          </div>
          {freq === "weekly" && (<div><div className="text-xs font-semibold text-slate-500 mb-1.5">요일</div><div className="flex gap-1.5">{dowK.map((d, i) => (<button key={i} onClick={() => setDow(i)} className={"w-9 h-9 rounded-lg text-sm " + (dow === i ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>{d}</button>))}</div></div>)}
          {freq === "cron" && <Field label="Cron 표현식"><Input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 9 * * 1" /></Field>}
          <div className="flex items-center justify-between rounded-lg bg-slate-100 p-3">
            <div className="text-sm"><span className="text-slate-500">다음 실행 </span><span className="text-sky-600 font-medium">{nextRun()}</span> <span className="text-slate-400">·</span> <span className="font-mono text-xs text-slate-500">{cronExpr()}</span></div>
            {!controlled && <Btn kind="primary" icon={RefreshCw} onClick={saveSchedule}>저장</Btn>}
          </div>
        </div>
      )}
      {mode === "event" && (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 mb-1">특정 이벤트가 발생하면 자동으로 실행합니다.</div>
          {events.map((e) => (
            <div key={e.key} className="rounded-lg bg-slate-100 p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type={singleSelect ? "radio" : "checkbox"} name={singleSelect ? "sched-event" : undefined} checked={!!ev[e.key]} onChange={() => setEv(singleSelect ? Object.fromEntries(events.map((x) => [x.key, x.key === e.key])) : { ...ev, [e.key]: !ev[e.key] })} className="accent-sky-500 mt-0.5" />
                <div><div className="text-sm text-slate-800">{e.label}</div><div className="text-xs text-slate-500">{e.desc}</div></div>
              </label>
              {ev[e.key] && e.fields && (
                <div className="mt-2.5 ml-7 grid grid-cols-2 gap-2 border-l border-slate-300 pl-3">
                  {e.fields.map((f) => (
                    <div key={f.k}>
                      <div className="text-xs text-slate-500 mb-0.5">{f.label}</div>
                      {f.type === "readonly"
                        ? <div className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-500">{f.value}</div>
                        : f.type === "select"
                        ? <select defaultValue={f.options[0]} className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800">{f.options.map((o) => <option key={o}>{o}</option>)}</select>
                        : <input defaultValue={f.value} className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!controlled && <div className="flex justify-end"><Btn kind="primary" icon={RefreshCw} onClick={saveEvent}>저장</Btn></div>}
        </div>
      )}
    </div>
  );
}
