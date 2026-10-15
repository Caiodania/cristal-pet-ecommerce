import Image from "next/image";
import Link from "next/link";
import { images } from "@/content/images";
import { nav, site } from "@/content/site";
import { CartLink } from "./CartLink";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";

/**
 * Cabeçalho fixo no topo: fundo creme a 90% com desfoque, sem botão de ação
 * (os CTAs ficam nas seções, um por dobra). No desktop mostra o menu, "Meus
 * pedidos" e o carrinho; no celular, o logo, o carrinho e o menu em popover.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
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
            Cristal Pet <span className="font-normal italic text-teal-deep">Esculturas</span>
            <span className="sr-only"> — {site.tagline}</span>
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
          <NavLink
            href="/meus-pedidos"
            className="hidden min-h-11 items-center rounded-full px-4 text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:bg-sand hover:text-ink md:inline-flex"
            activeClassName="bg-sand text-ink"
          >
            Meus pedidos
          </NavLink>
          <CartLink />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
