import { Card } from "@/components/ui/Card";
import { CubeIcon } from "@/components/ui/icons";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";

const benefits = [
  {
    title: "Sob medida, do seu pet",
    text: "Cada escultura é feita a partir da foto do seu pet, não é uma peça de catálogo.",
  },
  {
    title: "Impressa em 3D pela nossa equipe",
    text: "A peça é impressa pela própria equipe da Cristal Pet, a partir do modelo 3D gerado com a foto.",
  },
  {
    title: "Atendimento direto no WhatsApp",
    text: "Você fala com a gente do início ao fim: pedido, pagamento e entrega combinados em uma conversa.",
  },
];

/** Três cards de qualidade. TODO-CLIENTE: acrescentar material e garantia. */
export function Benefits() {
  return (
    <Section id="qualidade" tone="cream" labelledBy="qualidade-titulo">
      <SectionHeader
        eyebrow="Qualidade Cristal Pet"
        titleId="qualidade-titulo"
        title={
          <>
            Um cuidado que vai <Accent>além da foto</Accent>
          </>
        }
      />
      <ul className="mt-12 grid gap-5 lg:grid-cols-3">
        {benefits.map((item) => (
          <Card as="li" key={item.title} className="reveal">
            <span className="grid size-12 place-items-center rounded-full bg-teal text-ink">
              <CubeIcon className="text-2xl" />
            </span>
            <h3 className="mt-4 font-display text-xl font-medium">{item.title}</h3>
            <p className="mt-3 text-ink-soft">{item.text}</p>
          </Card>
        ))}
      </ul>
    </Section>
  );
}
