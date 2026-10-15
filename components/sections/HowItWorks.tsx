import { Card } from "@/components/ui/Card";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { passos } from "@/content/estatua";

/** "Como funciona": os três passos da compra. */
export function HowItWorks() {
  return (
    <Section id="como-funciona" tone="cream" labelledBy="como-funciona-titulo">
      <SectionHeader
        eyebrow="Como funciona"
        titleId="como-funciona-titulo"
        title={
          <>
            Em <Accent>três passos</Accent>
          </>
        }
        description="Sem cadastro, sem senha e sem pagar nada para ver a prévia."
      />
      <ol className="mt-12 grid gap-6 lg:grid-cols-3">
        {passos.map((passo) => (
          <Card as="li" key={passo.number} className="reveal">
            <p className="font-display text-5xl font-medium text-teal-deep">{passo.number}</p>
            <h3 className="mt-3 font-display text-xl font-medium">{passo.title}</h3>
            <p className="mt-3 text-ink-soft">{passo.description}</p>
          </Card>
        ))}
      </ol>
    </Section>
  );
}
