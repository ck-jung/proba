# PROBA 레코딩 CLI (v0.1 · 단독 실행판)

Playwright `codegen`으로 브라우저를 녹화하고, 그 출력을 **PROBA 스텝**으로 변환합니다.

이 버전은 **플랫폼 없이 단독으로** 돕니다. 확인하려는 건 하나입니다 —
**파서가 뽑아낸 스텝이 실제로 쓸 만한가.**

---

## 실행

Node.js 18 이상이 필요합니다.

```powershell
cd "proba-cli"

# 1) 녹화 — 브라우저가 열립니다. 조작 후 브라우저 창을 닫으세요.
node bin/proba.js record --url https://demo.playwright.dev/todomvc

# 2) 이미 있는 codegen 출력만 파싱
node bin/proba.js parse ./rec.spec.ts --base https://stg.tworld.co.kr

# 3) 스텝 → 실행 가능한 .spec.ts
node bin/proba.js gen ./steps.json --out case.spec.ts
```

## 생성물을 실제로 돌려보기

```powershell
cd cli
npm install                      # @playwright/test 포함
npx playwright install chromium  # 브라우저 (최초 1회)

npm run demo                     # 예제 스텝 → 생성 → 실행
```

`example/todomvc.steps.json` 을 Playwright 공식 데모(TodoMVC)에 대고 돌립니다.
다른 대상은 환경변수로 바꿉니다.

```powershell
$env:PROBA_BASE_URL = "https://stg.example.com"
npm run demo
```

**목업 저장소 루트(`C:\Data\proba`)에서는 돌지 않습니다.** 거기는 Vite/React 앱이라
`playwright.config` 도 `@playwright/test` 도 없습니다. 반드시 `cli/` 에서 실행하세요.

경로는 상대경로이고 `baseURL` 이 받습니다 — 그래야 같은 케이스를 스테이징·운영에
그대로 돌릴 수 있습니다.

`npm link` 하면 `proba record …` 로도 실행됩니다.

### 옵션

| 옵션 | 설명 |
|---|---|
| `--url <URL>` | 녹화 시작 주소 |
| `--base <URL>` | 상대경로 기준. 미지정 시 `--url`의 origin |
| `--out <파일>` | 스텝 저장 경로 (기본 `./steps.json`) |
| `--auth <파일>` | 로그인 상태 파일 (기본 `~/.proba/<host>.json`) |
| `--no-auth` | 로그인 상태 저장/로드 안 함 |
| `--viewport <WxH>` | 기본 `1280x720` |
| `--skip-install` | Chromium 자동 설치 건너뜀 |

**최초 실행 시** Chromium을 자동으로 내려받습니다 (2~3분).
**로그인 상태**는 `~/.proba/`에 저장되어 다음 녹화에서 재사용됩니다 (`--save-storage` / `--load-storage`).

---

## 녹화 중

- 브라우저에서 그냥 **평소처럼 조작**하면 됩니다.
- **검증**을 넣으려면 Playwright Inspector 툴바에서 과녁 아이콘을 켜고 요소를 클릭합니다
  (`assert visibility` / `assert text` / `assert value`).
- **브라우저 창을 닫으면** 녹화가 끝나고 파싱이 시작됩니다.

---

## 결과

```
── 캡처된 스텝 ──
 1 이동     /login
 2 입력     [data-testid=username]   "qa_user01"
 3 클릭     role=button[로그인]
 4 화면 검증  text=환영합니다   visible = true
 5 코드 스텝 (파싱 불가 · 원본 보존)
   │ await page.getByRole('checkbox', { name: '약관 동의' }).check();

── 파서 결과 ──
  문장 18개 → 스텝 14개
  변환 11  ·  코드 스텝으로 보존 7
  커버리지 61%
```

**커버리지가 낮아도 결과는 항상 실행 가능합니다.**
변환하지 못한 문장은 버리지 않고 **`코드 스텝`으로 원본을 보존**하기 때문입니다 (손실 0).
파서를 개선할수록 코드 스텝이 줄어들 뿐입니다.

`steps.json`에 스텝이 저장되고, 하단의 **"변환하지 못한 문장"** 목록이 곧 파서 개선 후보입니다.

---

## 구조

```
bin/proba.js     CLI 진입점 — codegen 실행 · 결과 출력
src/dsl.js       스텝 ↔ 코드 매핑 · 단일 출처
src/parse.js     파서     codegen 출력 → 스텝
src/generate.js  생성기   스텝 → .spec.ts

playwright.config.ts  생성물 실행용 최소 설정 (baseURL·브라우저)
example/              예제 스텝 — npm run demo 가 쓴다

test/parse       파서 단위 (22)
test/roundtrip   두 방향이 합의하는가 (14)
test/exec        생성된 코드가 실제로 실행되는가 (8)
test/_stub       가짜 Playwright — 호출을 기록한다
```

