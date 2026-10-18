import { BrandMark } from "@/components/app/Logo";

/**
 * Tela de abertura enquanto o app carrega (código, sessão e dados). Também é o que o
 * servidor entrega nas telas logadas, então quem abre o app instalado vê o logo na hora,
 * e não uma tela branca.
 */
export function BootSplash() {
  return (
    <div
      role="status"
      aria-label="Carregando o Tanque+"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background"
    >
      <BrandMark className="h-16 animate-pulse motion-reduce:animate-none" title="Tanque+" />
      <span className="h-1 w-24 overflow-hidden rounded-full bg-muted">
        <span className="block h-full w-1/3 animate-[boot_1.1s_ease-in-out_infinite] rounded-full bg-primary motion-reduce:animate-none" />
      </span>
    </div>
  );
}
