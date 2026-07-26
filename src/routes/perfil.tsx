import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Car, Download, LifeBuoy, Moon, Wrench } from "lucide-react";
import { Card, MobileShell, PageTitle } from "@/components/MobileShell";
import { brl, num, summary, THEME_KEY, useFillups, useProfile, useVehicles } from "@/lib/tanque";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil e configurações — Tanque+" },
      { name: "description", content: "Seus veículos, quilometragem total, gasto acumulado, tema e exportação de dados." },
      { property: "og:title", content: "Perfil — Tanque+" },
      { property: "og:description", content: "Gerencie veículos, tema claro/escuro e exporte seus dados." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const profile = useProfile();
  const vehicles = useVehicles();
  const fillups = useFillups();
  const s = summary(fillups.value);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile: profile.value, vehicles: vehicles.value, fillups: fillups.value }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tanque-mais-dados.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MobileShell>
      <PageTitle title="Perfil" />
      <div className="space-y-4">
        <Card className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-xl font-semibold text-primary">
            {(profile.value.name || "T").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="font-semibold text-foreground">{profile.value.name || "Motorista"}</p>
            <p className="text-xs text-muted-foreground">Membro do Tanque+</p>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Quilometragem total</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{num(s.km, 0)} km</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Gasto no app</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{brl(s.totalSpend)}</p>
          </Card>
        </div>

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Veículos</p>
          {vehicles.value.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
              <Car className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {v.brand} {v.model} {v.year}
                </p>
                <p className="text-xs text-muted-foreground">
                  {v.engine} · {v.fuel} · {v.transmission}
                </p>
              </div>
            </div>
          ))}
        </Card>

        <Card className="divide-y divide-border p-0">
          <button onClick={toggleTheme} className="flex w-full items-center justify-between px-5 py-4">
            <span className="flex items-center gap-3 text-sm text-foreground">
              <Moon className="h-4 w-4 text-muted-foreground" /> Tema escuro
            </span>
            <span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${dark ? "bg-primary" : "bg-border"}`}>
              <span className={`block h-5 w-5 rounded-full bg-card transition-transform ${dark ? "translate-x-5" : ""}`} />
            </span>
          </button>
          <button onClick={exportData} className="flex w-full items-center gap-3 px-5 py-4 text-sm text-foreground">
            <Download className="h-4 w-4 text-muted-foreground" /> Exportar dados
          </button>
          <a href="mailto:suporte@tanquemais.app" className="flex items-center gap-3 px-5 py-4 text-sm text-foreground">
            <LifeBuoy className="h-4 w-4 text-muted-foreground" /> Suporte
          </a>
        </Card>

        <Card className="flex items-start gap-3">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Em breve: manutenção, IPVA, seguro, troca de óleo e pneus — o Tanque+ vai virar seu hub de gestão
            automotiva.
          </p>
        </Card>

        <Link
          to="/economia"
          className="flex items-center justify-center rounded-3xl border border-border bg-card px-6 py-4 text-sm font-semibold text-foreground"
        >
          Ver economia
        </Link>
      </div>
    </MobileShell>
  );
}
