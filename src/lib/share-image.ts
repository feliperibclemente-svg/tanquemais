import type { RecapTheme } from "@/services/recap";
import { SITE_URL } from "@/constants/app";
import { track } from "@/lib/analytics";

/**
 * Imagens para compartilhar (formato de story, 1080×1920), desenhadas no próprio aparelho.
 * Nada é enviado a servidor: a pessoa decide se e onde compartilha.
 */

export const THEME_COLORS: Record<
  RecapTheme,
  { from: string; to: string; fg: string; sub: string; mark: string }
> = {
  verde: { from: "#1E9A66", to: "#0D5C3B", fg: "#FFFFFF", sub: "#CFF5E2", mark: "#FFFFFF" },
  noite: { from: "#1B2440", to: "#0E1426", fg: "#FFFFFF", sub: "#9FE7C3", mark: "#1E9A66" },
  lima: { from: "#7BE0AE", to: "#2FB37A", fg: "#0B2A1C", sub: "#0F3D29", mark: "#0B2A1C" },
  sol: { from: "#FFC857", to: "#F08A24", fg: "#2A1605", sub: "#4A2A0A", mark: "#2A1605" },
  claro: { from: "#F4F7F4", to: "#DDEBE2", fg: "#141A2C", sub: "#1E7A52", mark: "#1E9A66" },
};

export interface ShareCard {
  theme: RecapTheme;
  eyebrow: string;
  big: string;
  title: string;
  caption?: string;
  /** Linhas de resumo (label → valor), para o cartão final. */
  rows?: { label: string; value: string }[];
}

const W = 1080;
const H = 1920;
const PAD = 96;
const FONT = "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const DROP = "M50 2 C46 20 10 50 10 82 A40 40 0 0 0 90 82 C90 50 54 20 50 2 Z";

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawDrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(DROP));
  ctx.strokeStyle = color === "#FFFFFF" ? "#1E9A66" : "#FFFFFF";
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(50, 67);
  ctx.lineTo(50, 101);
  ctx.moveTo(33, 84);
  ctx.lineTo(67, 84);
  ctx.stroke();
  ctx.restore();
}

/** Na imagem quem fala é a própria pessoa: "Seu Argo" vira "Meu Argo". */
export function toFirstPerson(text: string): string {
  return text
    .replace(/^Seu /, "Meu ")
    .replace(/^Sua /, "Minha ")
    .replace(/por você/g, "por mim");
}

/** Desenha o cartão e devolve um PNG. */
export async function renderShareImage(card: ShareCard): Promise<Blob> {
  try {
    await document.fonts?.load(`800 120px ${FONT}`);
  } catch {
    /* fonte do sistema */
  }
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const c = THEME_COLORS[card.theme];

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, c.from);
  bg.addColorStop(1, c.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Gota grande, translúcida, como marca d'água
  ctx.globalAlpha = 0.1;
  drawDrop(ctx, W - 560, H - 860, 760, c.fg);
  ctx.globalAlpha = 1;

  // Marca no topo
  drawDrop(ctx, PAD, 120, 72, c.mark);
  ctx.fillStyle = c.fg;
  ctx.font = `800 56px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Tanque+", PAD + 92, 200);

  // Com tabela de resumo, o texto começa mais alto para caber tudo acima do rodapé.
  let y = card.rows?.length ? 420 : 640;
  ctx.fillStyle = c.sub;
  ctx.font = `600 46px ${FONT}`;
  for (const line of wrap(ctx, card.eyebrow, W - 2 * PAD)) {
    ctx.fillText(line, PAD, y);
    y += 60;
  }

  if (card.big) {
    let size = 190;
    ctx.font = `800 ${size}px ${FONT}`;
    while (ctx.measureText(card.big).width > W - 2 * PAD && size > 90) {
      size -= 10;
      ctx.font = `800 ${size}px ${FONT}`;
    }
    y += size * 0.85;
    ctx.fillStyle = c.fg;
    ctx.fillText(card.big, PAD, y);
    y += 40;
  }

  ctx.fillStyle = c.fg;
  ctx.font = `700 ${card.big ? 64 : 92}px ${FONT}`;
  y += card.big ? 70 : 100;
  for (const line of wrap(ctx, card.title, W - 2 * PAD)) {
    ctx.fillText(line, PAD, y);
    y += card.big ? 80 : 110;
  }

  if (card.caption) {
    y += 20;
    ctx.fillStyle = c.sub;
    ctx.font = `500 42px ${FONT}`;
    for (const line of wrap(ctx, card.caption, W - 2 * PAD)) {
      ctx.fillText(line, PAD, y);
      y += 58;
    }
  }

  if (card.rows?.length) {
    y += 40;
    const rowH = card.rows.length > 5 ? 96 : 108;
    const boxH = card.rows.length * rowH + 32;
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.roundRect(PAD - 24, y, W - 2 * PAD + 48, boxH, 40);
    ctx.fill();
    y += 16;
    for (const row of card.rows) {
      ctx.fillStyle = c.sub;
      ctx.font = `500 42px ${FONT}`;
      ctx.fillText(row.label, PAD + 16, y + 70);
      ctx.fillStyle = c.fg;
      ctx.font = `800 52px ${FONT}`;
      const w = ctx.measureText(row.value).width;
      ctx.fillText(row.value, W - PAD - 16 - w, y + 72);
      y += rowH;
    }
  }

  // Rodapé com o endereço do app
  ctx.fillStyle = c.sub;
  ctx.font = `600 40px ${FONT}`;
  ctx.fillText("Meus números no Tanque+", PAD, H - 170);
  ctx.fillStyle = c.fg;
  ctx.font = `800 48px ${FONT}`;
  ctx.fillText(SITE_URL.replace(/^https?:\/\/(www\.)?/, ""), PAD, H - 108);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))),
      "image/png",
    ),
  );
}

export type ShareResult = "shared" | "downloaded" | "cancelled";

/**
 * Abre o menu de compartilhar do aparelho com a imagem (WhatsApp, Instagram, etc.).
 * Sem suporte a arquivos (computador), baixa a imagem.
 */
export async function shareCard(card: ShareCard, kind: string): Promise<ShareResult> {
  track("share_opened", { kind });
  const blob = await renderShareImage(card);
  const file = new File([blob], `tanquemais-${kind}.png`, { type: "image/png" });
  const text = `Meus números no Tanque+ ⛽ ${SITE_URL.replace(/^https?:\/\//, "")}`;
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      track("share_completed", { kind, via: "sheet" });
      return "shared";
    }
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return "cancelled";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  track("share_completed", { kind, via: "download" });
  return "downloaded";
}
