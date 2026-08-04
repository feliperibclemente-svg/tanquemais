import { defineConfig, loadEnv } from "vite";

// Carrega o .env do projeto para os testes de permissão (RLS/GRANTs).
const env = loadEnv("test", process.cwd(), "");
Object.assign(process.env, env);

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
