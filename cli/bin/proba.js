#!/usr/bin/env node
"use strict";
/* ═══════════════════════════════════════════════════════════════════
   PROBA 레코딩 CLI (v0.1 · 단독 실행판)

     proba record --url https://demo.playwright.dev/todomvc
     proba parse  ./rec.spec.ts --base https://...

   하는 일
     1) playwright codegen 을 띄운다  (브라우저 제어·로케이터 생성은 Playwright가 함)
     2) 창을 닫으면 출력(.spec.ts)을 읽어 PROBA 스텝으로 파싱한다
     3) 스텝을 표로 출력하고 steps.json 으로 저장한다
        · 플랫폼 업로드(--session)는 백엔드가 준비되면 붙인다

   확인하려는 것: "파서가 뽑아낸 스텝이 쓸 만한가" — 커버리지 %와 코드 스텝 개수
   ═══════════════════════════════════════════════════════════════════ */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { parseSpec } = require("../src/parse.js");

const C = { d: "\x1b[2m", r: "\x1b[0m", b: "\x1b[1m", g: "\x1b[32m", y: "\x1b[33m", c: "\x1b[36m", red: "\x1b[31m" };
const log = (...a) => console.log(...a);

/* ── 인자 ── */
function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const nx = argv[i + 1];
      if (nx && !nx.startsWith("--")) { o[k] = nx; i++; } else o[k] = true;
    } else o._.push(a);
  }
  return o;
}

const HELP = `
${C.b}PROBA 레코딩 CLI${C.r}  v0.1

  ${C.c}proba record${C.r} --url <URL> [옵션]      브라우저를 띄워 녹화 → 스텝 추출
  ${C.c}proba parse${C.r}   <파일.spec.ts> [옵션]   이미 있는 codegen 출력을 파싱만

옵션
  --url <URL>          녹화 시작 주소 (record)
  --base <URL>         상대경로 기준 base. 미지정 시 --url 의 origin
  --out <파일>          스텝 저장 경로 (기본: ./steps.json)
  --auth <파일>         로그인 상태 재사용/저장 (기본: ~/.proba/<host>.json)
  --no-auth            로그인 상태 저장/로드 안 함
  --viewport <WxH>     기본 1280x720 (실행 해상도와 맞추세요)
  --acct <id,id>       계정 풀 — 입력값이 일치하면 \${계정 ID}로 치환
  --skip-install       Chromium 자동 설치 건너뜀

시크릿
  비밀번호 필드(로케이터에 password 힌트)의 입력값은 \${계정 비밀번호}로 치환되고
  원본 값은 버려집니다. 평문 비밀번호가 테스트케이스에 남지 않습니다.
`;

/* ── Playwright 버전 고정 ──
   `npx playwright` 로 부르면 그때그때 최신을 받아와서 고정이 되지 않는다.
   package.json 의 dependencies 에 정확한 버전을 박고, 그 로컬 바이너리를 직접 실행한다.
   codegen 출력 포맷이 바뀌면 파서가 깨지므로 이 고정이 중요하다. */
function playwright() {
  let pkgPath;
  try { pkgPath = require.resolve("playwright/package.json"); }
  catch (e) { return { err: "notInstalled" }; }
  try {
    const pkg = require(pkgPath);
    const rel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.playwright;
    /* 🔑 require.resolve("playwright/cli.js") 를 쓰면 안 된다.
       playwright 의 package.json 에 exports 맵이 있고 거기에 ./cli.js 가 없어서
       Node 가 ERR_PACKAGE_PATH_NOT_EXPORTED 로 막는다 — 파일은 멀쩡히 있는데도 실패한다.
       패키지 루트를 구해 파일 경로로 직접 조립하면 exports 규칙을 타지 않는다. */
    const cli = path.join(path.dirname(pkgPath), rel);
    if (!fs.existsSync(cli)) return { err: "noCli", cli };
    return { cli, ver: pkg.version };
  } catch (e) {
    return { err: "broken", msg: e.message };
  }
}
function pwRun(args, label) {
  const pw = playwright();
  if (pw.err) {
    /* 원인을 구분해서 알린다 — '설치하세요'만 반복하면 이미 설치한 사람은 길을 잃는다 */
    if (pw.err === "notInstalled") {
      log(`${C.red}✗ playwright 가 설치되어 있지 않습니다.${C.r}`);
      log(`${C.d}  proba-cli 폴더에서 ${C.r}npm install${C.d} 을 실행하세요.${C.r}`);
    } else if (pw.err === "noCli") {
      log(`${C.red}✗ playwright CLI 파일이 없습니다: ${C.r}${pw.cli}`);
      log(`${C.d}  node_modules 를 지우고 ${C.r}npm install${C.d} 을 다시 실행하세요.${C.r}`);
    } else {
      log(`${C.red}✗ playwright 로딩 실패:${C.r} ${pw.msg}`);
    }
    process.exit(1);
  }
  return spawnSync(process.execPath, [pw.cli, ...args], { stdio: "inherit" });
}

