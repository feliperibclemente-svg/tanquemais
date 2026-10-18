import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CircleAlert, CircleCheck, ClipboardCheck, Share2, Wrench } from "lucide-react";
import {
  Action,
  ActionLink,
  AppCard,
  AppShell,
  ChoiceGroup,
  EmptyState,
  NumericField,
  PageHeader,
  ScreenSkeleton,
  maskInteger,
  parseDecimal,
} from "@/components/ds";
import { TeoSays } from "@/components/app/Teo";
import { useHomeData, useSaveCheckup } from "@/hooks/use-tanque";
import { vehicleKind, vehicleName, vehicleWords } from "@/constants/vehicles";
import {
  CHECKUP_DISCLAIMER,
  oilIntervalOptions,
  questionsFor,
  type CheckupFinding,
} from "@/content/checkup";
import {
  consumptionDrop,
  evaluateCheckup,
  oilStatus,
  workshopSummary,
  type CheckupAnswers,
} from "@/services/checkup";
import { num } from "@/lib/format";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/checkup")({
  head: () => ({
    meta: [
      { title: "Check-up do veículo — Tanque+" },
      {
        name: "description",
        content: "Perguntas rápidas para saber o que vale pedir para conferir na oficina.",
      },
    ],
  }),
  component: CheckupPage,
});

const OTHER = "outro";
const UNKNOWN = "nao_sei";

