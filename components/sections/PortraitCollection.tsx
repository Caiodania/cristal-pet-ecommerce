import { Button } from "@/components/ui/Button";
import { Accent, Section } from "@/components/ui/Section";
import { PortraitVisual } from "@/components/store/PortraitVisual";

export function PortraitCollection() {
  return (
    <Section id="quadros" tone="snow" labelledBy="quadros-chamada">
      <div className="grid items-center gap-8 overflow-hidden rounded-card border border-line bg-pearl p-6 sm:p-10 lg:grid-cols-2">
        <div>
          <p className="text-eyebrow font-extrabold uppercase text-navy">Uma nova forma de guardar esse amor</p>
          <h2 id="quadros-chamada" className="mt-4 text-title font-extrabold">Da foto à <Accent>parede da sua casa.</Accent></h2>
          <p className="mt-5 max-w-lg text-lead text-ink-soft">Agora o seu pet também vira quadro. Escolha o estilo, o tamanho e a moldura, veja a prévia e faça o pedido com a gente.</p>
          <p className="mt-4 text-sm text-ink-soft">Quadros produzidos por parceiro. Você pode pedir um quadro e uma escultura juntos, no mesmo carrinho.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Button href="/quadros" size="lg">Conhecer os quadros</Button><Button href="/quadros/personalizar" variant="secondary" size="lg">Criar meu quadro</Button></div>
        </div>
        <figure className="mx-auto w-full max-w-sm -rotate-3">
          <PortraitVisual photoUrl="/images/exemplos/mel.webp" frameId="natural" className="rounded-card" />
          <figcaption className="mt-3 text-center text-xs text-ink-soft">Foto ilustrativa em uma simulação de moldura.</figcaption>
        </figure>
      </div>
    </Section>
  );
}
