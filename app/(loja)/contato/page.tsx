import type { Metadata } from "next";
import { FaClock, FaEnvelope, FaLocationDot, FaWhatsapp } from "react-icons/fa6";
import { Card } from "@/components/ui/Card";
import { WhatsAppButton } from "@/components/ui/CtaButtons";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { site } from "@/content/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

// Provisório: título e descrição finais de SEO entram na etapa de SEO.
export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com a Cristal Pet pelo WhatsApp ou e-mail. Atendimento de segunda a sexta, das 8h às 17h, e aos sábados, das 8h às 13h.",
  alternates: { canonical: "/contato" },
};

const linkClass = "inline-flex min-h-11 items-center font-semibold text-teal-deep underline underline-offset-4";

// O formulário de contato (Netlify Forms, com honeypot) entra na etapa de formulários.
export default function ContatoPage() {
  return (
    <main id="conteudo">
      <Section tone="cream" labelledBy="contato-titulo">
        <SectionHeader
          as="h1"
          eyebrow="Contato"
          titleId="contato-titulo"
          title={
            <>
              Fale com a <Accent>Cristal Pet</Accent>
            </>
          }
          description={`O jeito mais rápido é o WhatsApp. Atendemos ${site.hoursSentence}.`}
        />

        <div className="mt-8 flex justify-center">
          <WhatsAppButton message={site.whatsapp.messages.duvida}>Falar no WhatsApp</WhatsAppButton>
        </div>

        <ul className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-2">
          <Card as="li">
            <FaWhatsapp aria-hidden="true" className="text-3xl text-teal-deep" />
            <h2 className="mt-3 font-display text-xl font-medium">WhatsApp</h2>
            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {site.whatsapp.display}
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </Card>

          <Card as="li">
            <FaEnvelope aria-hidden="true" className="text-3xl text-teal-deep" />
            <h2 className="mt-3 font-display text-xl font-medium">E-mail</h2>
            <a href={`mailto:${site.email}`} className={`${linkClass} break-all`}>
              {site.email}
            </a>
          </Card>

          <Card as="li">
            <FaClock aria-hidden="true" className="text-3xl text-teal-deep" />
            <h2 className="mt-3 font-display text-xl font-medium">Horário</h2>
            <ul className="text-ink-soft">
              {site.hours.map((line) => (
                <li key={line.days}>
                  <span className="font-semibold text-ink">{line.days}:</span> {line.time}
                </li>
              ))}
            </ul>
          </Card>

          <Card as="li">
            <FaLocationDot aria-hidden="true" className="text-3xl text-teal-deep" />
            <h2 className="mt-3 font-display text-xl font-medium">Endereço</h2>
            <address className="not-italic text-ink-soft">
              {site.address.street}, {site.address.city} - {site.address.region}
            </address>
          </Card>
        </ul>
      </Section>
    </main>
  );
}
