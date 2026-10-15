import { CreateButton, WhatsAppButton } from "@/components/ui/CtaButtons";
import { Section } from "@/components/ui/Section";
import { site } from "@/content/site";

/** Chamada final, em faixa de marca (texto ink: 7,8:1 sobre o teal). */
export function FinalCta() {
  return (
    <Section tone="teal" labelledBy="cta-final-titulo">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="cta-final-titulo" className="text-title font-medium">
          Vamos eternizar o seu melhor amigo?
        </h2>
        <p className="mt-4 text-lead text-ink/80">
          Envie a foto e veja a prévia. O pedido é combinado direto com a gente pelo WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <CreateButton />
          <WhatsAppButton variant="secondary" message={site.whatsapp.messages.duvida}>
            Tirar uma dúvida
          </WhatsAppButton>
        </div>
      </div>
    </Section>
  );
}
