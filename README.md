# PROBA — 통합 QA 자동화 플랫폼 목업

> Prove every release

LQA · FQA · PQA · NQA 네 도메인을 하나의 플랫폼으로 묶은 화면 목업입니다.
설계 검토용이며 실제 테스트를 실행하지 않습니다 — 모든 데이터는 시드입니다.

## 실행

Node.js 18 이상이 필요합니다 (20 LTS 권장).

```powershell
npm install
npm run dev
```

http://localhost:5173 이 열립니다. 종료는 `Ctrl + C`.

## 빌드

```powershell
npm run build      # dist/ 생성
npm run preview    # 빌드 결과 확인
```

## 구성

```
src/
  App.jsx           앱 셸 — 상단바 · 사이드바 · 라우팅 · 전역 상태
  common/
    ui.jsx          UI 프리미티브 단일 출처 (Card · Btn · Badge · Modal · Portal)
    theme.js        색상 팔레트 · 판정 → 배지 매핑
    console.jsx     관리자 콘솔
  lqa/              AI 품질 — LLM Judge 기반 챗봇 평가
  fqa/              기능 QA — Playwright 기반 웹·API 테스트
  pqa/              앱 성능 — Macrobenchmark 기반 단말 측정
  nqa/              부하 — k6 기반 성능 테스트
```

스택은 Vite + React 18 + Tailwind CSS v3, 아이콘은 lucide-react, 차트는 recharts입니다.

## 관련 저장소

- [comesample/proba-cli](https://github.com/comesample/proba-cli) — 레코딩 CLI. Playwright codegen 출력을 PROBA 스텝으로 변환합니다.
