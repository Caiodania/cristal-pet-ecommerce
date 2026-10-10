import type { ComponentType, SVGProps } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { site } from "@/content/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  BagIcon,
  CubeIcon,
  DropletIcon,
  ReceiptIcon,
} from "@/components/ui/icons";
import { NavLink } from "./NavLink";

type Tab = {
  label: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

// Esculturas · Banho e tosa · Pedidos · Ajuda (WhatsApp) · Carrinho. Pedidos e
// Carrinho só existem com a loja ligada (`site.store.enabled`, fase 1B). O
// início é o logo do cabeçalho.
const tabs: Tab[] = [
  { label: "Esculturas", href: "/esculturas", Icon: CubeIcon },
  { label: "Banho e tosa", href: "/banho-e-tosa", Icon: DropletIcon },
  ...(site.store.enabled
    ? [
        { label: "Pedidos", href: "/meus-pedidos", Icon: ReceiptIcon },
        { label: "Carrinho", href: "/carrinho", Icon: BagIcon },
      ]
    : []),
];

const itemClass =
  "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 " +
  "text-xs font-semibold text-ink-soft transition-colors hover:text-ink";
const activeClass =
  "text-teal-deep after:absolute after:inset-x-5 after:top-0 after:h-0.5 after:rounded-full after:bg-teal-deep";

/**
 * Barra de abas fixa no rodapé, só no celular (como no site de referência).
 * "Ajuda" abre o WhatsApp, então o botão flutuante fica escondido no celular.
 */
export function MobileTabBar() {
  const items = [
    ...tabs.map(({ label, href, Icon }) => (
      <li key={href} className="flex flex-1">
        <NavLink href={href} className={itemClass} activeClassName={activeClass}>
          <Icon className="text-2xl" />
          {label}
        </NavLink>
      </li>
    )),
    <li key="ajuda" className="flex flex-1">
      <a
        href={buildWhatsAppUrl(site.whatsapp.defaultMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClass}
      >
        <FaWhatsapp aria-hidden="true" className="text-2xl" />
        Ajuda
        <span className="sr-only"> pelo WhatsApp (abre em nova aba)</span>
      </a>
    </li>,
  ];

  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="flex">{items}</ul>
    </nav>
  );
}
