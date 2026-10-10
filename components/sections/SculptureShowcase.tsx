import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Carousel } from "@/components/ui/Carousel";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Placeholder } from "@/components/ui/Placeholder";

const steps = [
  "Envie a foto do seu pet",
  "Veja a prévia em 3D",
  "Combine o pedido pelo WhatsApp",
];

/** Home: vitrine de esculturas (carrossel) e o resumo dos 3 passos. */
export function SculptureShowcase() {
  return (
    <Section id="esculturas" tone="sand" labelledBy="esculturas-titulo">
      <SectionHeader
        eyebrow="Escultura 3D"
        titleId="esculturas-titulo"
        title={
          <>
            O seu pet, <Accent>em escultura</Accent>
          </>
        }
        description="Cada peça nasce da foto do seu pet e é impressa em 3D pela nossa equipe."
      />

      <ol className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row sm:justify-center sm:gap-8">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-3 text-ink-soft">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-cream"
            >
              {index + 1}
            </span>
            <span className="font-semibold">{step}</span>
          </li>
        ))}
      </ol>

      <Carousel
        label="Exemplos de esculturas"
        className="mt-10"
        slideClassName="w-[72%] sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]"
      >
        {[1, 2, 3, 4].map((n) => (
          <Placeholder
            key={n}
            label="Foto da escultura"
            todo={`TODO-FOTO: escultura de exemplo ${n} (com autorização do tutor)`}
            ratio="portrait"
          />
        ))}
      </Carousel>

      <div className="mt-8 text-center">
        <Button
          href="/esculturas"
          variant="ghost"
          icon={<ArrowRightIcon className="text-lg" />}
          iconPosition="end"
        >
          Ver como funciona
        </Button>
      </div>
    </Section>
  );
}
