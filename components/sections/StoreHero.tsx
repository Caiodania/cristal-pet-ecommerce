import Image from "next/image";
import { FaPaw, FaWandMagicSparkles } from "react-icons/fa6";
import { Button } from "@/components/ui/Button";
import { CreateButton } from "@/components/ui/CtaButtons";
import { CompareSlider } from "@/components/ui/CompareSlider";
import { Bubbles, ClawMark, Paw, SpinBadge, TiltedOutline } from "@/components/ui/decor";
import { CheckIcon } from "@/components/ui/icons";
import { Accent, Section } from "@/components/ui/Section";
import { previewsPerAccount } from "@/content/estatua";
import { exemplos } from "@/content/exemplos";

const points = ["Prévia antes de pedir", "Impressa em 3D", `${previewsPerAccount} prévias grátis por conta`];

/**
 * Primeira dobra da loja. Texto à esquerda, e à direita o comparador: arraste
 * o divisor e a foto da Mel vira a escultura dela. Faixa verde-água da marca,
 * com bolhas, patinhas e manchas de cor em movimento lento. Um CTA primário.
 */
export function StoreHero() {
  const { photo, sculpture } = exemplos[0];
  return (
    <Section tone="teal" wave="cream" labelledBy="hero-titulo" className="overflow-hidden">
      {/* fundo: manchas de luz e cor, bolhas e patinhas (tudo decorativo) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="drift absolute -right-32 -top-40 size-[34rem] rounded-full bg-white/25 blur-3xl" />
        <div
          className="drift absolute -bottom-40 -left-40 size-[30rem] rounded-full bg-[#9ff0e3]/45 blur-3xl"
          style={{ animationDelay: "-6s" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgb(255_255_255/0.22),transparent_55%)]" />
      </div>
      <Bubbles className="-left-32 top-10 w-80 opacity-30" />
      <Bubbles className="-right-28 bottom-0 w-96 opacity-40" />
      <Paw className="float-slower bottom-40 left-8 hidden w-6 rotate-12 opacity-25 lg:block" />

      <div className="relative grid items-center gap-14 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-eyebrow font-extrabold uppercase backdrop-blur">
            <ClawMark className="size-5" />
            Esculturas 3D personalizadas
          </p>
          <h1
            id="hero-titulo"
            className="text-[length:clamp(2.6rem,1.3rem+4.7vw,4.6rem)] font-extrabold leading-[1.12] tracking-tight"
          >
            Seu melhor amigo, <Accent>esculpido</Accent> em 3D.
          </h1>
          <p className="mt-6 max-w-xl text-lead text-ink/85">
            Envie uma foto, veja a prévia da escultura e só então peça. Cada peça é impressa em 3D pela nossa equipe e
            leva o <strong className="font-extrabold">nome do seu pet em relevo</strong> na base.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <CreateButton className="btn-sheen-loop" />
            <Button href="#exemplos" variant="inverse" size="lg">
              Ver exemplos
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-2 font-bold">
                <span className="grid size-6 place-items-center rounded-full bg-white/80 text-teal-deep">
                  <CheckIcon className="text-sm" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
          <div className="relative">
            {/* contorno magenta inclinado atrás da moldura, a marca registrada da Cristal Pet */}
            <TiltedOutline rotate={3} x={14} y={12} className="rounded-[2rem]" />
            {sculpture ? (
              <CompareSlider before={photo} after={sculpture} priority className="relative" />
            ) : (
              <Image
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                priority
                className="relative aspect-[4/5] w-full rounded-[2rem] border-4 border-white object-cover shadow-lift"
              />
            )}

            {/* adesivos flutuantes */}
            <span className="float-slow pointer-events-none absolute -left-3 top-24 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold shadow-lift sm:-left-8">
              <FaWandMagicSparkles aria-hidden="true" className="text-magenta" />
              Prévia grátis
            </span>
            <span className="float-slower pointer-events-none absolute -right-2 bottom-28 inline-flex items-center gap-2 rounded-full bg-magenta px-4 py-2 text-sm font-extrabold text-white shadow-lift sm:-right-6">
              <FaPaw aria-hidden="true" />
              Nome em relevo
            </span>
            <SpinBadge className="absolute -bottom-6 -left-3 size-24 text-ink sm:-left-8 sm:size-28" />
          </div>
          <p className="mt-6 text-center text-sm font-bold text-ink/85">
            <span aria-hidden="true">⟷ </span>Arraste para ver a foto virar escultura
          </p>
        </div>
      </div>
    </Section>
  );
}
