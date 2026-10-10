"use client";

import Link from "next/link";
import { useRef } from "react";
import { legalLinks, nav, navSecondary } from "@/content/site";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";

const links = [...nav, ...navSecondary];

/**
 * Menu do celular em popover nativo: abre pelo botão, fecha com Esc, com um
 * toque fora ou ao escolher um link, e devolve o foco ao botão, tudo feito
 * pelo navegador. O JavaScript só fecha o menu quando um link é tocado (a
 * navegação do Next não recarrega a página, então o popover ficaria aberto).
 */
export function MobileMenu() {
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <div className="md:hidden">
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
                <Link
                  href={item.href}
                  className="flex min-h-12 items-center rounded-soft px-3 text-lg font-semibold hover:bg-sand"
                >
                  {item.label}
                </Link>
              </li>
            ))}
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
