import type { Metadata } from "next";
import { BanhoHero, LowStressSection, ServiceCards } from "@/components/sections/BanhoSections";
import { CoverageSection } from "@/components/sections/CoverageSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FeedbackSection } from "@/components/sections/FeedbackSection";
import { FinalCta } from "@/components/sections/FinalCta";
import { MobileUnit } from "@/components/sections/MobileUnit";
import { PuppiesBand } from "@/components/sections/PuppiesBand";
import { StepsSection } from "@/components/sections/StepsSection";
import { WhySection } from "@/components/sections/WhySection";
import { Accent } from "@/components/ui/Section";
import { passosServico } from "@/content/banho-e-tosa";
import { faqBanho } from "@/content/faq";
import { site } from "@/content/site";

// Provisório: título e descrição finais de SEO entram na etapa 4.
export const metadata: Metadata = {
  title: "Banho e tosa móvel em Indaiatuba, Campinas, Valinhos e Vinhedo",
  description:
    "Banho e tosa móvel com método Low Stress, na porta da sua casa. Atendimento exclusivo, sem gaiolas, em Indaiatuba, Campinas, Valinhos e Vinhedo.",
  alternates: { canonical: "/banho-e-tosa" },
};

// Linha de serviço: o conteúdo completo do banho e tosa móvel.
export default function BanhoETosaPage() {
  return (
    <main id="conteudo">
      <BanhoHero />
      <ServiceCards tone="sand" />
      <LowStressSection tone="cream" />
      <PuppiesBand />
      <MobileUnit tone="cream" />
      <StepsSection
        tone="sand"
        eyebrow="Como funciona"
        title={
          <>
            Cuidado premium em <Accent>4 passos</Accent> simples
          </>
        }
        steps={passosServico}
      />
      <WhySection />
      <CoverageSection tone="mist" />
      <FeedbackSection tone="cream" />
      <FaqSection
        items={faqBanho}
        name="faq-banho"
        message={site.whatsapp.defaultMessage}
        tone="sand"
      />
      <FinalCta focus="banho" />
    </main>
  );
}
