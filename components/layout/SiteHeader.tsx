import Image from "next/image";
import Link from "next/link";
import { images } from "@/content/images";
import { nav, site } from "@/content/site";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";

/**
 * Cabeçalho fixo no topo: fundo creme a 90% com desfoque, sem botão de ação
 * (os CTAs ficam nas seções, um por dobra). No desktop mostra o menu; no
 * celular, o logo e o menu em popover. Carrinho e "Pedidos" entram no espaço à
 * direita quando a loja for ligada (fase 1B).
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-full py-1 pr-2">
          <Image
            src={images.logo.src}
            alt=""
            width={images.logo.width}
            height={images.logo.height}
            priority
            className="size-11"
          />
          <span className="font-display text-lg font-semibold leading-none">
            Cristal Pet <span className="font-normal italic text-teal-deep">Móvel</span>
            <span className="sr-only"> — {site.slogan}</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:bg-sand hover:text-ink"
                  activeClassName="bg-sand text-ink"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          {/* fase 1B: ícones de Pedidos e Carrinho */}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
