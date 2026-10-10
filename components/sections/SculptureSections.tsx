import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { SculptureButton } from "@/components/ui/CtaButtons";
import { CheckIcon, CubeIcon } from "@/components/ui/icons";
import { Placeholder, TodoTag } from "@/components/ui/Placeholder";
import { photoTips, poses } from "@/content/estatua";
import { site } from "@/content/site";
import { PhotoToStatue } from "./PhotoToStatue";

const heroPoints = [
  "Prévia em 3D antes do pedido",
  "Pagamento combinado no WhatsApp",
  "Sem cadastro nem senha",
];

/** Primeira dobra de /esculturas. Sem nota nem prazo: nada que ainda não exista. */
export function SculptureHero() {
  return (
    <section
      aria-labelledby="escultura-titulo"
      className="relative overflow-hidden bg-cream pb-16 pt-10 sm:pt-14 lg:pb-24 lg:pt-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(48rem_26rem_at_10%_-10%,var(--color-teal-mist),transparent)]"
      />
      <div className="container-page relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <p className="mb-4 flex items-center gap-3 text-eyebrow font-bold uppercase text-teal-deep">
            <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
            Escultura 3D do seu pet
          </p>
          <h1 id="escultura-titulo" className="text-display font-medium">
            Seu melhor amigo, <Accent>em escultura</Accent>, a partir de uma foto.
          </h1>
          <p className="mt-5 max-w-xl text-lead text-ink-soft">
            Envie a foto do seu pet, veja a prévia em 3D e peça pelo WhatsApp. A
            escultura é impressa em 3D pela nossa equipe.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
            {heroPoints.map((point) => (
              <li key={point} className="flex items-center gap-2 font-semibold">
                <CheckIcon className="text-xl text-teal-deep" />
                {point}
              </li>
            ))}
          </ul>
          <SculptureButton className="mt-8">Criar minha escultura</SculptureButton>
        </div>
        <PhotoToStatue />
      </div>
    </section>
  );
}

/** Exemplos de foto → escultura. TODO-FOTO: só com autorização do tutor. */
export function RealPetsSection({ tone = "sand" }: { tone?: "cream" | "sand" }) {
  return (
    <Section id="exemplos" tone={tone} labelledBy="exemplos-titulo">
      <SectionHeader
        eyebrow="Exemplos"
        titleId="exemplos-titulo"
        title={
          <>
            De uma foto a uma <Accent>escultura</Accent>
          </>
        }
        description="Pets de verdade e as esculturas feitas a partir das fotos deles."
      />
      <ul className="mt-12 grid gap-6 sm:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <Card as="li" key={n} padded={false}>
            <div className="grid grid-cols-2 gap-px bg-line">
              <Placeholder
                kind="foto"
                label="Foto do pet"
                todo={`TODO-FOTO: foto original do pet ${n} (com autorização do tutor)`}
                ratio="square"
                className="rounded-none border-0"
              />
              <Placeholder
                label="Escultura"
                todo={`TODO-FOTO: escultura do pet ${n}`}
                ratio="square"
                className="rounded-none border-0"
              />
            </div>
          </Card>
        ))}
      </ul>
    </Section>
  );
}

/** Tipos de escultura. TODO-CLIENTE: confirmar o que a impressora consegue fazer. */
export function PosesSection({ tone = "cream" }: { tone?: "cream" | "sand" }) {
  return (
    <Section id="tipos" tone={tone} labelledBy="tipos-titulo">
      <SectionHeader
        eyebrow="Tipos de escultura"
        titleId="tipos-titulo"
        title={
          <>
            Escolha como <Accent>eternizar</Accent> o seu pet
          </>
        }
      />
      <ul className="mt-12 grid gap-6 sm:grid-cols-3">
        {poses.map((pose) => (
          <Card as="li" key={pose.id} padded={false}>
            <Placeholder
              label={`Foto da escultura: ${pose.label.toLowerCase()}`}
              todo={`TODO-FOTO: escultura do tipo ${pose.label}`}
              ratio="square"
              className="rounded-none border-0"
            />
            <div className="flex items-center justify-between gap-3 p-5">
              <h3 className="font-display text-xl font-medium">{pose.label}</h3>
              <TodoTag todo="TODO-CLIENTE: confirmar os tipos e o acréscimo de preço" />
            </div>
          </Card>
        ))}
      </ul>
    </Section>
  );
}

