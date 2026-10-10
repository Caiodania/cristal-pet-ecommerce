import Image from "next/image";
import Link from "next/link";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa6";
import { images } from "@/content/images";
import { legalLinks, nav, navSecondary, site } from "@/content/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const institutional = [...nav, ...navSecondary];

const linkClass =
  "inline-flex min-h-11 items-center text-cream/80 underline-offset-4 hover:text-cream hover:underline";

const socialClass =
  "grid size-11 place-items-center rounded-full border border-cream/30 text-lg text-cream transition-colors hover:bg-cream hover:text-ink";

/** Rodapé em quatro colunas, em faixa escura. Horário real, nunca "24h". */
export function SiteFooter() {
  return (
    <footer data-surface="dark" className="bg-ink text-cream">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src={images.logo.src}
              alt=""
              width={images.logo.width}
              height={images.logo.height}
              className="size-14 rounded-full bg-cream p-1"
            />
            <span className="font-display text-xl font-semibold">
              Cristal Pet <span className="font-normal italic text-teal">Móvel</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-cream/80">{site.slogan}</p>
          <p className="mt-2 max-w-xs text-sm text-cream/80">
            Banho e tosa móvel e esculturas 3D do seu pet em {site.cities.join(", ")}.
          </p>
        </div>

        <nav aria-label="Institucional">
          <h2 className="font-display text-lg font-medium">Institucional</h2>
          <ul className="mt-3">
            {institutional.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Políticas">
          <h2 className="font-display text-lg font-medium">Políticas</h2>
          <ul className="mt-3">
            {legalLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-lg font-medium">Atendimento</h2>
          <ul className="mt-3 grid gap-1 text-cream/80">
            <li>
              <a
                href={buildWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClass} gap-2`}
              >
                <FaWhatsapp aria-hidden="true" className="text-xl text-[#25d366]" />
                {site.whatsapp.display}
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className={linkClass}>
                {site.email}
              </a>
            </li>
            <li className="mt-2">
              {site.address.street}, {site.address.city} - {site.address.region}
              <span className="block text-sm">({site.address.note})</span>
            </li>
            {site.hours.map((line) => (
              <li key={line.days} className="text-sm">
                <span className="font-semibold text-cream">{line.days}:</span>{" "}
                {line.time}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-3">
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram da Cristal Pet (abre em nova aba)"
              className={socialClass}
            >
              <FaInstagram aria-hidden="true" />
            </a>
            <a
              href={site.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook da Cristal Pet (abre em nova aba)"
              className={socialClass}
            >
              <FaFacebookF aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-cream/15">
        <p className="container-page py-5 text-sm text-cream/80">
          © {new Date().getFullYear()} {site.name}. Todos os direitos reservados.
          {/* TODO-CLIENTE: CNPJ e razão social */}
        </p>
      </div>
    </footer>
  );
}
