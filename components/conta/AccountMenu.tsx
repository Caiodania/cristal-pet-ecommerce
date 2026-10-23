"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { QuotaMeter } from "@/components/conta/QuotaMeter";
import { ChevronRightIcon, ReceiptIcon, UserIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { account, useAccount } from "@/lib/loja/conta";
import { openAuth } from "@/lib/loja/dialogo-conta";

const itemClass =
  "flex min-h-11 w-full items-center gap-3 rounded-soft px-3 text-start font-semibold hover:bg-sand";

/**
 * O canto direito do cabeçalho. Visitante: botão "Faça login" (abre o diálogo
 * sem sair da página). Logado: a bolinha com a inicial e o menu "Minha conta"
 * (prévias que sobram, pedidos, sair).
 */
export function AccountMenu({ className }: { className?: string }) {
  const { status, user, quota } = useAccount();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // fecha com Esc e ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onPointer = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // reserva o lugar enquanto não se sabe se há conta (não pula o layout)
  if (status === "loading") return <span aria-hidden="true" className={cn("block size-11", className)} />;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openAuth({ tab: "login" })}
        aria-label="Faça login"
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold text-ink transition-colors hover:bg-sand",
          "size-11 md:w-auto md:border-2 md:border-ink md:px-4 md:hover:bg-ink md:hover:text-cream",
          className,
        )}
      >
        <UserIcon className="text-2xl md:text-xl" />
        <span className="max-md:hidden">Faça login</span>
      </button>
    );
  }

  const initial = (user.name ?? user.email).trim().charAt(0).toUpperCase();
  const firstName = (user.name ?? "").split(" ")[0];

  return (
    <div ref={box} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Minha conta"
        title="Minha conta"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-2 rounded-full pr-1 hover:bg-sand md:pr-3"
      >
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-full bg-magenta font-display text-lg font-extrabold text-white shadow-soft"
        >
          {initial}
        </span>
        <span className="whitespace-nowrap font-bold max-xl:hidden">Minha conta</span>
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-2 shadow-lift"
        >
          <div className="px-3 pb-3 pt-2">
            <p className="font-display text-lg font-extrabold">{firstName ? `Olá, ${firstName}!` : "Olá!"}</p>
            <p className="truncate text-sm text-ink-soft">{user.email}</p>
            {quota && <QuotaMeter quota={quota} className="mt-3" />}
          </div>
          <ul className="grid gap-0.5 border-t border-line pt-2">
            <li>
              <Link href="/minha-conta" onClick={() => setOpen(false)} className={itemClass}>
                <UserIcon className="text-xl text-magenta" />
                Minha conta
                <ChevronRightIcon className="ml-auto text-lg text-ink-soft" />
              </Link>
            </li>
            <li>
              <Link href="/meus-pedidos" onClick={() => setOpen(false)} className={itemClass}>
                <ReceiptIcon className="text-xl text-magenta" />
                Meus pedidos
                <ChevronRightIcon className="ml-auto text-lg text-ink-soft" />
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void account.logout();
                }}
                className={cn(itemClass, "text-ink-soft")}
              >
                Sair
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
