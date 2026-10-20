import { useEffect, useId, useRef, useState } from "react";
import { useCityList } from "@/hooks/use-tanque";
import { officialCity, suggestCities } from "@/services/cities";
import { cn } from "@/lib/utils";

/**
 * Campo de cidade com sugestões da UF escolhida (lista do IBGE). Digitar filtra; tocar
 * escolhe. Cidade fora da lista pode ser digitada normalmente. Se a UF mudar e a cidade
 * não for dela, o campo é limpo com um aviso.
 * Segue o padrão "combobox" (setas, Enter e Esc funcionam no teclado).
 */
export function CityField({
  uf,
  value,
  onChange,
  label = "Cidade",
  hint,
}: {
  uf: string;
  value: string;
  onChange: (city: string) => void;
  label?: string;
  hint?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const { list, complete } = useCityList(uf || null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [notice, setNotice] = useState<string | null>(null);

  // UF trocada: confere se a cidade continua sendo dessa UF (só com a lista completa).
  const checkedUf = useRef(uf);
  useEffect(() => {
    if (uf === checkedUf.current || !complete) return;
    checkedUf.current = uf;
    if (value.trim() && !officialCity(list, value)) {
      setNotice(`${value.trim()} não aparece em ${uf}. Escolha a cidade de novo.`);
      onChange("");
    } else setNotice(null);
  }, [uf, complete, list, value, onChange]);

  const exact = officialCity(list, value);
  const suggestions =
    open && !(exact && exact === value) ? suggestCities(list, value) : ([] as string[]);
  const expanded = suggestions.length > 0;

  function choose(city: string) {
    onChange(city);
    setOpen(false);
    setActive(-1);
    setNotice(null);
  }

  const help = notice
    ? notice
    : !uf
      ? "Escolha o estado primeiro."
      : (hint ?? "Digite e escolha na lista. Se não achar, pode digitar o nome.");

  return (
    <div className="relative space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby={`${id}-hint`}
        autoComplete="off"
        autoCapitalize="words"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
          setNotice(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          if (exact && exact !== value) onChange(exact);
        }}
        onKeyDown={(event) => {
          if (!expanded) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            choose(suggestions[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="min-h-14 w-full rounded-2xl border border-border bg-card px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={`Cidades de ${uf || "—"}`}
        hidden={!expanded}
        className="absolute inset-x-0 top-[5.25rem] z-30 max-h-64 overflow-auto rounded-2xl border border-border bg-card py-1 shadow-[var(--shadow-soft)]"
      >
        {suggestions.map((city, i) => (
          <li
            key={city}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            // pointerdown antes do blur do campo, para o toque não se perder
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => choose(city)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center px-4 text-base text-foreground",
              i === active && "bg-accent",
            )}
          >
            {city}
          </li>
        ))}
      </ul>
      <p
        id={`${id}-hint`}
        hidden={!help}
        className={cn("text-xs", notice ? "font-medium text-destructive" : "text-muted-foreground")}
      >
        {help}
      </p>
    </div>
  );
}
