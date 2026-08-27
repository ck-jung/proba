import { defineConfig } from '@playwright/test';

/* 생성물을 바로 돌려보기 위한 최소 설정.
   실 제품에서는 러너가 이 설정을 실행 요청(대상 환경·브라우저·해상도)에서 만들어 낸다 —
   여기 있는 것은 손으로 확인할 때 쓰는 것이다.

   baseURL 을 여기서 받는 이유: 스텝의 경로는 상대경로다(파서가 그렇게 저장한다).
   그래야 같은 케이스를 스테이징·운영에 그대로 돌릴 수 있다. */
export default defineConfig({
  testDir: './example',
  timeout: 30_000,
  use: {
    baseURL: process.env.PROBA_BASE_URL || 'https://demo.playwright.dev/todomvc',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
