"use client";

import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type StepInfo = { id: string; label: string };

type StepperProps = {
  steps: StepInfo[];
  current: number;
  /** Voltar para uma etapa anterior (adiante só pelo botão "Continuar"). */
  onGo: (index: number) => void;
};

/**
 * Progresso do configurador: bolinhas numeradas ligadas por uma linha. As já
 * feitas viram botões (com "ok") para voltar; a atual tem anel; as próximas
 * ficam apagadas. No celular, o rótulo da etapa vem em texto acima.
 */
export function Stepper({ steps, current, onGo }: StepperProps) {
  return (
    <nav aria-label="Etapas da escultura">
      <p className="font-bold sm:hidden">
        Passo {current + 1} de {steps.length}: {steps[current].label}
      </p>
      <ol className="mt-2 flex items-start sm:mt-0">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const last = index === steps.length - 1;
          const circle = (
            <span
              aria-hidden="true"
              className={cn(
                "grid size-9 place-items-center rounded-full border-2 font-display text-sm font-extrabold transition-all duration-300",
                done && "border-magenta bg-magenta text-white",
                active && "border-magenta bg-white text-magenta ring-4 ring-magenta/20",
                !done && !active && "border-line bg-white text-ink-soft",
              )}
            >
              {done ? <CheckIcon className="text-base" /> : index + 1}
            </span>
          );
          const label = (
            <span
              aria-hidden="true"
              className={cn(
                "mt-1 hidden text-center text-sm sm:block",
                active ? "font-extrabold text-ink" : "font-semibold text-ink-soft",
              )}
            >
              {step.label}
            </span>
          );
          return (
            <li key={step.id} className="relative flex flex-1 flex-col items-center">
              {/* linha até a próxima bolinha */}
              {!last && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-1/2 top-[1.375rem] h-0.5 w-full transition-colors duration-300",
                    done ? "bg-magenta" : "bg-line",
                  )}
                />
              )}
              {done ? (
                <button
                  type="button"
                  onClick={() => onGo(index)}
                  className="relative flex min-h-11 w-full flex-col items-center rounded-soft hover:opacity-80"
                >
                  <span className="grid min-h-11 min-w-11 place-items-center">{circle}</span>
                  {label}
                  <span className="sr-only">Voltar para a etapa {index + 1}: {step.label}</span>
                </button>
              ) : (
                <div aria-current={active ? "step" : undefined} className="relative flex w-full flex-col items-center">
                  <span className="grid min-h-11 min-w-11 place-items-center">{circle}</span>
                  {label}
                  <span className="sr-only">
                    Etapa {index + 1}: {step.label}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
