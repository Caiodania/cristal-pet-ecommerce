import Image from "next/image";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { CreateButton, WhatsAppButton } from "@/components/ui/CtaButtons";
import { Bubbles, TiltedOutline } from "@/components/ui/decor";
import { Section } from "@/components/ui/Section";
import { exemplos } from "@/content/exemplos";
import { site } from "@/content/site";

/**
 * Chamada final, em faixa magenta (branco: 4,95:1) com a escultura da Mel de
 * novo à vista e a onda para o rodapé verde-água.
 */
export function FinalCta() {
  const sculpture = exemplos[0].sculpture;
  return (
    <Section tone="magenta" wave="teal" labelledBy="cta-final-titulo" className="overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="drift absolute -right-20 -top-24 size-[28rem] rounded-full bg-white/15 blur-3xl" />
        <div
          className="drift absolute -bottom-32 left-1/4 size-[26rem] rounded-full bg-teal/25 blur-3xl"
          style={{ animationDelay: "-7s" }}
        />
      </div>
      <Bubbles className="-left-24 top-0 w-72 opacity-30" />

      <div className="relative grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="text-center lg:text-left">
          <h2
            id="cta-final-titulo"
            className="text-[length:clamp(2.25rem,1.4rem+3.8vw,4.25rem)] font-extrabold leading-[1.04]"
          >
            Vamos eternizar o seu melhor amigo?
          </h2>
          <p className="mt-5 max-w-xl text-lead lg:max-w-lg">
            Envie a foto e veja a prévia. O pedido é combinado direto com a gente pelo WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
            <CreateButton className="btn-sheen-loop" />
            <WhatsAppButton variant="secondary" message={site.whatsapp.messages.duvida}>
              Tirar uma dúvida
            </WhatsAppButton>
          </div>
        </div>

        {sculpture && (
          <div className="relative mx-auto w-full max-w-xs">
            <TiltedOutline rotate={-4} x={-12} y={12} className="rounded-[2rem]" />
            <figure className="relative rotate-3 overflow-hidden rounded-[2rem] border-4 border-white shadow-lift transition-transform duration-500 hover:rotate-0">
              <Image
                src={sculpture.src}
                alt={sculpture.alt}
                width={sculpture.width}
                height={sculpture.height}
                sizes="(max-width: 1024px) 70vw, 340px"
                className="aspect-[4/5] w-full object-cover"
              />
            </figure>
            <span className="float-slow pointer-events-none absolute -left-4 bottom-10 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-ink shadow-lift">
              <FaWandMagicSparkles aria-hidden="true" className="text-magenta" />
              Prévia grátis
            </span>
          </div>
        )}
      </div>
    </Section>
  );
}
