import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 프로젝트 사이트 — 저장소 이름과 반드시 같아야 한다.
  // 저장소를 바꾸면 여기도 바꾸고 다시 빌드해야 한다(안 그러면 자산이 404 나고 흰 화면).
  base: "/proba/",
  server: { port: 5173, open: true },
});
