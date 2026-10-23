"use client";

import Link from "next/link";
import { useRef } from "react";
import { legalLinks, nav } from "@/content/site";
import { CloseIcon, MenuIcon, UserIcon } from "@/components/ui/icons";
import { account, useAccount } from "@/lib/loja/conta";
import { openAuth } from "@/lib/loja/dialogo-conta";

const links = [...nav, { label: "Meus pedidos", href: "/meus-pedidos" }];

/**
 * Menu do celular em popover nativo: abre pelo botão, fecha com Esc, com um
 * toque fora ou ao escolher um link, e devolve o foco ao botão, tudo feito
 * pelo navegador. O JavaScript só fecha o menu quando um link é tocado (a
 * navegação do Next não recarrega a página, então o popover ficaria aberto).
 */
export function MobileMenu() {
  const panelRef = useRef<HTMLDivElement>(null);
  const { status, user } = useAccount();
  const rowClass = "flex min-h-12 w-full items-center gap-3 rounded-soft px-3 text-start text-lg font-semibold hover:bg-sand";

  return (
    <div className="lg:hidden">
      <button
        type="button"
        popoverTarget="menu-celular"
        popoverTargetAction="toggle"
        aria-label="Menu"
        className="mobile-menu-button grid size-11 place-items-center rounded-full text-ink hover:bg-sand"
      >
        <MenuIcon className="icon-open text-2xl" />
        <CloseIcon className="icon-close text-2xl" />
      </button>

      <div
        id="menu-celular"
        ref={panelRef}
        popover="auto"
        className="mobile-menu"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) {
            panelRef.current?.hidePopover();
          }
        }}
      >
        <nav aria-label="Menu do site">
          <ul className="grid gap-1">
            {links.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={rowClass}>
                  {item.label}
                </Link>
              </li>
            ))}
            {status === "ready" && (
              <li className="mt-1 border-t border-line pt-1">
                {user ? (
                  <>
                    <Link href="/minha-conta" className={rowClass}>
                      <UserIcon className="text-xl text-magenta" />
                      Minha conta
                    </Link>
                    <button
                      type="button"
                      className={`${rowClass} text-ink-soft`}
                      onClick={() => {
                        panelRef.current?.hidePopover();
                        void account.logout();
                      }}
                    >
                      Sair
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={rowClass}
                    onClick={() => {
                      panelRef.current?.hidePopover();
                      openAuth({ tab: "login" });
                    }}
                  >
                    <UserIcon className="text-xl text-magenta" />
                    Faça login ou crie sua conta
                  </button>
                )}
              </li>
            )}
          </ul>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-3 pt-3 text-sm text-ink-soft">
            {legalLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
