import Image from "next/image";
import Link from "next/link";
import { images } from "@/content/images";
import { nav, site } from "@/content/site";
import { AccountMenu } from "@/components/conta/AccountMenu";
import { CartLink } from "./CartLink";
import { CreateButton } from "@/components/ui/CtaButtons";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";

/**
 * Cabeçalho fixo no topo: fundo creme a 90% com desfoque. No desktop mostra o
 * menu (a partir de lg), a conta ("Faça login" ou o menu "Minha conta"), o carrinho
 * e, em tela larga (xl), "Meus pedidos" e o botão "Criar escultura"; no celular e
 * no tablet, o logo, a conta, o carrinho e o menu em popover (o "Criar" fica na
 * barra de abas de baixo).
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
            className="size-12 md:size-14"
          />
          <span className="font-display text-lg font-extrabold leading-none">
            Cristal Pet <span className="text-magenta">Esculturas</span>
            <span className="sr-only"> — {site.tagline}</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full px-4 whitespace-nowrap text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:bg-sand hover:text-ink"
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
            className="hidden min-h-11 items-center whitespace-nowrap rounded-full px-4 text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:bg-sand hover:text-ink xl:inline-flex"
            activeClassName="bg-sand text-ink"
          >
            Meus pedidos
          </NavLink>
          <AccountMenu />
          <CartLink />
          {/* num wrapper: "hidden" no próprio botão perde para o inline-flex dele */}
          <div className="ml-1 hidden xl:block">
            <CreateButton size="sm">Criar escultura</CreateButton>
          </div>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
