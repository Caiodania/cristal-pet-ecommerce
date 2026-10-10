import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { Accordion } from "@/components/ui/Accordion";
import { WhatsAppButton } from "@/components/ui/CtaButtons";
import type { FaqItem } from "@/content/faq";

type FaqSectionProps = {
  items: FaqItem[];
  /** Nome do grupo do acordeão (um diferente por acordeão na página). */
  name: string;
  /** Mensagem do WhatsApp do botão "Fale com a gente". */
  message: string;
  id?: string;
  tone?: "cream" | "sand";
};

/** Perguntas frequentes em acordeão nativo, com o WhatsApp para quem não achou a resposta. */
export function FaqSection({
  items,
  name,
  message,
  id = "faq",
  tone = "cream",
}: FaqSectionProps) {
  return (
    <Section id={id} tone={tone} labelledBy={`${id}-titulo`}>
      <SectionHeader
        eyebrow="Perguntas frequentes"
        titleId={`${id}-titulo`}
        title={
          <>
            Tire as suas <Accent>dúvidas</Accent>
          </>
        }
      />
      <Accordion items={items} name={name} className="mx-auto mt-10 max-w-3xl" />
      <div className="mt-10 text-center">
        <p className="text-ink-soft">Não encontrou o que procurava?</p>
        <WhatsAppButton variant="secondary" size="md" message={message} className="mt-4">
          Fale com a gente
        </WhatsAppButton>
      </div>
    </Section>
  );
}
