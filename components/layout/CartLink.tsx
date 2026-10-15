"use client";

import Link from "next/link";
import { BagIcon } from "@/components/ui/icons";
import { useCart } from "@/lib/loja/carrinho";
import { cn } from "@/lib/cn";

/** Ícone do carrinho com o contador de esculturas (lido do navegador, sem servidor). */
export function CartLink({ className }: { className?: string }) {
  const { count } = useCart();
  return (
    <Link
      href="/carrinho"
      aria-label={count > 0 ? `Carrinho, ${count} ${count === 1 ? "escultura" : "esculturas"}` : "Carrinho vazio"}
      className={cn("relative grid size-11 place-items-center rounded-full text-ink hover:bg-sand", className)}
    >
      <BagIcon className="text-2xl" />
      <CartBadge />
    </Link>
  );
}

/** Bolinha com o número; some quando o carrinho está vazio. */
export function CartBadge({ className }: { className?: string }) {
  const { count } = useCart();
  if (count === 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-magenta px-1 text-[0.6875rem] font-bold leading-5 text-white",
        className,
      )}
    >
      {count}
    </span>
  );
}
