import Image from "next/image";
import { Accent, Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { WhatsAppButton } from "@/components/ui/CtaButtons";
import { CheckIcon } from "@/components/ui/icons";
import { franquia } from "@/content/banho-e-tosa";
import { images } from "@/content/images";
import { site } from "@/content/site";

/** "Seja um franqueado": cartaz, argumentos e CTA. Na home leva à página de franquias. */
export function FranchiseBand({
  tone = "sand",
  withDetailsLink = true,
  heading: Heading = "h2",
}: {
  tone?: "cream" | "sand";
  withDetailsLink?: boolean;
  /** h1 na página de franquias; h2 quando é uma seção da home. */
  heading?: "h1" | "h2";
}) {
  return (
    <Section id="franquia" tone={tone} labelledBy="franquia-titulo">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Image
          src={images.franquia.cartaz.src}
          alt={images.franquia.cartaz.alt}
          width={images.franquia.cartaz.width}
          height={images.franquia.cartaz.height}
          sizes="(max-width: 1024px) 70vw, 320px"
          className="mx-auto h-auto w-full max-w-[18rem] -rotate-2 rounded-card border-4 border-white bg-white shadow-lift sm:max-w-xs"
        />

        <div>
          <p className="mb-4 flex items-center gap-3 text-eyebrow font-bold uppercase text-teal-deep">
            <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
            Expanda com a gente
          </p>
          <Heading
            id="franquia-titulo"
            className={Heading === "h1" ? "text-display font-medium" : "text-title font-medium"}
          >
            Seja um <Accent>franqueado</Accent> Cristal Pet
          </Heading>
          <p className="mt-5 text-lead text-ink-soft">{franquia.intro}</p>

          <ul className="mt-6 grid gap-3">
            {franquia.highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckIcon className="mt-1 shrink-0 text-xl text-teal-deep" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <WhatsAppButton message={site.whatsapp.messages.franquia}>
              Quero ser franqueado
            </WhatsAppButton>
            {withDetailsLink && (
              <Button href="/franquias" variant="ghost">
                Ver detalhes da franquia
              </Button>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
