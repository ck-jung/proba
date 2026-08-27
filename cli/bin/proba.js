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

/* 🔑 출력 파일을 쓰기 전에 폴더를 만든다.
   없으면 fs 가 ENOENT 스택 트레이스를 통째로 뱉는다 — 사용자는 "왜 죽었지" 만 남는다.

   🔑 안내는 --out 을 준 경우에만 한다. 기본 경로는 cwd 와 무관한데(gen 은 패키지 기준)
      "--out 은 지금 폴더 기준" 이라고 하면 주지도 않은 옵션을 탓하며 엉뚱한 폴더를
      가리킨다. 틀린 안내는 안내가 없는 것보다 나쁘다 — 그쪽으로 찾아 나서게 만든다. */
function writeOut(file, data, gaveOut) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data, "utf8");
  } catch (e) {
    log(`${C.red}저장하지 못했습니다: ${file}${C.r}`);
    log(`${C.d}  ${e.message}${C.r}`);
    if (gaveOut) log(`${C.d}  --out 은 지금 폴더(${process.cwd()}) 기준입니다.${C.r}`);
    process.exit(1);
  }
}

const HELP = `
${C.b}PROBA 레코딩 CLI${C.r}  v0.1

  ${C.c}proba record${C.r} --url <URL> [옵션]      브라우저를 띄워 녹화 → 스텝 추출
  ${C.c}proba parse${C.r}   <파일.spec.ts> [옵션]   이미 있는 codegen 출력을 파싱만
  ${C.c}proba gen${C.r}     <steps.json> [옵션]     스텝 → 실행 가능한 .spec.ts

옵션
  --url <URL>          녹화 시작 주소 (record)
  --base <URL>         상대경로 기준 base. 미지정 시 --url 의 origin
  --out <파일>          record·parse: 스텝 저장 경로 (기본 ./steps.json)
                       gen: .spec.ts 저장 경로 (기본 example/case.spec.ts — 러너가 보는 곳)
  --auth <파일>         로그인 상태 재사용/저장 (기본: ~/.proba/<host>.json)
  --no-auth            로그인 상태 저장/로드 안 함
  --viewport <WxH>     기본 1280x720 (실행 해상도와 맞추세요)
  --acct <id,id>       계정 풀 — 입력값이 일치하면 \${계정 ID}로 치환
  --skip-install       Chromium 자동 설치 건너뜀
  --flat               gen: test.step() 으로 감싸지 않음 (디버그·왕복 확인용)

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

/* ── 결과 출력 ──
   화면에 찍기만 한다. 저장은 하지 않는다 — 아래 parseAndSave 가 순서를 잡는다.
   outFile 을 받는 이유는 쓰기 위해서가 아니라 "그 파일을 열어 확인하라"고 말하기 위해서다. */
function printReport(steps, stats, outFile) {
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

  /* 🔑 비밀번호를 치환했다면 알린다. 그리고 못 잡았을 수도 있다는 것까지 말한다 —
     판단 기준이 로케이터의 힌트(비밀번호·password 등)라, 힌트가 없는 화면은 못 잡는다. */
  if (stats.redacted) log(`\n${C.y}  비밀번호로 보이는 입력 ${stats.redacted}건을 \${계정 비밀번호} 로 바꿨습니다${C.r}`);

  /* 🔑 ID 는 생김새로 알 수 없다 — --acct 로 알려줘야만 치환된다.
     로그인을 녹화했는데 안 알려주면 녹화한 사람의 계정이 케이스에 박히고,
     실행 시 계정 풀이 아니라 그 계정으로 로그인을 시도한다(반복되면 계정이 잠긴다). */
  if (stats.sawPw && !stats.acctGiven) {
    log(`\n${C.red}  ⚠ 로그인이 포함된 녹화인데 --acct 를 주지 않았습니다${C.r}`);
    log(`${C.d}     아이디가 그대로 케이스에 남습니다. 실행 시 계정 풀이 아니라`);
    log(`     그 아이디로 로그인해 계정이 잠길 수 있습니다.${C.r}`);
    log(`${C.d}     다시 녹화하거나, 저장된 파일에서 아이디를 \${계정 ID} 로 바꾸세요:`);
    log(`       proba record --url … ${C.c}--acct qa_user01${C.r}`);
  }
  if (stats.unmapped) {
    log(`\n${C.y}  ⚠ 코드 스텝에는 녹화 원본이 그대로 들어갑니다.${C.r}`);
    log(`${C.d}     로그인이 포함된 녹화라면 ${outFile} 을 열어 남은 값이 없는지 확인하세요.${C.r}`);
    log(`${C.d}     (치환은 로케이터에 '비밀번호'·password 같은 힌트가 있을 때만 걸립니다)${C.r}`);
  }

}

/* 파싱 → 출력 → 저장. record 와 parse 가 공유하는 순서다.
   🔑 unknown 은 저장하지 않는다 — 화면에서 파서 개선 후보를 보여주려고 모은 것이지
      케이스의 일부가 아니다. 남기면 녹화 원본이 파일에 한 벌 더 생긴다. */
function parseAndSave(src, base, outFile, accts, gaveOut) {
  const { steps, stats } = parseSpec(src, base, accts);
  printReport(steps, stats, outFile);
  writeOut(outFile, JSON.stringify({ base, steps, stats: { ...stats, unknown: undefined } }, null, 2), gaveOut);
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
  parseAndSave(src, base, path.resolve(o.out || "steps.json"), accts, !!o.out);
} else if (cmd === "parse") {
  const file = o._[1];
  if (!file || !fs.existsSync(file)) { log(`${C.red}파일을 찾을 수 없습니다${C.r}\n${HELP}`); process.exit(1); }
  parseAndSave(fs.readFileSync(file, "utf8"), o.base || "", path.resolve(o.out || "steps.json"), accts, !!o.out);
} else if (cmd === "gen") {
  /* 스텝 → .spec.ts.
     🔑 실 제품에서는 이 생성기를 서버가 소유한다 — 여기 있는 것은 참고 구현이고,
        서버 없이 스텝만으로 결과를 눈으로 확인하려는 용도다. */
  const file = o._[1];
  if (!file || !fs.existsSync(file)) { log(`${C.red}파일을 찾을 수 없습니다${C.r}\n${HELP}`); process.exit(1); }
  const { generateSpec } = require("../src/generate");
  let data;
  try { data = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { log(`${C.red}JSON 을 읽지 못했습니다: ${e.message}${C.r}`); process.exit(1); }
  // record/parse 가 내는 형태와 케이스 형태를 둘 다 받는다
  const c = Array.isArray(data) ? { steps: data } : (data.steps ? data : { steps: [] });
  const r = generateSpec(c, { wrap: !o.flat });
  /* 🔑 기본 출력은 playwright.config 의 testDir 안이다.
     기본값으로 냈는데 러너가 못 찾으면 그건 기본값이 틀린 것이다 —
     실제로 지금 폴더에 떨어뜨렸다가 'No tests found' 를 밟았다.
     cwd 가 아니라 이 패키지 기준으로 잡는다. 어디서 실행해도 같은 곳에 떨어진다. */
  const out = o.out ? path.resolve(o.out) : path.join(__dirname, "..", "example", "case.spec.ts");
  writeOut(out, r.code, !!o.out);
  log(`\n${C.d}── 생성 결과 (${out}) ──${C.r}`);
  log(r.code.trim());
  log(`\n스텝 ${r.stats.steps} · 변환 ${C.g}${r.stats.emitted}${C.r}` +
      (r.stats.skipped ? ` · ${C.red}미변환 ${r.stats.skipped}${C.r}` : ""));
  r.stats.notes.forEach((n) => log(`  ${C.red}⚠${C.r} ${n}`));
  /* --out 을 준 경우에만 파일명을 붙인다 — 기본 위치면 그냥 npx playwright test 로 돈다 */
  const how = o.out ? `npx playwright test ${path.basename(out)}` : "npx playwright test";
  log(`\n실행하려면 playwright.config 의 baseURL 을 대상 환경으로 두고:  ${C.c}${how}${C.r}`);
} else {
  log(`${C.red}알 수 없는 명령: ${cmd}${C.r}\n${HELP}`);
  process.exit(1);
}
