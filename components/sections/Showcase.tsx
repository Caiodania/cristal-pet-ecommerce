import { Carousel } from "@/components/ui/Carousel";
import { Placeholder } from "@/components/ui/Placeholder";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";

/** Vitrine de esculturas prontas (carrossel). TODO-FOTO: só com autorização do tutor. */
export function Showcase() {
  return (
    <Section id="exemplos" tone="sand" labelledBy="exemplos-titulo">
      <SectionHeader
        eyebrow="Exemplos"
        titleId="exemplos-titulo"
        title={
          <>
            Esculturas que já <Accent>ganharam vida</Accent>
          </>
        }
        description="Pets de verdade, eternizados em 3D a partir de uma foto."
      />
      <Carousel
        label="Exemplos de esculturas"
        className="mt-12"
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
    </Section>
  );
}
