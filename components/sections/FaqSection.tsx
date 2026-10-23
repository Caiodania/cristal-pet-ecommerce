import { Accordion } from "@/components/ui/Accordion";
import { WhatsAppButton } from "@/components/ui/CtaButtons";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { faq } from "@/content/faq";
import { site } from "@/content/site";

/** Perguntas frequentes em acordeão nativo, com o WhatsApp para quem não achou a resposta. */
export function FaqSection({ tone = "cream", wave }: { tone?: "cream" | "sand"; wave?: "cream" | "sand" | "teal" | "magenta" }) {
  return (
    <Section id="faq" tone={tone} wave={wave} labelledBy="faq-titulo">
      <SectionHeader
        eyebrow="Perguntas frequentes"
        titleId="faq-titulo"
        title={
          <>
            Tire as suas <Accent>dúvidas</Accent>
          </>
        }
      />
      <Accordion items={faq} name="faq" className="mx-auto mt-10 max-w-3xl" />
      <div className="mt-10 text-center">
        <p className="text-ink-soft">Não encontrou o que procurava?</p>
        <WhatsAppButton
          variant="secondary"
          size="md"
          message={site.whatsapp.messages.duvida}
          className="mt-4"
        >
          Fale com a gente
        </WhatsAppButton>
      </div>
    </Section>
  );
}
