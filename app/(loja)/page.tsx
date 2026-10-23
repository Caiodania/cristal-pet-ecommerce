import { Marquee } from "@/components/ui/Marquee";
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
      {/* fita colada na divisa entre o hero e a vitrine */}
      <div className="relative z-10 -mt-12 overflow-x-clip py-4 md:-mt-14">
        <Marquee
          className="-rotate-1 scale-x-[1.04] shadow-lift"
          items={[
            "Escultura 3D do seu pet",
            "Nome em relevo na base",
            "Prévia antes de pedir",
            "Impressa em 3D",
            "Pedido pelo WhatsApp",
          ]}
        />
      </div>
      <Showcase />
      <HowItWorks />
      <Products />
      <Benefits />
      <FaqSection tone="cream" wave="magenta" />
      <FinalCta />
    </main>
  );
}
