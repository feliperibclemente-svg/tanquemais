/**
 * Exportação de abastecimentos em CSV para Excel (pt-BR), Google Planilhas e LibreOffice.
 *
 * Formato escolhido para abrir certo com dois cliques no Excel brasileiro:
 * - separador ";" (o Excel pt-BR usa vírgula como decimal);
 * - números com vírgula decimal e sem separador de milhar ("1234,56");
 * - datas dd/mm/aaaa e hora separada;
 * - UTF-8 com BOM, para acentos aparecerem corretamente;
 * - quebras de linha CRLF e aspas escapadas.
 *
 * Usa as mesmas linhas calculadas das telas (computeFuelings), então consumo e custo por km
 * batem com o Histórico e o Painel.
 */
import { FUEL_LABEL, FUEL_TYPES } from "@/constants/app";
import type { FuelingComputed, FuelingIssue } from "@/services/analytics";

const SEPARATOR = ";";
const BOM = "﻿";

const ISSUE_LABEL: Record<FuelingIssue, string> = {
  duplicate: "Possível duplicado (fora das contas)",
  odometer: "Km menor ou igual ao anterior",
  outlier: "Consumo fora do padrão (fora das médias)",
};

/** Número com vírgula decimal, sem milhar; vazio quando não há valor. */
export function csvNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toFixed(decimals).replace(".", ",");
}

/** Escapa um campo: aspas duplicadas e envolve em aspas quando necessário. */
export function csvField(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Preços antigos podem ter 3 casas (5,899); os novos têm 2. Exporta sem perder informação. */
const priceDecimals = (price: number) => (Math.round(price * 1000) % 10 === 0 ? 2 : 3);

export function fuelingsToCsv(
  rows: FuelingComputed[],
  vehicleName: (vehicleId: string) => string,
): string {
  const header = [
    "Data",
    "Hora",
    "Veículo",
    "Combustível",
    "Unidade",
    "Volume",
    "Preço por unidade (R$)",
    "Valor pago (R$)",
    "Odômetro (km)",
    "Tanque cheio",
    "Km do trecho medido",
    "Consumo (km por unidade)",
    "Custo por km (R$)",
    "Situação",
  ];

  // Ordem cronológica, como numa planilha de controle. As linhas chegam do cálculo com o
  // mais recente primeiro; inverter preserva a mesma ordem usada para medir o consumo.
  const ordered = [...rows].reverse();

  const lines = ordered.map((r) => {
    const d = new Date(r.filled_at);
    const unit = FUEL_TYPES.find((f) => f.id === r.fuel_type_id)?.unit ?? "L";
    return [
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
      `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      vehicleName(r.vehicle_id),
      FUEL_LABEL[r.fuel_type_id] ?? r.fuel_type_id,
      unit,
      csvNumber(Number(r.liters), 3),
      csvNumber(Number(r.price_per_liter), priceDecimals(Number(r.price_per_liter))),
      csvNumber(Number(r.total_cost), 2),
      csvNumber(Number(r.odometer), 0),
      r.full_tank ? "Sim" : "Não",
      csvNumber(r.distance, 0),
      csvNumber(r.computed_km_per_liter ?? r.outlier_km_per_liter, 2),
      csvNumber(r.computed_cost_per_km, 3),
      r.issue ? ISSUE_LABEL[r.issue] : "",
    ]
      .map(csvField)
      .join(SEPARATOR);
  });

  return BOM + [header.map(csvField).join(SEPARATOR), ...lines].join("\r\n") + "\r\n";
}

/** Baixa um texto como arquivo no navegador. */
export function downloadText(content: string, filename: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
