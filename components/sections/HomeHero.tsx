import { Accent } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SculptureButton } from "@/components/ui/CtaButtons";
import { CameraIcon } from "@/components/ui/icons";
import { site } from "@/content/site";
import { PhotoToStatue } from "./PhotoToStatue";

/**
 * Primeira dobra da home: duas portas de entrada. A escultura é o CTA primário
 * (botão cheio); o banho e tosa é a segunda porta (botão de contorno).
 */
export function HomeHero() {
  return (
    <section
      aria-labelledby="hero-titulo"
      className="relative overflow-hidden bg-cream pb-16 pt-10 sm:pt-14 lg:pb-24 lg:pt-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(48rem_26rem_at_88%_-8%,var(--color-teal-mist),transparent)]"
      />
      <div className="container-page relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <p className="mb-4 flex items-center gap-3 text-eyebrow font-bold uppercase text-teal-deep">
            <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
            {site.name} · Indaiatuba e região
          </p>
          <h1 id="hero-titulo" className="text-display font-medium">
            O cuidado que seu pet merece. E uma <Accent>escultura 3D</Accent> para
            guardar para sempre.
          </h1>
          <p className="mt-5 max-w-xl text-lead text-ink-soft">
            Banho e tosa móvel com método Low Stress, na porta da sua casa, e
            esculturas 3D feitas a partir da foto do seu melhor amigo.
          </p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            <Card as="li" tone="ink" className="flex flex-col items-start gap-3">
              <span className="rounded-full bg-magenta px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Novo
              </span>
              <h2 className="font-display text-2xl font-medium">
                Escultura 3D do seu pet
              </h2>
              <p className="text-cream/80">
                Envie uma foto, veja a prévia em 3D e peça pelo WhatsApp.
              </p>
              <SculptureButton
                variant="inverse"
                size="md"
                className="mt-auto"
              >
                Criar minha escultura
              </SculptureButton>
            </Card>

            <Card as="li" className="flex flex-col items-start gap-3">
              <span className="rounded-full bg-teal-mist px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-deep">
                Há {new Date().getFullYear() - site.foundedYear} anos na região
              </span>
              <h2 className="font-display text-2xl font-medium">
                Banho e tosa móvel
              </h2>
              <p className="text-ink-soft">
                Atendimento exclusivo na porta da sua casa em{" "}
                {site.cities.join(", ")}.
              </p>
              <Button
                href="/banho-e-tosa"
                variant="secondary"
                size="md"
                className="mt-auto"
              >
                Conhecer o serviço
              </Button>
            </Card>
          </ul>

          <p className="mt-6 flex items-start gap-2 text-sm text-ink-soft">
            <CameraIcon className="mt-0.5 shrink-0 text-lg text-teal-deep" />
            Dica para a foto: um pet só, de corpo inteiro e com boa iluminação.
          </p>
        </div>

        <PhotoToStatue />
      </div>
    </section>
  );
}
