import Image from "next/image";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WhatsAppButton } from "@/components/ui/CtaButtons";
import { CheckIcon } from "@/components/ui/icons";
import { InstagramFacade } from "@/components/ui/InstagramFacade";
import { servicos } from "@/content/banho-e-tosa";
import { images } from "@/content/images";
import { metodoLowStressReel } from "@/content/instagram";
import { site } from "@/content/site";
import { agendarMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

/** Primeira dobra de /banho-e-tosa: proposta principal e o CTA de agendamento. */
export function BanhoHero() {
  return (
    <section
      aria-labelledby="banho-titulo"
      className="relative overflow-hidden bg-cream pb-16 pt-10 sm:pt-14 lg:pb-24 lg:pt-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(48rem_26rem_at_90%_0%,var(--color-teal-mist),transparent)]"
      />
      <div className="container-page relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="mb-4 flex items-center gap-3 text-eyebrow font-bold uppercase text-teal-deep">
            <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
            Banho e tosa móvel
          </p>
          <h1 id="banho-titulo" className="text-display font-medium">
            Conforto, segurança e <Accent>zero estresse</Accent>, na porta da sua
            casa.
          </h1>
          <p className="mt-5 max-w-xl text-lead text-ink-soft">
            O cuidado premium que seu melhor amigo merece, com o método Low
            Stress e atendimento exclusivo dentro da nossa unidade móvel.
          </p>
          <p className="mt-4 font-semibold">
            Atendemos {site.cities.slice(0, -1).join(", ")} e{" "}
            {site.cities[site.cities.length - 1]}.
          </p>
          <WhatsAppButton message={agendarMessage()} className="mt-8">
            Agendar pelo WhatsApp
          </WhatsAppButton>
        </div>

        <Image
          src={images.heroCao.src}
          alt={images.heroCao.alt}
          width={images.heroCao.width}
          height={images.heroCao.height}
          priority
          sizes="(max-width: 1024px) 80vw, 480px"
          className="mx-auto h-auto w-full max-w-md"
        />
      </div>
    </section>
  );
}

/** Os três serviços. Preço: TODO-CLIENTE ("a partir de R$"). */
export function ServiceCards({ tone = "sand" }: { tone?: "cream" | "sand" }) {
  return (
    <Section id="servicos" tone={tone} labelledBy="servicos-titulo">
      <SectionHeader
        eyebrow="Nossos serviços"
        titleId="servicos-titulo"
        title={
          <>
            Tudo o que seu pet precisa, <Accent>sem sair de casa</Accent>
          </>
        }
        description="Banho, tosa e hidratação em um único atendimento, adaptados à raça, à pelagem e às necessidades de cada pet."
      />
      <ul className="mt-12 grid gap-5 lg:grid-cols-3">
        {servicos.map((servico) => (
          <Card as="li" key={servico.id} className="reveal flex flex-col items-center text-center">
            <Image
              src={servico.icon.src}
              alt={servico.icon.alt}
              width={servico.icon.width}
              height={servico.icon.height}
              className="size-24"
            />
            <h3 className="mt-4 font-display text-xl font-medium">{servico.title}</h3>
            <p className="mt-3 text-ink-soft">{servico.description}</p>
            <a
              href={buildWhatsAppUrl(agendarMessage({ service: servico.whatsapp }))}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex min-h-11 items-center pt-4 font-semibold text-teal-deep underline underline-offset-4"
            >
              Agendar este serviço
              <span className="sr-only">
                {" "}
                ({servico.title}, abre o WhatsApp em nova aba)
              </span>
            </a>
          </Card>
        ))}
      </ul>
    </Section>
  );
}

const lowStressPoints = [
  "Sem gaiolas",
  "Um pet de cada vez, sem o barulho de outros animais",
  "Água aquecida e equipamentos apresentados no ritmo dele",
];

/** Método Low Stress, com o reel em fachada. */
export function LowStressSection({ tone = "cream" }: { tone?: "cream" | "sand" }) {
  return (
    <Section id="low-stress" tone={tone} labelledBy="low-stress-titulo">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeader
            align="start"
            eyebrow="Nosso método"
            titleId="low-stress-titulo"
            title={
              <>
                Método <Accent>Low Stress</Accent>
              </>
            }
            description="Nosso atendimento é 100% focado no bem-estar do seu pet: um ambiente tranquilo para reduzir a ansiedade, no tempo dele."
          />
          <ul className="mt-6 grid gap-3">
            {lowStressPoints.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckIcon className="mt-1 shrink-0 text-xl text-teal-deep" />
                {point}
              </li>
            ))}
          </ul>
          <Button href="#faq" variant="ghost" className="mt-6">
            Tire as suas dúvidas
          </Button>
        </div>

        <InstagramFacade
          permalink={metodoLowStressReel.permalink}
          description={metodoLowStressReel.description}
          className="mx-auto w-full max-w-sm"
        />
      </div>
    </Section>
  );
}
