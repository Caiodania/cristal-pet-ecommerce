import type { ComponentType, ReactNode, SVGProps } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { site } from "@/content/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { BagIcon, CubeIcon, HomeIcon, ReceiptIcon } from "@/components/ui/icons";
import { CartBadge } from "./CartLink";
import { NavLink } from "./NavLink";

type Tab = {
  label: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: ReactNode;
};

// Início · Criar · Pedidos · Ajuda (WhatsApp) · Carrinho, como na loja de referência.
const tabs: Tab[] = [
  { label: "Início", href: "/", Icon: HomeIcon },
  { label: "Criar", href: "/personalizar", Icon: CubeIcon },
  { label: "Pedidos", href: "/meus-pedidos", Icon: ReceiptIcon },
];

const itemClass =
  "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 " +
  "text-xs font-semibold text-ink-soft transition-colors hover:text-ink";
const activeClass =
  "text-teal-deep after:absolute after:inset-x-5 after:top-0 after:h-0.5 after:rounded-full after:bg-teal-deep";

/**
 * Barra de abas fixa no rodapé, só no celular. "Ajuda" abre o WhatsApp, então
 * o botão flutuante fica escondido no celular.
 */
export function MobileTabBar() {
  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="flex">
        {tabs.map(({ label, href, Icon }) => (
          <li key={href} className="flex flex-1">
            <NavLink href={href} className={itemClass} activeClassName={activeClass}>
              <Icon className="text-2xl" />
              {label}
            </NavLink>
          </li>
        ))}
        <li className="flex flex-1">
          <a
            href={buildWhatsAppUrl(site.whatsapp.messages.duvida)}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClass}
          >
            <FaWhatsapp aria-hidden="true" className="text-2xl" />
            Ajuda
            <span className="sr-only"> pelo WhatsApp (abre em nova aba)</span>
          </a>
        </li>
        <li className="flex flex-1">
          <NavLink href="/carrinho" className={itemClass} activeClassName={activeClass}>
            <span className="relative">
              <BagIcon className="text-2xl" />
              <CartBadge className="-right-2 -top-1" />
            </span>
            Carrinho
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
