// @lovable.dev/vite-tanstack-config inclui: tanstackStart, viteReact, tailwindcss, tsConfigPaths,
// nitro (no build; na Vercel o preset vem de NITRO_PRESET=vercel, em vercel.json), VITE_* env e alias @.
// Não adicione esses plugins manualmente, ou eles ficam duplicados.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Entrada do servidor em src/server.ts (tratamento de erros do SSR).
    server: { entry: "server" },
  },
});
