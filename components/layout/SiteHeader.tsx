import Image from "next/image";
import Link from "next/link";
import { images } from "@/content/images";
import { nav, site } from "@/content/site";
import { AccountMenu } from "@/components/conta/AccountMenu";
import { CartLink } from "./CartLink";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";

/**
 * Cabeçalho fixo no topo: fundo branco a 90% com desfoque. No desktop mostra o
 * menu (a partir de lg), a conta ("Faça login" ou o menu "Minha conta"), o carrinho
 * e "Meus pedidos" a partir de 2xl. No celular e no tablet, o logo, a conta,
 * o carrinho e o menu em popover; as duas coleções ficam na barra de abas.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-snow/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 rounded-full py-1 sm:shrink-0 sm:gap-3 sm:pr-2">
          {/* o emblema do logo (coração com o cão e o gato) + o nome em texto de verdade: nítido em qualquer tamanho.
              No celular o espaço é curto: emblema menor, nome numa linha e descrição só para leitores de tela. */}
          <Image
            src={images.emblem.src}
            alt=""
            width={images.emblem.width}
            height={images.emblem.height}
            priority
            className="h-8 w-auto shrink-0 min-[400px]:h-9 sm:h-12"
          />
          <span className="grid gap-1 leading-none">
            <span className="font-display text-[0.9375rem] font-extrabold leading-tight tracking-tight text-navy min-[400px]:text-base sm:whitespace-nowrap sm:text-xl sm:leading-none">
              {site.name}
            </span>
            <span className="sr-only whitespace-nowrap text-[0.6875rem] font-bold uppercase tracking-[0.28em] text-ink-soft sm:not-sr-only">{site.descriptor}</span>
            <span className="sr-only"> — {site.tagline}</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full px-4 whitespace-nowrap text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:bg-pearl hover:text-ink"
                  activeClassName="bg-pearl text-ink"
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
            className="hidden min-h-11 items-center whitespace-nowrap rounded-full px-4 text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:bg-pearl hover:text-ink 2xl:inline-flex"
            activeClassName="bg-pearl text-ink"
          >
            Meus pedidos
          </NavLink>
          <AccountMenu />
          <CartLink />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
