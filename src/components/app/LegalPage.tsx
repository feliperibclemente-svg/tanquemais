import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "@/components/app/Logo";

/** Layout simples das páginas legais, no mesmo padrão da landing. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-6 py-10">
      <Link to="/" className="flex items-center gap-2">
        <Logo className="h-8" />
      </Link>
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Versão beta · atualizado em outubro de 2026
      </p>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-foreground [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}
