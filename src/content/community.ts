/**
 * Comunidade do beta: mural de dicas anônimo, com revisão antes de aparecer.
 * As regras valem também no banco (supabase/migrations/20261018180000_community.sql).
 */

export const COMMUNITY_TOPICS = [
  { id: "consumo", label: "Consumo" },
  { id: "economia", label: "Economia" },
  { id: "precos", label: "Preços" },
  { id: "manutencao", label: "Manutenção" },
] as const;

export type CommunityTopic = (typeof COMMUNITY_TOPICS)[number]["id"];

export const TOPIC_LABEL: Record<string, string> = Object.fromEntries(
  COMMUNITY_TOPICS.map((t) => [t.id, t.label]),
);

export const REPORT_REASONS = [
  { id: "ofensivo", label: "Ofensivo ou desrespeitoso" },
  { id: "propaganda", label: "Propaganda ou golpe" },
  { id: "dados_pessoais", label: "Expõe dados de alguém" },
  { id: "falso", label: "Informação falsa ou perigosa" },
  { id: "outro", label: "Outro motivo" },
] as const;

export const REASON_LABEL: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.id, r.label]),
);

export const COMMUNITY_MIN = 10;
export const COMMUNITY_MAX = 500;

/** Regras curtas, mostradas antes de publicar (a versão completa está nos Termos). */
export const COMMUNITY_RULES = [
  "Compartilhe experiências e dicas sobre consumo, economia, preços e manutenção.",
  "Não cite pessoas nem acuse postos, marcas ou empresas.",
  "Sem política, propaganda, links ou dados pessoais (seus ou de outros).",
  "Toda dica passa por uma revisão antes de aparecer. As publicações são anônimas.",
];

/** Mesma checagem de links do banco, para avisar antes de enviar. */
export function hasLink(text: string): boolean {
  return /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|io|me|ly|app|site|online|link)\b)/i.test(
    text,
  );
}
