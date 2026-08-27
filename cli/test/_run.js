"use strict";
/* ═══════════════════════════════════════════════════════════════════
   테스트 하네스 — 세 테스트 파일이 같은 것을 쓰게 한다

   프레임워크를 쓰지 않는 이유: 이 CLI 는 의존성이 playwright 하나뿐이고
   그 하나를 정확한 버전으로 고정하는 것이 중요하다(codegen 출력 포맷이 바뀌면
   파서가 조용히 깨진다). 테스트 러너를 더 얹으면 그 고정이 흐려진다.

   🔑 t() 는 동기·비동기를 둘 다 받는다.
      fn 이 값을 돌려주면 그 자리에서 끝내고(동기), Promise 를 돌려주면 기다린다.
      호출부는 필요할 때만 await 하면 되고, 동기 테스트는 실행 순서가 그대로 유지된다.
      섞어 쓰면 출력 순서가 뒤집히므로 한 파일 안에서는 한쪽으로 통일할 것.
   ═══════════════════════════════════════════════════════════════════ */

const G = "\x1b[32m", R = "\x1b[31m", X = "\x1b[0m";

function suite() {
  let pass = 0, fail = 0;

  const ok = (name) => { pass++; console.log("  " + G + "✓" + X + " " + name); };
  const no = (name, e) => { fail++; console.log("  " + R + "✗" + X + " " + name + "\n    " + (e && e.message)); };

  function t(name, fn) {
    let r;
    try { r = fn(); }
    catch (e) { no(name, e); return Promise.resolve(); }
    if (r && typeof r.then === "function") return r.then(() => ok(name), (e) => no(name, e));
    ok(name);
    return Promise.resolve();
  }

  /* note 는 요약 뒤에 붙는 한 마디 (예: 커버리지). 없으면 생략한다. */
  function done(note) {
    console.log("\n" + (fail ? R : G) + pass + " passed, " + fail + " failed" + X +
                (note ? "  (" + note + ")" : "") + "\n");
    process.exit(fail ? 1 : 0);
  }

  return { t, done, count: () => ({ pass, fail }) };
}

module.exports = { suite };
