import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { Accordion } from "@/components/ui/Accordion";
import { CheckIcon } from "@/components/ui/icons";
import { PortraitVisual } from "@/components/store/PortraitVisual";
import { portraitCatalog } from "@/content/quadros";
import { previewsPerAccount } from "@/content/estatua";

export const metadata: Metadata = {
  title: "Quadros personalizados do seu pet",
  description: "Transforme a foto do seu pet em um quadro personalizado. Escolha o estilo e a moldura, veja a prévia e combine o pedido pelo WhatsApp.",
  alternates: { canonical: "/quadros" },
};

export default function QuadrosPage() {
  return (
    <main id="conteudo">
      <Section tone="gold" wave="snow" labelledBy="quadros-titulo">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="mb-5 inline-flex rounded-full bg-pink-mist px-4 py-2 text-eyebrow font-extrabold uppercase text-pink-deep">Quadros personalizados</p>
            <h1 id="quadros-titulo" className="text-display font-extrabold">O jeitinho dele.<br /><Accent>Na sua parede.</Accent></h1>
            <p className="mt-6 max-w-xl text-lead text-ink/85">Aquele olhar que você conhece tão bem, transformado em arte. Escolha como retratar o seu pet e veja a prévia antes de fazer o pedido.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Button href="/quadros/personalizar" size="lg">Criar meu quadro</Button><Button href="#estilos" variant="inverse" size="lg">Explorar os estilos</Button></div>
            <ul className="mt-7 grid gap-2 text-sm font-bold">{["Arte criada a partir da foto do seu pet", "Tamanho e moldura do seu jeito", "Pagamento e entrega combinados pelo WhatsApp"].map((text) => <li key={text} className="flex items-center gap-2"><CheckIcon className="shrink-0 text-pink-deep" />{text}</li>)}</ul>
          </div>
          <figure className="relative mx-auto w-full max-w-sm rotate-2">
            <PortraitVisual photoUrl="/images/exemplos/mel.webp" frameId="natural" className="rounded-card bg-white/40 p-8!" />
            <span className="absolute -left-2 top-6 rounded-full bg-pink-deep px-4 py-2 text-sm font-bold text-white shadow-soft">Um retrato só dele</span>
            <figcaption className="mt-3 text-center text-xs text-ink">Foto ilustrativa em uma simulação de moldura.</figcaption>
          </figure>
        </div>
      </Section>

      <Section id="estilos" labelledBy="estilos-titulo">
        <SectionHeader titleId="estilos-titulo" eyebrow="A personalidade vira arte" title={<>Qual estilo tem a <Accent>cara do seu pet?</Accent></>} description="Do retrato delicado à majestade da casa. A mesma foto, diferentes formas de guardar a lembrança." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">{portraitCatalog.styles.map((style) => <article key={style.id} className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
          <div className="aspect-[4/3]"><PortraitVisual styleId={style.id} className="p-7!" /></div>
          <div className="p-6"><h3 className="font-display text-xl font-extrabold">{style.label}</h3><p className="mt-2 min-h-12 text-ink-soft">{style.description}</p><Button href={`/quadros/personalizar?estilo=${style.id}`} variant="secondary" className="mt-5 w-full">Escolher {style.label.toLowerCase()}</Button></div>
        </article>)}</div>
        <p className="mt-4 text-center text-xs text-ink-soft">Ilustrações de referência. A sua prévia será criada com a foto do seu pet.</p>
      </Section>

      <Section tone="pink" labelledBy="quadros-como">
        <SectionHeader titleId="quadros-como" eyebrow="Da foto ao seu lar" title={<>Você escolhe. A gente <Accent>cuida do pedido.</Accent></>} />
        <div className="mt-10 grid gap-6 md:grid-cols-3">{[
          ["01", "Personalize", "Escolha tamanho, estilo e moldura. Depois, envie uma foto nítida do seu pet."],
          ["02", "Confira a prévia", `Crie sua conta grátis para gerar a arte. São ${previewsPerAccount} prévias por conta, compartilhadas entre quadros e esculturas.`],
          ["03", "Peça pelo WhatsApp", "Gostou? Adicione ao carrinho. Confirmamos valor, acabamento e prazo antes de encaminhar a produção ao parceiro."],
        ].map(([number, title, text]) => <article key={number} className="rounded-card bg-white p-6 shadow-soft"><span className="font-display text-3xl font-extrabold text-pink-deep">{number}</span><h3 className="mt-4 text-xl font-extrabold">{title}</h3><p className="mt-3 text-ink-soft">{text}</p></article>)}</div>
      </Section>

      <Section labelledBy="quadros-acabamento">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div><SectionHeader align="start" titleId="quadros-acabamento" eyebrow="No tamanho do seu carinho" title={<>Um lugar especial para <Accent>o seu companheiro.</Accent></>} description="Escolha o formato que combina com o espaço. O valor final e a disponibilidade são confirmados com você pelo WhatsApp." />
            <div className="mt-7 flex flex-wrap gap-3">{portraitCatalog.sizes.map((size) => <Button key={size.id} href={`/quadros/personalizar?tamanho=${size.id}`} variant="secondary">{size.label}</Button>)}</div>
            <p className="mt-4 text-sm text-ink-soft">Medidas da arte. Preços a combinar.</p>
          </div>
          <div className="rounded-card border border-line bg-pearl p-6 sm:p-8"><h3 className="text-xl font-extrabold">A moldura completa a história</h3><div className="mt-6 grid gap-5">{portraitCatalog.frames.map((frame) => <div key={frame.id} className="flex items-center gap-4"><span aria-hidden="true" className="size-12 shrink-0 border-[7px] bg-white shadow-soft" style={{ borderColor: frame.swatch }} /><div><p className="font-bold">{frame.label}</p><p className="text-sm text-ink-soft">{frame.description}</p></div></div>)}</div><p className="mt-6 border-t border-line pt-5 text-sm text-ink-soft">A impressão e a montagem dos quadros são feitas por um parceiro de produção. Nosso atendimento acompanha o seu pedido do início à entrega.</p></div>
        </div>
      </Section>

      <Section tone="pearl" labelledBy="quadros-duvidas">
        <SectionHeader titleId="quadros-duvidas" title={<>Antes de criar, <Accent>tire suas dúvidas.</Accent></>} />
        <div className="mx-auto mt-8 max-w-3xl"><Accordion name="quadros-duvidas" items={[
          { question: "O quadro é impresso em 3D?", answer: "Não. O quadro é uma arte impressa e emoldurada por um parceiro. As esculturas são produzidas separadamente, em impressora 3D." },
          { question: "Posso pedir quadro e escultura juntos?", answer: "Sim. Personalize cada produto e adicione ao mesmo carrinho. As escolhas e prévias ficam registradas no seu pedido, e combinamos a entrega pelo WhatsApp." },
          { question: "A prévia já é o arquivo final de impressão?", answer: "A prévia mostra a proposta da arte. Antes de produzir, conferimos o resultado, a resolução, o tamanho e o acabamento com o parceiro e confirmamos tudo com você." },
          { question: "Quanto custa e qual é o prazo?", answer: "O valor, o frete e o prazo são combinados pelo WhatsApp conforme o tamanho, o acabamento e o endereço. Você confirma essas informações antes da produção." },
        ]} /></div>
      </Section>

      <Section tone="navy" wave="gold" labelledBy="quadros-final"><div className="text-center"><h2 id="quadros-final" className="text-title font-extrabold">A próxima arte da casa tem nome. O do seu pet.</h2><p className="mx-auto mt-4 max-w-xl text-lead">Comece pela foto que você mais ama. O resto a gente cria junto.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Button href="/quadros/personalizar" size="lg">Criar meu quadro</Button><Button href="/personalizar" variant="secondary" size="lg">Criar uma escultura</Button></div></div></Section>
    </main>
  );
}
