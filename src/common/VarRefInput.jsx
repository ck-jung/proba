import { useState } from "react";
import { useApp } from "./context.js";
import { Input } from "./ui.jsx";
import { KeyRound, Search, ChevronDown } from "lucide-react";

/* 변수 참조 입력 — ${키} 자유 입력 + 검색형 타입어헤드(변수 다수 대응). 공통 컴포넌트. */
export function VarRefInput({ value, onChange, placeholder, secretOnly = true }) {
  const { variables } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = (variables || []).filter((v) => (secretOnly ? v.secret : true));
  const ql = q.trim().toLowerCase();
  const matches = list.filter((v) => !ql || v.key.toLowerCase().includes(ql) || (v.desc || "").toLowerCase().includes(ql));
  const pick = (v) => { onChange("${" + v.key + "}"); setOpen(false); setQ(""); };
  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="font-mono" />
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2.5 text-xs text-slate-700 hover:border-sky-500"><KeyRound size={12} />변수<ChevronDown size={12} /></button>
      </div>
      {open && (<>
        <div className="fixed inset-0 z-20" onClick={() => { setOpen(false); setQ(""); }} />
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-lg border border-slate-300 bg-white shadow-xl">
          <div className="flex items-center gap-1.5 border-b border-slate-200 px-2.5 py-1.5"><Search size={12} className="text-slate-500" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="키 검색" className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none" /></div>
          <div className="max-h-56 overflow-y-auto py-1">
            {matches.length === 0 ? <div className="px-3 py-3 text-center text-xs text-slate-500">일치하는 변수가 없습니다</div> : matches.map((v) => (
              <button key={v.key} type="button" onClick={() => pick(v)} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-slate-100">
                <span className="flex-1 truncate font-mono text-xs text-slate-800">{v.key}</span>
                {v.desc && <span className="shrink-0 truncate text-xs text-slate-500" style={{ maxWidth: 96 }}>{v.desc}</span>}
                {v.secret && <KeyRound size={11} className="shrink-0 text-amber-600" />}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-200 px-2.5 py-1 text-right text-xs text-slate-400">{list.length}개 중 {matches.length} 표시 · 클릭 시 {"${키}"} 삽입</div>
        </div>
      </>)}
    </div>
  );
}
