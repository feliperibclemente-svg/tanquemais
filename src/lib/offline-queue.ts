/**
 * Fila offline de abastecimentos.
 *
 * Quando não há rede (ou a requisição falha por conexão), o abastecimento é
 * gravado no localStorage e reenviado automaticamente assim que a rede volta.
 */
import type { FuelingDraft } from "@/repositories";
import { logger } from "./telemetry";

const STORAGE_KEY = "tanque:queue:fuelings";
const MAX_ATTEMPTS = 5;

export interface QueuedFueling {
  id: string;
  userId: string;
  createdAt: string;
  attempts: number;
  draft: FuelingDraft;
  computed: { km_per_liter: number | null; cost_per_km: number | null };
}

type Listener = (items: QueuedFueling[]) => void;
const listeners = new Set<Listener>();

function read(): QueuedFueling[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedFueling[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedFueling[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage cheio ou indisponível */
  }
  listeners.forEach((listener) => listener(items));
}

export function queuedFuelings(): QueuedFueling[] {
  return read();
}

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function enqueueFueling(
  userId: string,
  draft: FuelingDraft,
  computed: QueuedFueling["computed"],
): QueuedFueling {
  const item: QueuedFueling = {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    attempts: 0,
    draft,
    computed,
  };
  write([...read(), item]);
  logger.info("offline.fueling.queued", { id: item.id });
  return item;
}

function removeFromQueue(id: string) {
  write(read().filter((item) => item.id !== id));
}

function bumpAttempt(id: string) {
  const items = read()
    .map((item) => (item.id === id ? { ...item, attempts: item.attempts + 1 } : item))
    .filter((item) => item.attempts < MAX_ATTEMPTS);
  write(items);
}

/** Um erro de rede deve ir para a fila; erros de validação/permissão, não. */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|network|sem conex|timeout|load failed/i.test(message);
}

export type QueueProcessor = (item: QueuedFueling) => Promise<unknown>;

let flushing = false;

/** Reenvia todos os itens pendentes. Retorna quantos foram sincronizados. */
export async function flushQueue(process: QueueProcessor): Promise<number> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) return 0;
  flushing = true;
  let synced = 0;

  try {
    for (const item of read()) {
      try {
        await process(item);
        removeFromQueue(item.id);
        synced += 1;
      } catch (error) {
        if (isNetworkError(error)) break;
        logger.warn("offline.fueling.retry_failed", {
          id: item.id,
          message: error instanceof Error ? error.message : String(error),
        });
        bumpAttempt(item.id);
      }
    }
  } finally {
    flushing = false;
  }

  return synced;
}
