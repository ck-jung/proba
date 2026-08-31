import { useState } from "react";
import { useApp } from "./context.js";
import { Card, PageToolbar, Badge, Btn, Field, Input, Toggle, Toast, useToast, Portal } from "./ui.jsx";
import { Plus, X, Save, Eye, EyeOff, KeyRound, Copy, Pencil, Braces, Search, Upload, Download, AlertTriangle, Trash2 } from "lucide-react";

const nowStr = () => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); };
const KEY_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/* 변수 작업 공간 (공통) — 평면 K/V·시크릿. 참조 수 라이브 스캔 · 엑셀 대량 업로드 · 다중 선택 삭제. */
export function VariablesScreen() {
  const { variables, addVariable, updateVariable, removeVariable, nqaSystems, fqaSystems } = useApp();
  const [msg, flash] = useToast();
  const list = variables || [];
  const [q, setQ] = useState("");
  const [reveal, setReveal] = useState({});
  const [picked, setPicked] = useState(new Set());
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [vf, setVf] = useState({ key: "", value: "", secret: false, desc: "", createdAt: "", updatedAt: "" });
  const [xlModal, setXlModal] = useState(false);
  const [xlRows, setXlRows] = useState([]);
  const [xlName, setXlName] = useState("");
  const corpus = JSON.stringify(nqaSystems || []) + JSON.stringify(fqaSystems || []);
  const refCount = (key) => corpus.split("${" + key + "}").length - 1;
  const ql = q.trim().toLowerCase();
  const shown = !ql ? list : list.filter((v) => v.key.toLowerCase().includes(ql) || (v.desc || "").toLowerCase().includes(ql));
  const mask = (v) => (v ? "•".repeat(Math.min(14, Math.max(6, v.length))) : "—");
  const copyRef = (key) => { try { navigator.clipboard && navigator.clipboard.writeText("${" + key + "}"); } catch (e) {} flash("${" + key + "} 복사됨"); };
  const togglePick = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allShownPicked = shown.length > 0 && shown.every((v) => picked.has(v.id));
  const toggleAll = () => { if (allShownPicked) setPicked(new Set()); else setPicked(new Set(shown.map((v) => v.id))); };
  const openAdd = () => { setEditId(null); setVf({ key: "", value: "", secret: false, desc: "", createdAt: "", updatedAt: "" }); setModal(true); };
  const openEdit = (v) => { setEditId(v.id); setVf({ key: v.key, value: v.value, secret: !!v.secret, desc: v.desc || "", createdAt: v.createdAt || "", updatedAt: v.updatedAt || "" }); setModal(true); };
  const save = () => {
    const key = vf.key.trim();
    if (!key) { flash("키를 입력하세요"); return; }
    if (!KEY_RE.test(key)) { flash("키는 영문/숫자/밑줄만 (숫자로 시작 불가)"); return; }
    if (list.some((v) => v.id !== editId && v.key === key)) { flash("동일 키가 이미 있습니다"); return; }
    const t = nowStr();
    if (editId) { updateVariable(editId, { key, value: vf.value, secret: vf.secret, desc: vf.desc.trim(), updatedAt: t }); flash("변수가 수정되었습니다"); }
    else { addVariable({ id: "v" + Date.now(), key, value: vf.value, secret: vf.secret, desc: vf.desc.trim(), createdAt: t, updatedAt: t }); flash("변수가 추가되었습니다"); }
    setModal(false);
  };
  const del = (v) => { const n = refCount(v.key); if (n > 0 && !window.confirm(v.key + " 은(는) " + n + "곳에서 참조 중입니다. 삭제 시 해당 참조가 깨질 수 있습니다. 계속할까요?")) return; if (n === 0 && !window.confirm(v.key + " 변수를 삭제할까요?")) return; removeVariable(v.id); setPicked((p) => { const s = new Set(p); s.delete(v.id); return s; }); flash(v.key + " 삭제됨"); };
  const bulkDel = () => {
    const ids = [...picked];
    const refd = ids.filter((id) => { const v = list.find((x) => x.id === id); return v && refCount(v.key) > 0; }).length;
    if (!window.confirm(ids.length + "건 삭제" + (refd ? " (참조 중 " + refd + "건 포함 — 참조가 깨질 수 있음)" : "") + "? 되돌릴 수 없습니다.")) return;
    ids.forEach((id) => removeVariable(id));
    flash(ids.length + "건 삭제됨"); setPicked(new Set());
  };

  const tmpl = () => {
    const csv = "키,값,시크릿,설명\nstg_api_key,sk_live_xxx,Y,스테이징 API 키\nbase_url,https://stg.onmarket.io,N,공통 URL\n";
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })); a.download = "변수_양식.csv"; a.click();
  };
  const openXl = () => { setXlRows([]); setXlName(""); setXlModal(true); };
  const onXlFile = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return; setXlName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "").replace(/^﻿/, "");
      const lines = text.split(/\r?\n/).filter((ln) => ln.trim());
      const rows = lines.slice(1).map((ln) => { const c = ln.split(","); return { key: (c[0] || "").trim(), value: (c[1] || "").trim(), secret: /^(y|yes|true|1)$/i.test((c[2] || "").trim()), desc: (c[3] || "").trim() }; });
      setXlRows(rows);
    };
    reader.readAsText(f, "utf-8");
  };
  const seen = new Set();
  const xlStatuses = xlRows.map((r) => {
    if (!KEY_RE.test(r.key || "")) return { ok: false, m: "키 형식 오류" };
    if (list.some((v) => v.key === r.key)) return { ok: false, m: "기존 중복" };
    if (seen.has(r.key)) return { ok: false, m: "행 중복" };
    seen.add(r.key); return { ok: true, m: "등록" };
  });
  const validCount = xlStatuses.filter((s) => s.ok).length;
  const importRows = () => {
    const t = nowStr(); let added = 0;
    xlRows.forEach((r, i) => { if (!xlStatuses[i].ok) return; addVariable({ id: "v" + Date.now() + "-" + i, key: r.key, value: r.value, secret: r.secret, desc: r.desc, createdAt: t, updatedAt: t }); added++; });
    const skipped = xlRows.length - added;
    setXlModal(false); setXlRows([]); setXlName("");
    flash(added + "건 등록" + (skipped ? " · " + skipped + "건 제외(중복/형식)" : ""));
  };

  return (
    <div className="space-y-4">
      <PageToolbar desc="변수·시크릿 (평면 K/V) — 대상/시나리오에서 참조하는 재사용 값. 시크릿은 마스킹 저장." />
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-72"><Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="키·설명 검색" className="w-full rounded-lg border border-slate-300 bg-slate-100 py-2 pl-8 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500" /></div>
        <div className="flex gap-2"><Btn icon={Upload} onClick={openXl}>엑셀 업로드</Btn><Btn kind="primary" icon={Plus} onClick={openAdd}>변수 추가</Btn></div>
      </div>
      {picked.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm">
          <span className="flex-1 text-sky-700">{picked.size}건 선택됨</span>
          <Btn kind="danger" icon={Trash2} onClick={bulkDel}>선택 삭제</Btn>
          <Btn onClick={() => setPicked(new Set())}>선택 해제</Btn>
        </div>
      )}
      <Card className="p-4 space-y-1.5">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-500">
          <div className="flex w-6 justify-center"><input type="checkbox" checked={allShownPicked} onChange={toggleAll} className="accent-sky-600" title="전체 선택" /></div>
          <div className="grid flex-1 grid-cols-12 gap-2">
            <div className="col-span-3">키</div><div className="col-span-3">값</div><div className="col-span-1 text-center">참조</div><div className="col-span-2">생성 일시</div><div className="col-span-2">변경 일시</div><div className="col-span-1 text-right">관리</div>
          </div>
        </div>
        {shown.length === 0 ? <div className="p-4 text-center text-xs text-slate-500">{list.length === 0 ? "변수가 없습니다 — 추가하세요." : "검색 결과가 없습니다."}</div> : shown.map((v) => {
          const n = refCount(v.key);
          return (
          <div key={v.id} className={"flex items-center gap-2 border-b border-slate-200/60 py-1.5 text-sm " + (picked.has(v.id) ? "bg-slate-100/40" : "")}>
            <div className="flex w-6 justify-center"><input type="checkbox" checked={picked.has(v.id)} onChange={() => togglePick(v.id)} className="accent-sky-600" /></div>
            <div className="grid flex-1 grid-cols-12 items-center gap-2">
              <div className="col-span-3 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0"><span className="truncate font-mono text-slate-800">{v.key}</span>{v.secret && <KeyRound size={12} className="shrink-0 text-amber-600" />}</div>
                {v.desc && <div className="truncate text-xs text-slate-500">{v.desc}</div>}
              </div>
              <div className="col-span-3 flex items-center gap-2 min-w-0">
                <span className="flex-1 truncate font-mono text-xs text-slate-500">{v.secret && !reveal[v.id] ? mask(v.value) : (v.value || "—")}</span>
                {v.secret && <button onClick={() => setReveal((r) => ({ ...r, [v.id]: !r[v.id] }))} className="shrink-0 text-slate-500 hover:text-slate-700" title="표시/숨김">{reveal[v.id] ? <EyeOff size={13} /> : <Eye size={13} />}</button>}
                <button onClick={() => copyRef(v.key)} className="shrink-0 text-slate-500 hover:text-sky-600" title="참조 복사 (${키})"><Copy size={12} /></button>
              </div>
              <div className="col-span-1 text-center" title="이 변수를 참조하는 대상/계정 수"><Badge kind={n > 0 ? "teal" : "draft"}>{n}</Badge></div>
              <div className="col-span-2 truncate text-xs text-slate-500">{v.createdAt || "—"}</div>
              <div className="col-span-2 truncate text-xs text-slate-500">{v.updatedAt || "—"}</div>
              <div className="col-span-1 flex items-center justify-end gap-2">
                <button onClick={() => openEdit(v)} className="text-slate-500 hover:text-slate-800" title="편집"><Pencil size={13} /></button>
                <button onClick={() => del(v)} className="text-slate-500 hover:text-red-600" title="삭제"><X size={14} /></button>
              </div>
            </div>
          </div>
          );
        })}
      </Card>
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
        <Braces size={14} className="mt-0.5 shrink-0 text-sky-600" />
        <div>대상·시나리오·인증에서 <span className="font-mono text-slate-700">{"${키}"}</span>로 참조하면 실행 시 해당 값으로 치환됩니다. 환경별로 값이 다르면 <span className="font-mono text-slate-700">stg_토큰 · dev_토큰</span>처럼 접두어로 별도 키를 만드세요. <span className="text-slate-500">참조 수는 테스트 대상 기준 · 0이면 미사용(오펀). 시크릿 값은 마스킹 표시.</span></div>
      </div>

      {modal && (
        <Portal><div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold text-slate-900">{editId ? "변수 편집" : "새 변수"}</div>
            <Field label="키" hint="영문/숫자/밑줄 · 환경별은 stg_/dev_/prd_ 접두어 관례"><Input value={vf.key} onChange={(e) => setVf({ ...vf, key: e.target.value })} placeholder="stg_onmarket_token" /></Field>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"><span className="flex items-center gap-1.5"><KeyRound size={13} className={vf.secret ? "text-amber-600" : "text-slate-500"} />시크릿 (마스킹 저장)</span><Toggle on={vf.secret} onClick={() => setVf({ ...vf, secret: !vf.secret })} /></div>
            <Field label="값"><Input type={vf.secret ? "password" : "text"} value={vf.value} onChange={(e) => setVf({ ...vf, value: e.target.value })} placeholder={vf.secret ? "••••••" : "값 입력"} /></Field>
            <Field label="설명 (선택)"><Input value={vf.desc} onChange={(e) => setVf({ ...vf, desc: e.target.value })} placeholder="용도 메모" /></Field>
            {editId && <div className="text-xs text-slate-500">생성 {vf.createdAt || "—"} · 변경 {vf.updatedAt || "—"}</div>}
            <div className="flex justify-end gap-2 pt-1"><Btn onClick={() => setModal(false)}>취소</Btn><Btn kind="primary" icon={Save} onClick={save}>{editId ? "저장" : "추가"}</Btn></div>
          </div>
        </div></Portal>
      )}

      {xlModal && (
        <Portal><div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setXlModal(false)}>
          <div className="w-full max-w-2xl rounded-xl border border-slate-300 bg-white p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><div className="text-base font-semibold text-slate-900">엑셀 대량 업로드</div><Btn icon={Download} onClick={tmpl}>양식 다운로드</Btn></div>
            <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-100 px-3 py-6 text-sm text-slate-500 hover:border-slate-400">
              <Upload size={20} className="text-slate-500" />파일을 클릭해서 선택
              <span className="text-xs text-slate-500">열: 키 · 값 · 시크릿(Y/N) · 설명 · (.csv)</span>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onXlFile} />
            </label>
            {xlName && <div className="text-xs text-sky-600">{xlName} · {xlRows.length}행 인식</div>}
            {xlRows.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-200 text-left text-slate-500"><th className="px-2.5 py-1.5 font-medium">키</th><th className="font-medium">값</th><th className="font-medium">시크릿</th><th className="font-medium">설명</th><th className="px-2.5 font-medium">상태</th></tr></thead>
                  <tbody>{xlRows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-200/60"><td className="px-2.5 py-1.5 font-mono text-slate-800">{r.key || "—"}</td><td className="max-w-[130px] truncate font-mono text-slate-500">{r.secret ? "••••••" : (r.value || "—")}</td><td className="text-slate-500">{r.secret ? "Y" : "N"}</td><td className="max-w-[130px] truncate text-slate-500">{r.desc || "—"}</td><td className="px-2.5">{xlStatuses[i].ok ? <span className="text-emerald-600">등록</span> : <span className="text-amber-700">{xlStatuses[i].m}</span>}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div className="flex items-start gap-1.5 text-xs text-amber-700/90"><AlertTriangle size={12} className="mt-0.5 shrink-0" />시크릿 값을 스프레드시트 평문으로 올리는 것은 위험합니다 — 대량 업로드는 비-시크릿 설정값을 권장합니다.</div>
            <div className="flex items-center justify-between pt-1"><span className="text-xs text-slate-500">{xlRows.length ? validCount + "건 등록 가능 · " + (xlRows.length - validCount) + "건 제외" : ""}</span><div className="flex gap-2"><Btn onClick={() => setXlModal(false)}>취소</Btn><Btn kind="primary" icon={Plus} disabled={!validCount} onClick={importRows}>등록</Btn></div></div>
          </div>
        </div></Portal>
      )}
      <Toast msg={msg} />
    </div>
  );
}
