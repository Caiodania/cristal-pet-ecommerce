import { FaHeart, FaPrint, FaWhatsapp } from "react-icons/fa6";
import { Card } from "@/components/ui/Card";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";

const benefits = [
  {
    Icon: FaHeart,
    title: "Sob medida, do seu pet",
    text: "Cada escultura é feita a partir da foto do seu pet, não é uma peça de catálogo.",
  },
  {
    Icon: FaPrint,
    title: "Impressa em 3D pela nossa equipe",
    text: "A peça é impressa pela própria equipe da Cristal Pet, a partir do modelo 3D gerado com a foto.",
  },
  {
    Icon: FaWhatsapp,
    title: "Atendimento direto no WhatsApp",
    text: "Você fala com a gente do início ao fim: pedido, pagamento e entrega combinados em uma conversa.",
  },
];

/** Três cards de qualidade, na faixa magenta da marca. TODO-CLIENTE: acrescentar material e garantia. */
export function Benefits() {
  return (
    <Section id="qualidade" tone="magenta" wave="cream" labelledBy="qualidade-titulo" className="overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="drift absolute -left-24 top-10 size-96 rounded-full bg-white/10 blur-3xl" />
        <div
          className="drift absolute -right-24 bottom-10 size-96 rounded-full bg-teal/20 blur-3xl"
          style={{ animationDelay: "-8s" }}
        />
      </div>
      <div className="relative">
        <SectionHeader
          eyebrow="Qualidade Cristal Pet"
          titleId="qualidade-titulo"
          title={
            <>
              Um cuidado que vai <Accent>além da foto</Accent>
            </>
          }
        />
        <ul className="mt-14 grid gap-8 lg:grid-cols-3">
          {benefits.map(({ Icon, title, text }, index) => (
            <Card
              as="li"
              key={title}
              tilt={index % 2 === 0 ? "left" : "right"}
              className="reveal group flex flex-col items-center rounded-3xl text-center transition-[translate,box-shadow] duration-300 hover:-translate-y-2"
            >
              <span
                aria-hidden="true"
                className="grid size-16 place-items-center rounded-full bg-teal text-3xl text-ink transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
              >
                <Icon />
              </span>
              <h3 className="mt-5 text-xl font-extrabold">{title}</h3>
              <p className="mt-3 text-ink-soft">{text}</p>
            </Card>
          ))}
        </ul>
      </div>
    </Section>
  );
}
