import { FaCamera, FaWandMagicSparkles, FaWhatsapp } from "react-icons/fa6";
import { Card } from "@/components/ui/Card";
import { Bubbles } from "@/components/ui/decor";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { passos, previewsPerAccount } from "@/content/estatua";

const icons = [FaCamera, FaWandMagicSparkles, FaWhatsapp];

/**
 * "Como funciona": os três passos da compra, em cartões brancos soltos sobre a
 * faixa verde-água, ligados por uma linha pontilhada no desktop. Cada passo tem
 * o seu ícone e o número em marca-d'água.
 */
export function HowItWorks() {
  return (
    <Section id="como-funciona" tone="teal" wave="cream" labelledBy="como-funciona-titulo" className="overflow-hidden">
      <Bubbles className="-right-24 -top-20 w-80 opacity-30" />
      <Bubbles className="-bottom-24 -left-24 w-72 opacity-25" />
      <div className="relative">
        <SectionHeader
          eyebrow="Como funciona"
          titleId="como-funciona-titulo"
          title={
            <>
              Em <Accent>três passos</Accent>
            </>
          }
          description={`Crie uma conta grátis, gere até ${previewsPerAccount} prévias sem pagar nada e só peça se gostar.`}
        />
        <div className="relative mt-16">
          <span
            aria-hidden="true"
            className="absolute left-[17%] right-[17%] top-9 hidden border-t-4 border-dashed border-white/80 lg:block"
          />
          <ol className="relative grid gap-8 lg:grid-cols-3">
            {passos.map((passo, index) => {
              const Icon = icons[index] ?? FaCamera;
              return (
                <Card
                  as="li"
                  key={passo.number}
                  tilt={index % 2 === 0 ? "left" : "right"}
                  className="reveal group relative flex flex-col items-center overflow-visible! rounded-3xl pt-12 text-center transition-[translate,box-shadow] duration-300 hover:-translate-y-2"
                >
                  <span
                    aria-hidden="true"
                    className="absolute right-5 top-1 font-display text-8xl font-extrabold leading-none text-magenta/10"
                  >
                    {passo.number}
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-0 grid size-[4.5rem] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-magenta text-3xl text-white shadow-lift transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 motion-safe:rotate-3"
                  >
                    <Icon />
                  </span>
                  <h3 className="mt-6 text-2xl font-extrabold">{passo.title}</h3>
                  <p className="mt-3 text-ink-soft">{passo.description}</p>
                </Card>
              );
            })}
          </ol>
        </div>
      </div>
    </Section>
  );
}
