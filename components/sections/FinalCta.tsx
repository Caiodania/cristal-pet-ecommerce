import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SculptureButton, WhatsAppButton } from "@/components/ui/CtaButtons";
import { site } from "@/content/site";
import { agendarMessage } from "@/lib/whatsapp";

type FinalCtaProps = {
  /** Qual oferta a chamada destaca. */
  focus?: "escultura" | "banho" | "franquia";
};

const copy = {
  escultura: {
    title: "Vamos eternizar o seu melhor amigo?",
    text: "Envie a foto e veja a prévia em 3D. O pedido é combinado direto com a gente pelo WhatsApp.",
  },
  banho: {
    title: "Vamos cuidar do seu pet com carinho?",
    text: `Fale com a gente pelo WhatsApp e agende o banho e tosa na porta da sua casa. Atendemos ${site.hoursSentence}.`,
  },
  franquia: {
    title: "Quer levar a Cristal Pet para a sua cidade?",
    text: "Fale com a gente pelo WhatsApp e conheça o modelo de franquia.",
  },
} as const;

/** Chamada final, em faixa de marca (texto ink: 7,8:1 sobre o teal). */
export function FinalCta({ focus = "escultura" }: FinalCtaProps) {
  const { title, text } = copy[focus];

  return (
    <Section tone="teal" labelledBy="cta-final-titulo">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="cta-final-titulo" className="text-title font-medium">
          {title}
        </h2>
        <p className="mt-4 text-lead text-ink/80">{text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {focus === "escultura" && (
            <>
              <SculptureButton>Criar minha escultura</SculptureButton>
              <WhatsAppButton variant="secondary" message={agendarMessage()}>
                Agendar banho e tosa
              </WhatsAppButton>
            </>
          )}
          {focus === "banho" && (
            <>
              <WhatsAppButton message={agendarMessage()}>
                Agendar pelo WhatsApp
              </WhatsAppButton>
              <Button href="/esculturas" variant="secondary" size="lg">
                Conhecer as esculturas
              </Button>
            </>
          )}
          {focus === "franquia" && (
            <WhatsAppButton message={site.whatsapp.messages.franquia}>
              Quero ser franqueado
            </WhatsAppButton>
          )}
        </div>
      </div>
    </Section>
  );
}
