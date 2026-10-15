"use client";

import { cn } from "@/lib/cn";

export type StepInfo = { id: string; label: string };

type StepperProps = {
  steps: StepInfo[];
  current: number;
  /** Voltar para uma etapa anterior (adiante só pelo botão "Continuar"). */
  onGo: (index: number) => void;
};

/** Progresso do configurador. Etapas já feitas viram botões para voltar. */
export function Stepper({ steps, current, onGo }: StepperProps) {
  return (
    <nav aria-label="Etapas da escultura">
      <p className="font-semibold sm:hidden">
        Passo {current + 1} de {steps.length}: {steps[current].label}
      </p>
      <ol className="mt-3 flex gap-2 sm:mt-0">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const bar = (
            <span
              aria-hidden="true"
              className={cn("block h-1.5 rounded-full", done || active ? "bg-teal-deep" : "bg-line")}
            />
          );
          const label = (
            <span
              className={cn(
                "mt-2 hidden text-sm sm:block",
                active ? "font-bold text-ink" : "font-semibold text-ink-soft",
              )}
            >
              {index + 1}. {step.label}
            </span>
          );
          return (
            <li key={step.id} className="flex-1">
              {done ? (
                <button
                  type="button"
                  onClick={() => onGo(index)}
                  className="flex min-h-11 w-full flex-col justify-center rounded-soft text-left hover:opacity-80"
                >
                  {bar}
                  {label}
                  <span className="sr-only">Voltar para a etapa {index + 1}: {step.label}</span>
                </button>
              ) : (
                <div aria-current={active ? "step" : undefined} className="flex min-h-11 flex-col justify-center">
                  {bar}
                  {label}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