브라우저 제어, **로케이터 생성, 고유성 보장, 검증 툴바는 전부 Playwright가 합니다.**
우리가 만든 건 **양방향 변환**뿐입니다.

## 생성기에 대해

`src/generate.js` 는 **참고 구현**입니다. 실 제품에서는 생성기를 **서버가 소유합니다** —
프론트·서버에 이중 구현하면 반드시 어긋납니다. 여기 둔 이유는 두 가지입니다.

1. **스텝 모델이 실제로 실행 가능한지 증명한다.** 스텝만 있으면 `.spec.ts` 를 뽑아
   `npx playwright test` 로 바로 돌려볼 수 있습니다.
2. **앞으로 서버 생성기를 만들 사람의 출발점.** 매핑 표(`src/dsl.js`)와
   놓치기 쉬운 함정이 코드와 주석에 남아 있습니다.

### 왕복 테스트가 두 방향을 묶습니다

```
codegen 출력 → 파서 → 스텝 → 생성기 → spec' → 파서 → 스텝'
                        └────── 같아야 한다 ──────┘
```

`test/roundtrip.test.js` 가 이걸 검사합니다. **한쪽만 고치면 깨집니다** —
사람이 지키는 규칙이 아니라 테스트가 강제하는 규칙입니다.

비교는 **스텝 기준**입니다. 코드는 같지 않아도 됩니다 — `toHaveText` 와 `toContainText` 는
둘 다 스텝 `text = "..."` 이 되고 생성기는 그중 하나로만 되돌립니다. 스텝이 정본이므로 맞습니다.

### 실행 테스트 — 브라우저 없이 진짜로 돌려본다

`test/exec.test.js` 는 생성된 코드를 **실행합니다.** `test/_stub.js` 가 `page`·`request`·`expect`
를 대신하고 호출 목록을 기록합니다. 문법 검사로는 못 잡는 것을 잡습니다.

```
문법 검사   let 이 어디 있든 통과한다
실행 검사   블록 안에 있으면 다음 스텝에서 ReferenceError 로 죽는다
```

실제로 개발 중에 이 버그를 냈고, 이 테스트가 있었다면 바로 잡혔을 것입니다.
지금은 일부러 버그를 되넣으면 이 테스트만 정확히 실패합니다.

브라우저를 띄우는 실행은 이 CLI 의 범위가 아닙니다 —
생성물을 `npx playwright test` 로 돌리면 됩니다.

### 비밀번호 — 코드 스텝은 예외다

파서는 입력값을 `${계정 비밀번호}` 로 바꿉니다. 판단 기준은 **로케이터에 힌트가 있는가**
(`비밀번호`·`password`·`pw` 등)입니다.

**코드 스텝도 같은 규칙으로 훑습니다.** "원본 보존(손실 0)" 원칙의 유일한 예외입니다.
팝업 로그인처럼 파서가 변환하지 못한 구간은 코드 스텝으로 원본이 통째로 들어가는데,
거기에 평문 비밀번호가 남으면 사고입니다. **손실 0 은 편의고 평문 비밀번호는 사고입니다.**

```
로케이터에 힌트 있음   .fill('****')  →  .fill('${계정 비밀번호}')
힌트 없음             손대지 않는다 — 값을 보고 추측하면 정상 입력을 날린다
```

그래서 **힌트가 없는 화면은 못 잡습니다.** 로그인이 포함된 녹화라면 `steps.json` 을
한 번 열어 보세요 — CLI 도 그렇게 안내합니다.

`steps.json` 은 `.gitignore` 대상입니다(저장소 루트·`cli/` 양쪽 모두).

### 놓치기 쉬운 것 두 가지

**코드 스텝은 `test.step()` 으로 감싸지 않습니다.** 코드 스텝끼리 변수를 주고받기 때문입니다
(새 창/팝업이 대표적). 감싸면 블록마다 스코프가 닫혀 `ReferenceError` 로 죽습니다.

**요청 스텝이 저장한 값도 블록 밖에서 선언합니다.** 같은 이유입니다 —
`let orderId;` 를 `test()` 위에 두고 블록 안에서는 대입만 합니다.

### 아직 안 다루는 것

- 데이터 구동(행별 `test()`)과 전제조건(`preCase`) — 서버가 케이스를 조립하는 단계의 일입니다
- 팝업을 스텝으로 다루기 — 지금은 코드 스텝으로 보존됩니다(`src/parse.js` 주석 참고)
