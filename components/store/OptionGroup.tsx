"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type Option = {
  id: string;
  label: string;
  /** Linha(s) abaixo do nome: descrição, altura, preço. */
  detail?: ReactNode;
  /** Imagem ou ilustração do cartão. */
  visual?: ReactNode;
  /** Cor do material (bolinha ao lado do nome). */
  swatch?: string;
  /** Selo no canto ("Mais vendida"). */
  badge?: string;
};

type OptionGroupProps = {
  legend: string;
  name: string;
  options: Option[];
  value: string | undefined;
  onChange: (id: string) => void;
  hint?: string;
  /** "tiles": imagem em cima, em colunas (no celular, miniatura à esquerda). "rows": uma por linha. */
  layout?: "tiles" | "rows";
  /** Nota sobre as imagens ("Imagens ilustrativas"). */
  note?: string;
  /** Proporção da imagem nos cartões "tiles": retrato (4:5) ou paisagem (4:3). */
  ratio?: "portrait" | "landscape";
};

const frame = cn(
  "relative flex h-full overflow-hidden rounded-card border-2 border-line bg-white shadow-soft",
  "transition-[border-color,box-shadow,background-color,transform] duration-200",
  "hover:border-magenta/50 hover:shadow-lift motion-safe:hover:-translate-y-0.5",
  "peer-checked:border-magenta peer-checked:bg-white peer-checked:shadow-lift",
  "peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-magenta",
  "[&_.ok]:scale-50 [&_.ok]:opacity-0 peer-checked:[&_.ok]:scale-100 peer-checked:[&_.ok]:opacity-100",
);

/**
 * Escolha única em cartões ilustrados. São <input type="radio"> de verdade:
 * teclado (setas), leitor de tela e formulário funcionam sem código extra. O
 * estado marcado tem borda, sombra E o ícone de "ok": a cor sozinha não carrega
 * a informação.
 */
export function OptionGroup({
  legend,
  name,
  options,
  value,
  onChange,
  hint,
  layout = "tiles",
  note,
  ratio = "portrait",
}: OptionGroupProps) {
  const rows = layout === "rows";
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 font-display text-2xl font-extrabold sm:text-3xl">{legend}</legend>
      {hint && <p className="-mt-2 text-ink-soft">{hint}</p>}
      <div className={rows ? "grid gap-3" : "grid gap-4 sm:grid-cols-3"}>
        {options.map((option) => (
          <label key={option.id} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              className="peer sr-only"
            />
            <span className={cn(frame, rows ? "flex-row items-stretch" : "flex-row items-stretch sm:flex-col")}>
              {option.visual && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative block shrink-0 overflow-hidden bg-sand",
                    rows
                      ? "min-h-28 w-24 sm:w-28"
                      : cn("w-28 sm:w-full", ratio === "landscape" ? "sm:aspect-[4/3]" : "sm:aspect-[4/5]"),
                  )}
                >
                  {option.visual}
                </span>
              )}
              <span className={cn("relative flex flex-1 flex-col gap-1", rows ? "justify-center p-4 pr-12" : "justify-center p-4 pr-12 sm:justify-start sm:pr-4")}>
                <span className="flex items-center gap-2 pr-8 font-display text-lg font-extrabold">
                  {option.swatch && (
                    <span
                      aria-hidden="true"
                      className="size-5 shrink-0 rounded-full border border-field shadow-inner"
                      style={{ backgroundColor: option.swatch }}
                    />
                  )}
                  {option.label}
                </span>
                {option.detail && <span className="text-sm text-ink-soft">{option.detail}</span>}
              </span>
              {option.badge && (
                <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  {option.badge}
                </span>
              )}
              <span
                aria-hidden="true"
                className="ok absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-magenta text-white shadow-soft transition duration-200"
              >
                <CheckIcon className="text-base" />
              </span>
            </span>
          </label>
        ))}
      </div>
      {note && <p className="text-xs text-ink-soft">{note}</p>}
    </fieldset>
  );
}
