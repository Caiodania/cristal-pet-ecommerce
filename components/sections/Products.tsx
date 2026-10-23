import { Playground } from "@/components/store/Playground";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";

/**
 * "Monte a sua": tamanho, tipo e cor com prévia ao vivo (components/store/
 * Playground.tsx). Medidas, preços e cores vêm de content/estatua.ts
 * (TODO-CLIENTE: valores reais).
 */
export function Products() {
  return (
    <Section id="tamanhos" tone="cream" wave="magenta" labelledBy="tamanhos-titulo">
      <SectionHeader
        eyebrow="Monte a sua"
        titleId="tamanhos-titulo"
        title={
          <>
            Escolha, veja como fica e <Accent>peça</Accent>
          </>
        }
        description="Mude o tamanho, o tipo e a cor e a escultura muda na hora. É só um gostinho: o nome e a foto do seu pet vêm no próximo passo."
      />
      <Playground />
    </Section>
  );
}
