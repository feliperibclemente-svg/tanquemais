import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de interface dos fluxos críticos (cadastro, abastecer, histórico), num celular
 * simulado. O Supabase é simulado no navegador (tests/e2e/fixtures.ts): nada é gravado
 * de verdade. Rodar: bunx playwright test
 */
const PORT = 4519;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices["Pixel 7"],
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `bunx vite dev --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
