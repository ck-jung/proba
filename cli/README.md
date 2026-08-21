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
```

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
bin/proba.js   CLI 진입점 — codegen 실행 · 결과 출력
src/parse.js   파서 (유일한 실질 작업)
```

브라우저 제어, **로케이터 생성, 고유성 보장, 검증 툴바는 전부 Playwright가 합니다.**
우리가 만든 건 **codegen 출력 → 스텝 변환**뿐입니다.
