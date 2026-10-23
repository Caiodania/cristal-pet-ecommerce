"use client";

import { FaPaw } from "react-icons/fa6";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { openAuth } from "@/lib/loja/dialogo-conta";

/**
 * Aviso "faça login ou crie a sua conta", com os dois botões que abrem o
 * diálogo (sem sair da página). Usado onde a conta é necessária: gerar a
 * prévia, enviar o pedido, ver os pedidos.
 */
export function LoginPrompt({
  title = "Entre ou crie a sua conta",
  text,
  onSuccess,
  className,
  compact = false,
}: {
  title?: string;
  text: string;
  /** O que fazer depois de entrar (ex.: continuar gerando a prévia). */
  onSuccess?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const reason = text;
  return (
    <div
      role="note"
      className={cn(
        "relative overflow-hidden rounded-card border-2 border-magenta/40 bg-magenta-mist",
        compact ? "p-4" : "p-6 sm:p-8",
        className,
      )}
    >
      <FaPaw aria-hidden="true" className="absolute -right-3 -top-3 text-8xl text-magenta/10" />
      <div className="relative grid gap-4">
        <div>
          <p className="font-display text-xl font-extrabold">{title}</p>
          <p className="mt-1 text-ink-soft">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="md" onClick={() => openAuth({ tab: "signup", reason, onSuccess })}>
            Criar conta grátis
          </Button>
          <Button size="md" variant="secondary" onClick={() => openAuth({ tab: "login", reason, onSuccess })}>
            Já tenho conta
          </Button>
        </div>
      </div>
    </div>
  );
}
