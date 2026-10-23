import { Carousel } from "@/components/ui/Carousel";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { exemplos, exemplosProntos } from "@/content/exemplos";
import { SculptureCard } from "./SculptureCard";

const MIN_CARDS = 4;

/**
 * Vitrine de exemplos (carrossel). As esculturas já geradas vêm primeiro; se
 * houver menos de quatro, os outros pets completam com o espaço da escultura
 * reservado ("em breve"). Para preencher: docs/prompts-esculturas.md e
 * `npm run esculturas`.
 */
export function Showcase() {
  const pending = exemplos.filter((e) => !e.sculpture);
  const items = [...exemplosProntos, ...pending.slice(0, Math.max(0, MIN_CARDS - exemplosProntos.length))];
  return (
    <Section id="exemplos" tone="cream" wave="teal" labelledBy="exemplos-titulo">
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
        {items.map((item) => (
          <SculptureCard key={item.id} item={item} />
        ))}
      </Carousel>
    </Section>
  );
}