/** Faixa de chamada: "Pronto para escolher?". */
export function ReadyStrip() {
  return (
    <Section tone="mist" labelledBy="pronto-titulo">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-start">
        <div>
          <h2 id="pronto-titulo" className="font-display text-3xl font-medium">
            Pronto para escolher?
          </h2>
          <p className="mt-2 text-ink-soft">
            Envie a foto do seu pet e veja como fica a escultura.
          </p>
        </div>
        <SculptureButton>Criar minha escultura</SculptureButton>
      </div>
    </Section>
  );
}

/** Manifesto em faixa escura. TODO-CLIENTE: texto a aprovar com o dono. */
export function ManifestoBand() {
  return (
    <Section tone="ink" labelledBy="manifesto-titulo">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="manifesto-titulo" className="text-title font-medium">
          Feita por quem <Accent>convive</Accent> com o seu pet
        </h2>
        <div className="mt-6 grid gap-4 text-lead text-cream/80">
          <p>
            Há {new Date().getFullYear() - site.foundedYear} anos entramos na
            rotina de milhares de pets, uma porta de cada vez. Conhecemos o olhar,
            a orelha que levanta e o rabo que não para.
          </p>
          <p>
            A escultura nasce desse mesmo cuidado: um jeito de guardar, em forma
            de arte, quem faz parte da sua família.
          </p>
        </div>
      </div>
    </Section>
  );
}

const quality = [
  {
    title: "Sob medida, do seu pet",
    text: "Cada escultura é feita a partir da foto do seu pet, não é uma peça de catálogo.",
  },
  {
    title: "Impressa em 3D pela nossa equipe",
    text: "A peça é impressa pela própria equipe da Cristal Pet, a partir do modelo 3D gerado com a foto do seu pet.",
  },
  {
    title: "Atendimento direto no WhatsApp",
    text: "Você fala com a gente do início ao fim: pedido, pagamento e entrega combinados em uma conversa.",
  },
];

/** Três cards de qualidade. TODO-CLIENTE: acrescentar material e garantia. */
export function QualitySection({ tone = "cream" }: { tone?: "cream" | "sand" }) {
  return (
    <Section id="qualidade" tone={tone} labelledBy="qualidade-titulo">
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
        {quality.map((item) => (
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

/** Dicas de foto e o CTA (âncora #configurar; vira o configurador na fase 1B). */
export function PhotoTipsSection({ tone = "mist" }: { tone?: "cream" | "mist" }) {
  return (
    <Section id="configurar" tone={tone} labelledBy="configurar-titulo">
      <div className="mx-auto grid max-w-4xl items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 id="configurar-titulo" className="text-title font-medium">
            Comece pela <Accent>foto</Accent>
          </h2>
          <p className="mt-4 text-lead text-ink-soft">
            Quanto melhor a foto, mais fiel fica a escultura. Siga estas dicas:
          </p>
          <ul className="mt-5 grid gap-3">
            {photoTips.map((tip) => (
              <li key={tip} className="flex items-start gap-3">
                <CheckIcon className="mt-1 shrink-0 text-xl text-teal-deep" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-line bg-white p-6 text-center shadow-soft sm:p-8">
          <p className="font-display text-2xl font-medium">
            Vamos esculpir o seu pet?
          </p>
          <p className="mt-2 text-ink-soft">
            Envie a foto e veja a prévia em 3D. O pedido é combinado direto no
            WhatsApp.
          </p>
          <SculptureButton className="mt-6">Criar minha escultura</SculptureButton>
        </div>
      </div>
    </Section>
  );
}
