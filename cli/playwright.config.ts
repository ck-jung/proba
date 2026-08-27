import { defineConfig } from '@playwright/test';

/* 생성물을 바로 돌려보기 위한 최소 설정.
   실 제품에서는 러너가 이 설정을 실행 요청(대상 환경·브라우저·해상도)에서 만들어 낸다 —
   여기 있는 것은 손으로 확인할 때 쓰는 것이다.

   baseURL 을 여기서 받는 이유: 스텝의 경로는 상대경로다(파서가 그렇게 저장한다).
   그래야 같은 케이스를 스테이징·운영에 그대로 돌릴 수 있다. */

/* 🔑 해상도도 여기가 정한다 — 케이스가 아니다.
   파서는 codegen 이 내는 test.use({ viewport: … }) 를 일부러 버린다(parse.js 참고).
   해상도는 "이 케이스가 무엇을 검증하는가"가 아니라 "어떤 조건에서 돌릴 것인가"라서다.
   그런데 버리기만 하고 여기서 받지 않으면 녹화 해상도와 실행 해상도가 어긋난다 —
   반응형 사이트는 그 차이만으로 메뉴가 접혀 로케이터가 안 보이고 실패한다.

   PROBA_VIEWPORT="1920x1080"  (x 또는 , 둘 다 받는다. 형식이 틀리면 기본값)
   실 제품에서는 러너가 실행 요청의 해상도를 이 자리에 채운다. */
function viewport() {
  const m = String(process.env.PROBA_VIEWPORT || '').match(/^\s*(\d+)\s*[x,]\s*(\d+)\s*$/i);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : { width: 1280, height: 720 };
}

export default defineConfig({
  testDir: './example',
  timeout: 30_000,

  /* 🔑 아래 use 가 trace 와 screenshot 을 남기라고 한다. 리포터가 없으면 그것들이
     test-results/ 에 쌓이기만 하고 볼 수단이 없다 — 남기라고 시켜놓고 못 보는 반쪽이 된다.
     그래서 list(터미널)와 html(파일)을 같이 켠다.

     open: 'never' 인 이유 — 기본값은 실패하면 브라우저를 자동으로 띄우고 그 자리에서
     서버가 대기한다. 명령이 안 끝난 것처럼 보여 시연 중에 당황한다. 볼 때만 연다:
       npx playwright show-report

     실 제품의 리포터는 이것이 아니다. 러너가 Playwright Reporter API 로 결과를 받아
     PROBA 서버로 올린다(실패 원인 분류가 거기 붙는다). 여기 html 은 손으로 확인할 때
     쓰는 것이고, "리포터를 어떻게 붙이는가"의 최소 예시이기도 하다. */
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.PROBA_BASE_URL || 'https://demo.playwright.dev/todomvc',
    viewport: viewport(),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
