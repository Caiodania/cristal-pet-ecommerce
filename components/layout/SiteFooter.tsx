import Image from "next/image";
import Link from "next/link";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa6";
import { Bubbles } from "@/components/ui/decor";
import { images } from "@/content/images";
import { legalLinks, nav, site } from "@/content/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const shop = [
  { label: "Criar minha escultura", href: "/personalizar" },
  { label: "Carrinho", href: "/carrinho" },
  { label: "Meus pedidos", href: "/meus-pedidos" },
  ...nav,
];

const linkClass =
  "inline-flex min-h-11 items-center font-semibold text-ink underline-offset-4 hover:underline";

const socialClass =
  "grid size-11 place-items-center rounded-full border-2 border-ink text-lg text-ink transition-colors hover:bg-ink hover:text-teal";

/**
 * Rodapé da marca: faixa verde-água com loja, políticas e atendimento, e barra
 * magenta com o copyright (como no site da Cristal Pet). Horário real, nunca "24h".
 */
export function SiteFooter() {
  return (
    <footer>
      <div data-surface="teal" className="relative overflow-hidden bg-teal text-ink">
        <Bubbles className="-right-24 -top-24 w-96 opacity-40" />
        <div className="container-page relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <Image
                src={images.logo.src}
                alt=""
                width={images.logo.width}
                height={images.logo.height}
                className="size-20"
              />
              <span className="font-display text-xl font-extrabold">
                Cristal Pet{" "}
                {/* magenta direto no verde-água reprova (2,2:1): vira etiqueta com texto branco */}
                <span className="rounded-lg bg-magenta px-1.5 text-white">Esculturas</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs font-semibold">{site.tagline}.</p>
            <p className="mt-2 max-w-xs text-sm">
              Envie a foto, veja a prévia e peça. Pagamento e entrega combinados pelo WhatsApp.
            </p>
          </div>

          <nav aria-label="Loja">
            <h2 className="font-display text-lg font-extrabold">Loja</h2>
            <ul className="mt-3">
              {shop.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Políticas">
            <h2 className="font-display text-lg font-extrabold">Políticas</h2>
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
            <h2 className="font-display text-lg font-extrabold">Atendimento</h2>
            <ul className="mt-3 grid gap-1">
              <li>
                <a
                  href={buildWhatsAppUrl(site.whatsapp.messages.duvida)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} gap-2`}
                >
                  <FaWhatsapp aria-hidden="true" className="text-xl" />
                  {site.whatsapp.display}
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}`} className={linkClass}>
                  {site.email}
                </a>
              </li>
              {site.hours.map((line) => (
                <li key={line.days} className="text-sm">
                  <span className="font-bold">{line.days}:</span> {line.time}
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
      </div>

      <div data-surface="magenta" className="bg-magenta text-white">
        <p className="container-page py-4 text-sm">
          © {new Date().getFullYear()} {site.name}. Todos os direitos reservados.
          {/* TODO-CLIENTE: CNPJ, razão social e endereço (obrigatórios na loja) */}
        </p>
      </div>
    </footer>
  );
}
