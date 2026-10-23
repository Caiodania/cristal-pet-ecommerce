"use client";

import { useEffect, useState } from "react";
import { Loading } from "@/components/ui/Status";
import { CheckIcon } from "@/components/ui/icons";
import { SculptureIllustration } from "@/components/ui/illustrations";
import { cn } from "@/lib/cn";

const STAGES = ["Analisando a foto", "Modelando o pelo e a expressão", "Esculpindo a base com o nome"];

/**
 * Espera da prévia: a ilustração na cor escolhida pulsa, as etapas vão sendo
 * marcadas e o texto de verdade (vindo do servidor) fica no aviso de status.
 * A lista de etapas é só decoração: o andamento real é o que o servidor informa.
 */
export function GeneratingCard({
  message,
  pose,
  tint,
  name,
}: {
  message: string;
  pose?: string;
  tint?: string;
  name?: string;
}) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="grid items-center gap-6 rounded-card bg-gradient-to-b from-teal-mist to-sand p-6 sm:grid-cols-[14rem_1fr]">
      <div className="mx-auto w-44 motion-safe:animate-pulse sm:w-full">
        <SculptureIllustration pose={pose ?? "sentado"} tint={tint ?? "#f3f0e8"} name={name} />
      </div>
      <div className="grid gap-4">
        <Loading>{message}</Loading>
        <ol aria-hidden="true" className="grid gap-2">
          {STAGES.map((label, index) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 text-sm font-semibold transition-opacity duration-500",
                index > stage && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border-2 text-xs transition-colors duration-500",
                  index < stage ? "border-magenta bg-magenta text-white" : "border-magenta text-magenta",
                )}
              >
                {index < stage ? <CheckIcon className="text-xs" /> : index + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
        <p className="text-sm text-ink-soft">Pode levar alguns instantes. Não feche esta página.</p>
      </div>
    </div>
  );
}
