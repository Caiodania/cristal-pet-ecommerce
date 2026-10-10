import { AboutSection } from "@/components/sections/AboutSection";
import { CoverageSection } from "@/components/sections/CoverageSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FeedbackSection } from "@/components/sections/FeedbackSection";
import { FinalCta } from "@/components/sections/FinalCta";
import { FranchiseBand } from "@/components/sections/FranchiseBand";
import { GallerySection } from "@/components/sections/GallerySection";
import { HomeHero } from "@/components/sections/HomeHero";
import { MobileUnit } from "@/components/sections/MobileUnit";
import { PuppiesBand } from "@/components/sections/PuppiesBand";
import { SculptureShowcase } from "@/components/sections/SculptureShowcase";
import { SizesSection } from "@/components/sections/SizesSection";
import { StepsSection } from "@/components/sections/StepsSection";
import { WhySection } from "@/components/sections/WhySection";
import { Accent } from "@/components/ui/Section";
import { passosServico } from "@/content/banho-e-tosa";
import { faqHome } from "@/content/faq";
import { site } from "@/content/site";

// Home híbrida: duas portas no hero (escultura e banho e tosa) e, abaixo, o
// ritmo da página de referência. Tons de fundo alternados entre as seções.
export default function Home() {
  return (
    <main id="conteudo">
      <HomeHero />
      <SculptureShowcase />
      <SizesSection tone="cream" moreHref="/esculturas#tamanhos" />
      <GallerySection tone="sand" />
      <PuppiesBand />
      <MobileUnit tone="cream" />
      <StepsSection
        tone="sand"
        eyebrow="Como funciona o banho e tosa"
        title={
          <>
            Cuidado premium em <Accent>4 passos</Accent> simples
          </>
        }
        steps={passosServico}
      />
      <WhySection />
      <AboutSection tone="sand" />
      <CoverageSection tone="mist" />
      <FeedbackSection tone="cream" />
      <FranchiseBand tone="sand" />
      <FaqSection
        items={faqHome}
        name="faq-home"
        message={site.whatsapp.defaultMessage}
        tone="cream"
      />
      <FinalCta focus="escultura" />
    </main>
  );
}
