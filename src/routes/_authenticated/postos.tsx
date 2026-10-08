import { createFileRoute, redirect } from "@tanstack/react-router";

/** Postos fora do escopo do beta: sempre volta para o Início. */
export const Route = createFileRoute("/_authenticated/postos")({
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
});
