import type { VehicleKind } from "@/constants/vehicles";

/**
 * Check-up do Teo: perguntas rápidas sobre sinais que a pessoa percebe no dia a dia.
 * Conteúdo escrito e revisado por nós (não gerado por IA). Regras de tom:
 * - nunca diagnosticar: "pode ser", "vale pedir para conferir";
 * - sinais de risco (freio, temperatura, cheiro de combustível, pneu danificado) viram alerta
 *   para não rodar, e não dica;
 * - sem preço de conserto e sem indicar oficina.
 */

export type Severity = "urgente" | "conferir";

export interface CheckupFinding {
  id: string;
  severity: Severity;
  title: string;
  /** Por que importa, em uma ou duas frases. */
  body: string;
  /** O que pedir na oficina (vai para o resumo). Vazio quando não se aplica. */
  ask: string;
  /** Sintoma, como entra no resumo para a oficina. */
  symptom?: string;
}

export interface CheckupOption {
  value: string;
  label: string;
  finding?: Omit<CheckupFinding, "id">;
  /** Orientação neutra (ex.: para "Não sei"); não conta como problema. */
  note?: string;
}

export interface CheckupQuestion {
  id: string;
  for: VehicleKind | "todos";
  text: string;
  options: CheckupOption[];
}

const NO = { value: "nao", label: "Não" };
const DONT_KNOW = { value: "nao_sei", label: "Não sei" };

const yesNo = (finding: Omit<CheckupFinding, "id">, dontKnowNote?: string): CheckupOption[] => [
  NO,
  { value: "sim", label: "Sim", finding },
  dontKnowNote ? { ...DONT_KNOW, note: dontKnowNote } : DONT_KNOW,
];