function CheckupPage() {
  const { isLoading, primaryVehicle, rows } = useHomeData();
  const save = useSaveCheckup();

  const kind = vehicleKind(primaryVehicle?.brand);
  const words = vehicleWords(primaryVehicle?.brand);
  const questions = useMemo(() => questionsFor(kind), [kind]);

  const currentKm = useMemo(() => {
    const fromRows = Math.max(0, ...rows.map((r) => Number(r.odometer) || 0));
    return Math.max(fromRows, Number(primaryVehicle?.current_odometer) || 0) || null;
  }, [rows, primaryVehicle?.current_odometer]);

  const [answers, setAnswers] = useState<CheckupAnswers>({});
  const [oilKm, setOilKm] = useState<string | null>(null);
  const [oilInterval, setOilInterval] = useState<string | null>(null);
  const [oilIntervalOther, setOilIntervalOther] = useState("");
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    track("checkup_started");
  }, []);

  // Valores já salvos no veículo entram como ponto de partida.
  const savedKm = Number(primaryVehicle?.oil_change_km) || 0;
  const savedInterval = Number(primaryVehicle?.oil_change_interval_km) || 0;
  const intervalChoices = oilIntervalOptions(kind);
  const oilKmValue = oilKm ?? (savedKm ? maskInteger(String(savedKm)) : "");
  const oilIntervalValue =
    oilInterval ??
    (savedInterval
      ? intervalChoices.includes(savedInterval)
        ? String(savedInterval)
        : OTHER
      : "");
  const oilIntervalOtherValue =
    oilInterval === null && savedInterval && !intervalChoices.includes(savedInterval)
      ? maskInteger(String(savedInterval))
      : oilIntervalOther;

  const lastOilKm = parseDecimal(oilKmValue) || null;
  const intervalKm =
    oilIntervalValue === OTHER
      ? parseDecimal(oilIntervalOtherValue) || null
      : oilIntervalValue && oilIntervalValue !== UNKNOWN
        ? Number(oilIntervalValue)
        : null;

  const answered = questions.filter((q) => answers[q.id]).length;
  const complete = answered === questions.length;

  const result = useMemo(
    () =>
      evaluateCheckup({
        questions,
        answers,
        consumption: consumptionDrop(rows),
        oil: oilStatus({ lastKm: lastOilKm, intervalKm, currentKm }),
      }),
    [questions, answers, rows, lastOilKm, intervalKm, currentKm],
  );

  if (isLoading) {
    return (
      <AppShell>
        <ScreenSkeleton cards={3} />
      </AppShell>
    );
  }

  if (!primaryVehicle) {
    return (
      <AppShell>
        <PageHeader title="Check-up" />
        <EmptyState
          emoji="🔧"
          title="Cadastre seu veículo primeiro"
          description="O check-up usa o tipo de veículo e o km do painel."
          action={
            <ActionLink to="/veiculo" size="md" className="mt-1">
              Cadastrar veículo
            </ActionLink>
          }
        />
      </AppShell>
    );
  }

  const name = vehicleName(primaryVehicle);

  async function finish() {
    setShowResult(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const oilChanged = (lastOilKm ?? 0) !== savedKm || (intervalKm ?? 0) !== savedInterval;
    try {
      await save.mutateAsync({
        vehicleId: primaryVehicle!.id,
        answers,
        findings: result.findings.map((f) => f.id),
        odometer: currentKm,
        oil: oilChanged ? { km: lastOilKm, intervalKm } : null,
      });
    } catch {
      toast.error("Não consegui salvar este check-up, mas o resultado está aqui.");
    }
  }

  if (showResult) {
    return (
      <AppShell>
        <PageHeader title="Resultado do check-up" subtitle={name} />
        <CheckupResultView
          findings={result.findings}
          notes={result.notes}
          summary={workshopSummary({
            vehicle: name,
            currentKm,
            findings: result.findings,
            oilLastKm: lastOilKm,
          })}
          onRedo={() => {
            setAnswers({});
            setShowResult(false);
            window.scrollTo({ top: 0 });
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Check-up do veículo" subtitle={name} />

      <TeoSays spot="checkup-intro" mood="tip">
        Me conta o que você tem percebido {words.kind === "moto" ? "na" : "no"} {words.noun}. Leva
        uns 2 minutos. No fim, mostro o que vale conferir e monto um resumo para levar à oficina.
      </TeoSays>

      <AppCard className="mt-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Troca de óleo</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Com o km dos seus abastecimentos, eu aviso quando a próxima estiver chegando.
          </p>
        </div>
        <NumericField
          label="Km da última troca"
          value={oilKmValue}
          onChange={setOilKm}
          inputMode="numeric"
          suffix="km"
          placeholder="Ex.: 41.000"
          hint="Costuma estar na etiqueta da troca ou na nota da oficina. Pode deixar em branco."
        />
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Trocar a cada</p>
          <ChoiceGroup
            label="Intervalo de troca de óleo"
            value={oilIntervalValue}
            onChange={setOilInterval}
            options={[
              ...intervalChoices.map((v) => ({ value: String(v), label: `${num(v, 0)} km` })),
              { value: OTHER, label: "Outro" },
              { value: UNKNOWN, label: "Não sei" },
            ]}
          />
          {oilIntervalValue === OTHER ? (
            <NumericField
              label="Intervalo do manual"
              value={oilIntervalOtherValue}
              onChange={setOilIntervalOther}
              inputMode="numeric"
              suffix="km"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              O intervalo certo está no manual {words.ofThe} e depende do óleo usado.
            </p>
          )}
        </div>
      </AppCard>

      <div className="mt-5 space-y-3">
        {questions.map((q, i) => (
          <AppCard key={q.id} className="space-y-3">
            <p className="text-sm font-medium leading-snug text-foreground">
              <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
              {q.text}
            </p>
            <ChoiceGroup
              label={q.text}
              value={answers[q.id] ?? ""}
              onChange={(value) => setAnswers((a) => ({ ...a, [q.id]: value }))}
              options={q.options.map((o) => ({ value: o.value, label: o.label }))}
            />
          </AppCard>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <Action size="lg" disabled={!complete} onClick={finish}>
          <ClipboardCheck className="h-5 w-5" /> Ver resultado
        </Action>
        {!complete ? (
          <p className="text-center text-xs text-muted-foreground">
            {answered} de {questions.length} respondidas
          </p>
        ) : null}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{CHECKUP_DISCLAIMER}</p>
    </AppShell>
  );
}

function CheckupResultView({
  findings,
  notes,
  summary,
  onRedo,
}: {
  findings: CheckupFinding[];
  notes: string[];
  summary: string;
  onRedo: () => void;
}) {
  const urgent = findings.filter((f) => f.severity === "urgente");
  const check = findings.filter((f) => f.severity === "conferir");

  async function shareSummary() {
    track("checkup_summary_shared");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Resumo para a oficina", text: summary });
        return;
      }
    } catch {
      /* cancelado: cai para copiar */
    }
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Resumo copiado. É só colar na conversa com a oficina.");
    } catch {
      toast.error("Não consegui copiar. Selecione o texto e copie manualmente.");
    }
  }

  return (
    <div className="space-y-4">
      {findings.length === 0 ? (
        <TeoSays spot="checkup-ok" mood="cheer" title="Nada de estranho por aqui">
          Pelo que você respondeu, nenhum sinal pede atenção agora. Revisões em dia continuam sendo
          o melhor jeito de evitar surpresas.
        </TeoSays>
      ) : (
        <TeoSays spot="checkup-result" mood="tip">
          {urgent.length
            ? "Tem item que pede atenção antes de rodar. Veja abaixo, e o resumo pronto para mandar à oficina."
            : "Separei o que vale pedir para conferir, com um resumo pronto para mandar à oficina."}
        </TeoSays>
      )}

      {urgent.length ? (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
            <CircleAlert className="h-4 w-4" strokeWidth={2.4} /> Procure ajuda antes de rodar
          </h2>
          {urgent.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </section>
      ) : null}

      {check.length ? (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Wrench className="h-4 w-4" strokeWidth={2.4} /> Vale pedir para conferir
          </h2>
          {check.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </section>
      ) : null}

      {notes.length ? (
        <AppCard className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Para observar</p>
          {notes.map((n) => (
            <p key={n} className="text-sm text-muted-foreground">
              {n}
            </p>
          ))}
        </AppCard>
      ) : null}

      {findings.some((f) => f.ask) ? (
        <AppCard className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Resumo para levar à oficina</p>
          <pre className="whitespace-pre-wrap rounded-2xl bg-muted/60 p-3 font-sans text-sm leading-relaxed text-foreground">
            {summary}
          </pre>
          <Action variant="secondary" size="md" className="w-full" onClick={shareSummary}>
            <Share2 className="h-4 w-4" /> Enviar ou copiar resumo
          </Action>
        </AppCard>
      ) : null}

      <div className="space-y-2">
        <ActionLink to="/dashboard" size="md" variant="secondary" className="w-full">
          <CircleCheck className="h-4 w-4" /> Voltar ao Painel
        </ActionLink>
        <Action variant="ghost" size="md" className="w-full" onClick={onRedo}>
          Refazer o check-up
        </Action>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{CHECKUP_DISCLAIMER}</p>
    </div>
  );
}

function FindingCard({ finding }: { finding: CheckupFinding }) {
  const urgent = finding.severity === "urgente";
  return (
    <AppCard className={urgent ? "border-destructive/30 bg-destructive/5" : undefined}>
      <p className={`text-sm font-semibold ${urgent ? "text-destructive" : "text-foreground"}`}>
        {finding.title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-foreground">{finding.body}</p>
      {finding.ask ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Peça para <span className="font-semibold text-foreground">{finding.ask}</span>.
        </p>
      ) : null}
    </AppCard>
  );
}
