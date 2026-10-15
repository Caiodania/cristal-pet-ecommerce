import { Benefits } from "@/components/sections/Benefits";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCta } from "@/components/sections/FinalCta";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Products } from "@/components/sections/Products";
import { Showcase } from "@/components/sections/Showcase";
import { StoreHero } from "@/components/sections/StoreHero";

// Vitrine da loja: hero com um CTA, exemplos, como funciona, produtos com preço,
// benefícios e perguntas. Tons de fundo alternados entre as seções.
export default function Home() {
  return (
    <main id="conteudo">
      <StoreHero />
      <Showcase />
      <HowItWorks />
      <Products />
      <Benefits />
      <FaqSection tone="sand" />
      <FinalCta />
    </main>
  );
}
