"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type Option = {
  id: string;
  label: string;
  /** Linha(s) abaixo do nome: altura, preço, descrição. */
  detail?: ReactNode;
  /** Cor do material (mostrada como bolinha). */
  swatch?: string;
};

type OptionGroupProps = {
  legend: string;
  name: string;
  options: Option[];
  value: string | undefined;
  onChange: (id: string) => void;
  hint?: string;
};

/**
 * Escolha única em cartões. São <input type="radio"> de verdade: teclado (setas),
 * leitor de tela e formulário funcionam sem código extra. O estado marcado tem
 * borda, fundo E o ícone de "ok": a cor sozinha não carrega a informação.
 */
export function OptionGroup({ legend, name, options, value, onChange, hint }: OptionGroupProps) {
  return (
    <fieldset className="grid gap-4">
      <legend className="font-display text-2xl font-medium">{legend}</legend>
      {hint && <p className="-mt-2 text-ink-soft">{hint}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
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
            <span
              className={cn(
                "relative flex h-full flex-col gap-1 rounded-card border-2 border-line bg-white p-4 shadow-soft",
                "transition-colors hover:border-field",
                "peer-checked:border-teal-deep peer-checked:bg-teal-mist",
                "peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-deep",
                "[&_.ok]:opacity-0 peer-checked:[&_.ok]:opacity-100",
              )}
            >
              <span className="flex items-center gap-2 pr-7 font-semibold">
                {option.swatch && (
                  <span
                    aria-hidden="true"
                    className="size-5 shrink-0 rounded-full border border-field"
                    style={{ backgroundColor: option.swatch }}
                  />
                )}
                {option.label}
              </span>
              {option.detail && <span className="text-sm text-ink-soft">{option.detail}</span>}
              <span
                aria-hidden="true"
                className="ok absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-teal-deep text-white transition-opacity"
              >
                <CheckIcon className="text-sm" />
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
