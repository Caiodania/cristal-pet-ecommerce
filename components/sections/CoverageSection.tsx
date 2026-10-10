import Image from "next/image";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { WhatsAppButton } from "@/components/ui/CtaButtons";
import { CheckIcon } from "@/components/ui/icons";
import { images } from "@/content/images";
import { site } from "@/content/site";
import { agendarMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

/** "Onde atendemos": cada cidade é um atalho para o WhatsApp com a cidade na mensagem. */
export function CoverageSection({ tone = "mist" }: { tone?: "cream" | "mist" }) {
  return (
    <Section id="cidades" tone={tone} labelledBy="cidades-titulo">
      <SectionHeader
        eyebrow="Onde atendemos"
        titleId="cidades-titulo"
        title={
          <>
            O melhor cuidado pet para <Accent>toda a região</Accent>
          </>
        }
        description="Nossa frota e nossos franqueados atendem hoje as cidades abaixo. Toque na sua para agendar."
      />

      <ul className="mt-8 flex flex-wrap justify-center gap-3">
        {site.cities.map((city) => (
          <li key={city}>
            <a
              href={buildWhatsAppUrl(agendarMessage({ city }))}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${city}: agendar pelo WhatsApp (abre em nova aba)`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-5 font-semibold shadow-soft transition-colors hover:bg-ink hover:text-cream"
            >
              <CheckIcon className="text-teal-deep" />
              {city}
            </a>
          </li>
        ))}
      </ul>

      <Image
        src={images.cidades.src}
        alt={images.cidades.alt}
        width={images.cidades.width}
        height={images.cidades.height}
        sizes="(max-width: 768px) 100vw, 672px"
        className="mx-auto mt-10 h-auto w-full max-w-2xl"
      />

      <div className="mt-10 text-center">
        <p className="text-lead text-ink-soft">
          Não encontrou a sua cidade? Fale com a gente: talvez já estejamos
          chegando perto de você.
        </p>
        <WhatsAppButton message={site.whatsapp.messages.cidade} className="mt-6">
          Fale com a gente
        </WhatsAppButton>
      </div>
    </Section>
  );
}