/* ── codegen 실행 ── */
function runCodegen(o) {
  const url = o.url;
  const outSpec = path.join(os.tmpdir(), "proba-rec-" + Date.now() + ".spec.ts");
  const pw = playwright();
  if (pw) log(`${C.d}› Playwright ${pw.ver} (고정)${C.r}`);

  if (!o["skip-install"]) {
    log(`${C.d}› Chromium 확인 중… (최초 1회만 내려받습니다)${C.r}`);
    pwRun(["install", "chromium"]);
  }

  const cg = ["codegen", "-o", outSpec, "--target", "playwright-test"];

  // 로그인 상태 재사용 — 이전 녹화에서 저장한 게 있으면 로드, 이번 것도 저장
  let auth = null;
  if (!o["no-auth"]) {
    const host = (() => { try { return new URL(url).host.replace(/[^a-z0-9.-]/gi, "_"); } catch (e) { return "default"; } })();
    auth = o.auth || path.join(os.homedir(), ".proba", host + ".json");
    fs.mkdirSync(path.dirname(auth), { recursive: true });
    if (fs.existsSync(auth)) { cg.push("--load-storage", auth); log(`${C.d}› 저장된 로그인 상태 사용: ${auth}${C.r}`); }
    else log(`${C.d}› 저장된 로그인 상태 없음 — 브라우저에서 직접 로그인하세요 (다음 녹화부터 재사용)${C.r}`);
    cg.push("--save-storage", auth);
  }
  cg.push("--viewport-size", String(o.viewport || "1280,720").replace("x", ","));
  cg.push(url);

  log(`\n${C.b}▶ 브라우저를 엽니다.${C.r} 조작이 끝나면 ${C.b}브라우저 창을 닫으세요.${C.r}`);
  log(`${C.d}  검증을 넣으려면 툴바의 과녁 아이콘을 켜고 요소를 클릭하세요.${C.r}\n`);

  const r = pwRun(cg);
  if (r.status !== 0 && !fs.existsSync(outSpec)) {
    log(`${C.red}✗ codegen 실행 실패${C.r}`);
    process.exit(1);
  }
  return outSpec;
}

/* ── 결과 출력 ── */
function report(src, base, outFile, accts) {
  const { steps, stats } = parseSpec(src, base, accts);

  log(`\n${C.b}── 캡처된 스텝 ──${C.r}`);
  steps.forEach((s, i) => {
    const n = String(i + 1).padStart(2, " ");
    if (s.act === "코드 스텝") {
      log(`${C.d}${n}${C.r} ${C.y}코드 스텝${C.r} ${C.d}(파싱 불가 · 원본 보존)${C.r}`);
      s.code.split("\n").forEach((l) => log(`   ${C.d}│ ${l}${C.r}`));
    } else {
      const act = s.act.padEnd(6, " ");
      const col = s.act.includes("검증") ? C.y : C.c;
      log(`${C.d}${n}${C.r} ${col}${act}${C.r} ${s.loc}${s.val && s.val !== "-" ? "   " + C.d + s.val + C.r : ""}`);
    }
  });

  const ok = stats.coverage >= 80 ? C.g : stats.coverage >= 50 ? C.y : C.red;
  log(`\n${C.b}── 파서 결과 ──${C.r}`);
  log(`  문장 ${stats.statements}개 → 스텝 ${steps.length}개`);
  log(`  변환 ${stats.mapped}  ·  코드 스텝으로 보존 ${stats.unmapped}`);
  log(`  커버리지 ${ok}${stats.coverage}%${C.r}`);
  if (stats.unknown.length) {
    log(`\n${C.d}  변환하지 못한 문장 (파서 개선 후보):${C.r}`);
    [...new Set(stats.unknown)].slice(0, 12).forEach((u) => log(`${C.d}   · ${u}${C.r}`));
  }

  fs.writeFileSync(outFile, JSON.stringify({ base, steps, stats: { ...stats, unknown: undefined } }, null, 2), "utf8");
  log(`\n${C.g}✓${C.r} ${outFile} 저장`);
}

/* ── main ── */
const o = args(process.argv.slice(2));
const cmd = o._[0];

if (!cmd || o.help || o.h) { log(HELP); process.exit(0); }

// 계정 풀 — 실제로는 세션 정보에서 받는다. 비밀번호 '실값'은 받지 않는다(변수 메뉴 소관).
const accts = String(o.acct || "").split(",").map((s) => s.trim()).filter(Boolean).map((acct) => ({ acct }));

if (cmd === "record") {
  if (!o.url) { log(`${C.red}--url 이 필요합니다${C.r}\n${HELP}`); process.exit(1); }
  const base = o.base || (() => { try { const u = new URL(o.url); return u.origin; } catch (e) { return ""; } })();
  const spec = runCodegen(o);
  const src = fs.readFileSync(spec, "utf8");
  log(`\n${C.d}── codegen 원본 (${spec}) ──${C.r}`);
  log(C.d + src.trim() + C.r);
  report(src, base, path.resolve(o.out || "steps.json"), accts);
} else if (cmd === "parse") {
  const file = o._[1];
  if (!file || !fs.existsSync(file)) { log(`${C.red}파일을 찾을 수 없습니다${C.r}\n${HELP}`); process.exit(1); }
  report(fs.readFileSync(file, "utf8"), o.base || "", path.resolve(o.out || "steps.json"), accts);
} else {
  log(`${C.red}알 수 없는 명령: ${cmd}${C.r}\n${HELP}`);
  process.exit(1);
}