export const CHECKUP_QUESTIONS: readonly CheckupQuestion[] = [
  {
    id: "luz_alerta",
    for: "todos",
    text: "Alguma luz de alerta fica acesa no painel com o motor ligado?",
    options: [
      NO,
      {
        value: "amarela",
        label: "Sim, amarela",
        finding: {
          severity: "conferir",
          title: "Luz de alerta amarela acesa",
          body: "Luz amarela costuma indicar algo para verificar em breve, como injeção, ABS ou airbag. O manual mostra o que cada símbolo significa.",
          ask: "fazer a leitura dos códigos de falha com o scanner",
          symptom: "luz de alerta amarela acesa no painel",
        },
      },
      {
        value: "vermelha",
        label: "Sim, vermelha",
        finding: {
          severity: "urgente",
          title: "Luz de alerta vermelha acesa",
          body: "Luz vermelha costuma indicar algo que pede parada: pressão do óleo, temperatura, freio ou carga da bateria. Pare em local seguro e confira no manual antes de seguir.",
          ask: "verificar a causa da luz vermelha no painel",
          symptom: "luz de alerta vermelha acesa no painel",
        },
      },
      {
        ...DONT_KNOW,
        note: "Ao ligar o motor, as luzes do painel acendem e devem apagar em poucos segundos. Se alguma continuar acesa, vale conferir.",
      },
    ],
  },
  {
    id: "freio_ruido",
    for: "todos",
    text: "Ouve chiado ou rangido ao frear?",
    options: yesNo({
      severity: "conferir",
      title: "Chiado ao frear",
      body: "Pode ser desgaste das pastilhas ou dos discos de freio. Quanto antes conferir, menor costuma ser o estrago.",
      ask: "verificar pastilhas e discos de freio",
      symptom: "chiado ou rangido ao frear",
    }),
  },
  {
    id: "freio_pedal",
    for: "carro",
    text: "O pedal do freio está mais mole, mais baixo ou o carro demora mais para parar?",
    options: yesNo({
      severity: "urgente",
      title: "Freio respondendo diferente",
      body: "Freio com resposta diferente não deve esperar. Evite rodar e leve para conferir o quanto antes.",
      ask: "verificar o sistema de freio e o fluido de freio",
      symptom: "pedal do freio mais mole ou mais baixo",
    }),
  },
  {
    id: "freio_manete",
    for: "moto",
    text: "O manete ou o pedal do freio está mais mole, mais longo ou a moto demora mais para parar?",
    options: yesNo({
      severity: "urgente",
      title: "Freio respondendo diferente",
      body: "Freio com resposta diferente não deve esperar. Evite rodar e leve para conferir o quanto antes.",
      ask: "verificar o sistema de freio, o fluido e o cabo (se houver)",
      symptom: "freio mais mole ou com curso mais longo",
    }),
  },
  {
    id: "direcao",
    for: "carro",
    text: "O volante puxa para um lado ou vibra?",
    options: yesNo({
      severity: "conferir",
      title: "Volante puxando ou vibrando",
      body: "Pode ser alinhamento, balanceamento ou desgaste dos pneus. Além do conforto, isso gasta os pneus mais rápido.",
      ask: "verificar alinhamento, balanceamento e pneus",
      symptom: "volante puxando para um lado ou vibrando",
    }),
  },
  {
    id: "guidao",
    for: "moto",
    text: "O guidão vibra ou a moto puxa para um lado?",
    options: yesNo({
      severity: "conferir",
      title: "Guidão vibrando ou moto puxando",
      body: "Pode ser pneu, alinhamento das rodas ou rolamentos da caixa de direção.",
      ask: "verificar pneus, alinhamento das rodas e caixa de direção",
      symptom: "guidão vibrando ou moto puxando para um lado",
    }),
  },
  {
    id: "temperatura",
    for: "carro",
    text: "O ponteiro de temperatura passa do meio ou a luz de temperatura acende?",
    options: yesNo(
      {
        severity: "urgente",
        title: "Motor esquentando",
        body: "Motor acima da temperatura pode sofrer dano grave. Desligue em local seguro, não abra o reservatório com o motor quente e procure ajuda.",
        ask: "verificar o sistema de arrefecimento (radiador, ventoinha e nível do líquido)",
        symptom: "temperatura do motor acima do normal",
      },
      "Com o motor aquecido, o ponteiro costuma ficar no meio. Vale reparar da próxima vez.",
    ),
  },
  {
    id: "partida",
    for: "todos",
    text: "O motor demora para pegar ou a partida está fraca?",
    options: yesNo({
      severity: "conferir",
      title: "Partida fraca",
      body: "Pode ser a bateria chegando ao fim ou o sistema de carga. Testar antes evita ficar parado na rua.",
      ask: "testar a bateria e o sistema de carga (alternador)",
      symptom: "partida fraca ou demorada",
    }),
  },
  {
    id: "vazamento",
    for: "carro",
    text: "Aparecem manchas de óleo ou de outro líquido no chão onde você estaciona?",
    options: yesNo(
      {
        severity: "conferir",
        title: "Manchas no chão",
        body: "Vale descobrir de onde vem. Pingos de água limpa com o ar-condicionado ligado são normais; óleo ou líquido colorido, não.",
        ask: "localizar a origem do vazamento",
        symptom: "manchas de líquido no chão onde estaciona",
      },
      "Dá para conferir olhando o chão depois de uma noite parado no mesmo lugar.",
    ),
  },
  {
    id: "cheiro",
    for: "todos",
    text: "Sente cheiro de combustível ou de queimado?",
    options: yesNo({
      severity: "urgente",
      title: "Cheiro de combustível ou de queimado",
      body: "Pode indicar vazamento de combustível ou algo superaquecendo. Não rode até verificar.",
      ask: "verificar vazamento de combustível ou superaquecimento",
      symptom: "cheiro de combustível ou de queimado",
    }),
  },
  {
    id: "pneu",
    for: "todos",
    text: "Algum pneu está careca, com bolha ou com corte?",
    options: yesNo(
      {
        severity: "urgente",
        title: "Pneu danificado",
        body: "Pneu careca, com bolha ou corte pode estourar. Troque antes de pegar estrada.",
        ask: "avaliar e trocar o pneu danificado",
        symptom: "pneu careca, com bolha ou corte",
      },
      "O pneu tem um marcador de desgaste (TWI) nos sulcos. Quando a borracha chega nele, é hora de trocar.",
    ),
  },
  {
    id: "suspensao",
    for: "carro",
    text: "Ouve batidas ou estalos ao passar em buracos ou lombadas?",
    options: yesNo({
      severity: "conferir",
      title: "Barulho na suspensão",
      body: "Pode ser amortecedor, bucha ou bieleta. Suspensão gasta também aumenta o desgaste dos pneus.",
      ask: "verificar suspensão (amortecedores, buchas e bieletas)",
      symptom: "batidas ou estalos em buracos e lombadas",
    }),
  },
  {
    id: "suspensao_moto",
    for: "moto",
    text: "A suspensão bate seco ou há óleo escorrendo nas bengalas?",
    options: yesNo({
      severity: "conferir",
      title: "Suspensão da moto",
      body: "Óleo nas bengalas costuma ser retentor gasto. A suspensão perde eficiência e o freio também sente.",
      ask: "verificar retentores e óleo da suspensão dianteira",
      symptom: "suspensão batendo seco ou óleo nas bengalas",
    }),
  },
  {
    id: "corrente",
    for: "moto",
    text: "A corrente faz barulho, está frouxa ou seca?",
    options: yesNo({
      severity: "conferir",
      title: "Corrente da moto",
      body: "Corrente frouxa ou sem lubrificação gasta a relação mais rápido e pode saltar.",
      ask: "verificar folga, lubrificação e desgaste da relação (corrente, coroa e pinhão)",
      symptom: "corrente com barulho, frouxa ou seca",
    }),
  },
];

/** Perguntas para o tipo de veículo (marca fora do catálogo usa as de carro). */
export function questionsFor(kind: VehicleKind | null): CheckupQuestion[] {
  const k = kind ?? "carro";
  return CHECKUP_QUESTIONS.filter((q) => q.for === "todos" || q.for === k);
}

/** Intervalos de troca de óleo mais comuns (o certo é o do manual). */
export function oilIntervalOptions(kind: VehicleKind | null): number[] {
  return kind === "moto" ? [1000, 2000, 3000, 4000] : [5000, 7500, 10000, 15000];
}

export const CHECKUP_DISCLAIMER =
  "O Teo não substitui um mecânico. São sinais para conferir, a partir do que você respondeu e dos seus registros.";
