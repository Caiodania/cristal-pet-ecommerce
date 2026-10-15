import { Button } from "@/components/ui/Button";
import { CreateButton } from "@/components/ui/CtaButtons";
import { CheckIcon } from "@/components/ui/icons";
import { Accent } from "@/components/ui/Section";
import { PhotoToStatue } from "./PhotoToStatue";

const points = ["Prévia antes de pedir", "Impressa em 3D", "Sem cadastro nem senha"];

/** Primeira dobra da loja: um CTA primário, "Criar minha escultura". */
export function StoreHero() {
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
            Esculturas 3D de pets
          </p>
          <h1 id="hero-titulo" className="text-display font-medium">
            O seu pet <Accent>em escultura</Accent>, a partir de uma foto.
          </h1>
          <p className="mt-5 max-w-xl text-lead text-ink-soft">
            Escolha o tamanho, envie a foto e veja a prévia antes de pedir. Impressa em 3D pela nossa
            equipe, com pedido e pagamento combinados pelo WhatsApp.
          </p>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-2 font-semibold">
                <CheckIcon className="text-xl text-teal-deep" />
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <CreateButton />
            <Button href="#como-funciona" variant="ghost">
              Como funciona
            </Button>
          </div>
        </div>

        <PhotoToStatue />
      </div>
    </section>
  );
}
