import type { Metadata } from "next";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCta } from "@/components/sections/FinalCta";
import {
  ManifestoBand,
  PhotoTipsSection,
  PosesSection,
  QualitySection,
  ReadyStrip,
  RealPetsSection,
  SculptureHero,
} from "@/components/sections/SculptureSections";
import { SizesSection } from "@/components/sections/SizesSection";
import { StepsSection } from "@/components/sections/StepsSection";
import { Accent } from "@/components/ui/Section";
import { passosEscultura } from "@/content/estatua";
import { faqEscultura } from "@/content/faq";
import { site } from "@/content/site";

// Provisório: título e descrição finais de SEO entram na etapa 4.
export const metadata: Metadata = {
  title: "Escultura 3D do seu pet",
  description:
    "Envie a foto do seu pet, veja a prévia em 3D e peça pelo WhatsApp. Escultura impressa em 3D pela Cristal Pet Móvel.",
  alternates: { canonical: "/esculturas" },
};

// Funil da escultura: do exemplo ao pedido. O configurador de 7 passos entra na
// fase 1B em /personalizar; até lá, todos os CTAs abrem o WhatsApp.
export default function EsculturasPage() {
  return (
    <main id="conteudo">
      <SculptureHero />
      <RealPetsSection tone="sand" />
      <PosesSection tone="cream" />
      <ReadyStrip />
      <ManifestoBand />
      <QualitySection tone="cream" />
      <StepsSection
        tone="sand"
        eyebrow="Como funciona"
        title={
          <>
            Em <Accent>três passos</Accent>
          </>
        }
        steps={passosEscultura}
      />
      <SizesSection tone="cream" withComparison />
      <PhotoTipsSection tone="mist" />
      <FaqSection
        items={faqEscultura}
        name="faq-escultura"
        message={site.whatsapp.messages.escultura}
        tone="sand"
      />
      <FinalCta focus="escultura" />
    </main>
  );
}
