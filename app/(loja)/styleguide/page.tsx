import type { Metadata } from "next";
import { FaWhatsapp } from "react-icons/fa6";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";
import { LightboxGallery } from "@/components/ui/LightboxGallery";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { images } from "@/content/images";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { contrastRatio, wcagLevel } from "@/lib/contrast";
import { palette, type PaletteName } from "@/lib/palette";

// Página de trabalho: serve para validar tokens e componentes. Fica fora do
// Google e deve ser removida antes de o site entrar no ar.
export const metadata: Metadata = {
  title: "Guia de estilo",
  robots: { index: false, follow: false },
};

const swatchClass: Record<PaletteName, string> = {
  cream: "bg-cream",
  sand: "bg-sand",
  line: "bg-line",
  ink: "bg-ink",
  "ink-soft": "bg-ink-soft",
  teal: "bg-teal",
  "teal-deep": "bg-teal-deep",
  "teal-mist": "bg-teal-mist",
  magenta: "bg-magenta",
  "magenta-mist": "bg-magenta-mist",
};

// Pares usados no site: o contraste é calculado a cada build, não digitado.
const pairs: Array<{ fg: PaletteName | "white"; bg: PaletteName | "white"; note: string }> = [
  { fg: "ink", bg: "cream", note: "texto principal" },
  { fg: "ink-soft", bg: "cream", note: "texto secundário" },
  { fg: "ink-soft", bg: "sand", note: "texto secundário em seção tonal" },
  { fg: "teal-deep", bg: "cream", note: "palavra-acento, links" },
  { fg: "teal-deep", bg: "teal-mist", note: "texto sobre tinta teal" },
  { fg: "magenta", bg: "cream", note: "selo/promoção como texto" },
  { fg: "white", bg: "magenta", note: "selo sólido (texto branco)" },
  { fg: "cream", bg: "ink", note: "botão escuro" },
  { fg: "ink", bg: "teal", note: "botão teal (texto escuro)" },
  { fg: "teal", bg: "ink", note: "acento em faixa escura" },
  { fg: "teal", bg: "cream", note: "teal puro como texto (NÃO USAR)" },
  { fg: "white", bg: "teal", note: "branco sobre teal (NÃO USAR)" },
];

const hexOf = (name: PaletteName | "white") =>
  name === "white" ? "#ffffff" : palette[name].hex;

const sampleFaq = [
  {
    question: "Como funciona o atendimento da unidade móvel?",
    answer:
      "Nossa van totalmente equipada vai até a porta da sua casa. O banho e a tosa acontecem dentro do veículo, sem a necessidade de levar o seu pet até uma loja física.",
  },
  {
    question: "Preciso estar em casa durante o atendimento?",
    answer:
      "Recomendamos que o tutor esteja em casa ou por perto durante o serviço, principalmente no momento da entrega do pet ao final do atendimento.",
  },
  {
    question: "Posso remarcar ou cancelar meu horário?",
    answer:
      "Sim! Basta entrar em contato pelo WhatsApp com antecedência para reagendar ou cancelar o seu horário.",
  },
];

export default function StyleGuide() {
  return (
    <main id="conteudo">
      <Section labelledBy="sg-titulo">
        <SectionHeader
          as="h1"
          titleId="sg-titulo"
          eyebrow="Etapa 2 · sistema de design"
          title={
            <>
              Guia de <Accent>estilo</Accent>
            </>
          }
          description="Tokens e componentes base da Cristal Pet. Página de trabalho: fora do Google e removida antes do lançamento."
        />
      </Section>

      <Section tone="sand" labelledBy="sg-cores">
        <SectionHeader
          titleId="sg-cores"
          eyebrow="Cores"
          title={
            <>
              Paleta com <Accent>contraste medido</Accent>
            </>
          }
          description="O teal puro não serve para texto: só entra em preenchimentos, ícones e faixas."
        />

        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(palette) as PaletteName[]).map((name) => (
            <li key={name}>
              <Card padded={false}>
                <div
                  className={`h-20 border-b border-line ${swatchClass[name]}`}
                />
                <div className="p-3">
                  <p className="font-bold">{name}</p>
                  <p className="text-sm text-ink-soft">{palette[name].hex}</p>
                  <p className="mt-1 text-xs leading-snug text-ink-soft">
                    {palette[name].use}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <div className="mt-12 overflow-x-auto rounded-card border border-line bg-white shadow-soft">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="sr-only">
              Contraste entre as cores de texto e de fundo usadas no site
            </caption>
            <thead className="border-b border-line bg-cream text-xs uppercase tracking-wider text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Amostra
                </th>
                <th scope="col" className="px-4 py-3">
                  Uso
                </th>
                <th scope="col" className="px-4 py-3">
                  Contraste
                </th>
                <th scope="col" className="px-4 py-3">
                  WCAG
                </th>
              </tr>
            </thead>
            <tbody>
              {pairs.map(({ fg, bg, note }) => {
                const ratio = contrastRatio(hexOf(fg), hexOf(bg));
                const level = wcagLevel(ratio);
                return (
                  <tr key={`${fg}-${bg}`} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <span
                        className="inline-block whitespace-nowrap rounded-soft px-3 py-1 font-bold"
                        style={{ color: hexOf(fg), backgroundColor: hexOf(bg) }}
                      >
                        Cristal Pet
                      </span>
                    </td>
                    <td className="px-4 py-3">{note}</td>
                    <td className="px-4 py-3 font-bold tabular-nums">
                      {ratio.toFixed(2).replace(".", ",")}:1
                    </td>
                    <td
                      className={`px-4 py-3 font-bold ${level === "falha" ? "text-magenta" : "text-teal-deep"}`}
                    >
                      {level}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section labelledBy="sg-tipografia">
        <SectionHeader
          titleId="sg-tipografia"
          eyebrow="Tipografia"
          title={
            <>
              Serifa suave nos títulos, <Accent>Nunito Sans</Accent> no texto
            </>
          }
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-8">
          <div>
            <p className="mb-2 text-eyebrow font-bold uppercase text-ink-soft">
              text-display · Fraunces
            </p>
            <p className="font-display text-display font-medium">
              Conforto, segurança e zero estresse, <Accent>na porta da sua casa.</Accent>
            </p>
          </div>
          <div>
            <p className="mb-2 text-eyebrow font-bold uppercase text-ink-soft">
              text-title · Fraunces
            </p>
            <p className="font-display text-title font-medium">
              Seu pet em uma escultura <Accent>única</Accent>
            </p>
          </div>
          <div>
            <p className="mb-2 text-eyebrow font-bold uppercase text-ink-soft">
              text-subtitle · Fraunces
            </p>
            <p className="font-display text-subtitle font-medium">
              Escolha o tamanho ideal
            </p>
          </div>
          <div>
            <p className="mb-2 text-eyebrow font-bold uppercase text-ink-soft">
              text-lead · Nunito Sans
            </p>
            <p className="text-lead text-ink-soft">
              O cuidado premium que seu melhor amigo merece, direto na porta da sua casa.
            </p>
          </div>
          <div>
            <p className="mb-2 text-eyebrow font-bold uppercase text-ink-soft">
              base (1rem) · Nunito Sans
            </p>
            <p>
              Atendemos Indaiatuba, Campinas, Valinhos e Vinhedo, de segunda a sexta
              das 8h às 17h e aos sábados das 8h às 13h.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="sand" labelledBy="sg-botoes">
        <SectionHeader
          titleId="sg-botoes"
          eyebrow="Botões"
          title={
            <>
              Variantes e <Accent>tamanhos</Accent>
            </>
          }
          description="Todos com alvo de toque de pelo menos 44 px e foco visível. Links externos abrem em nova aba e avisam o leitor de tela."
        />
        <div className="mt-12 grid gap-10">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button variant="primary">Primário</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" disabled>
              Desabilitado
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="sm">Pequeno</Button>
            <Button size="md">Médio</Button>
            <Button size="lg">Grande</Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              href={buildWhatsAppUrl("Olá! Tenho uma dúvida sobre as esculturas 3D.")}
              size="lg"
              icon={<FaWhatsapp aria-hidden="true" className="text-xl" />}
            >
              Falar no WhatsApp
            </Button>
            <Button
              href="/personalizar"
              variant="accent"
              size="lg"
              icon={<ArrowRightIcon />}
              iconPosition="end"
            >
              Criar minha escultura
            </Button>
          </div>
        </div>

        <div
          data-surface="dark"
          className="mt-12 rounded-card bg-ink p-8 text-cream"
        >
          <p className="mb-6 text-center text-eyebrow font-bold uppercase text-teal">
            Sobre faixa escura
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button variant="inverse">Inverso</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </div>
      </Section>

      <Section labelledBy="sg-cards">
        <SectionHeader
          titleId="sg-cards"
          eyebrow="Cards"
          title={
            <>
              Superfícies <Accent>suaves</Accent>
            </>
          }
        />
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          <li>
            <Card className="reveal h-full">
              <h3 className="font-display text-subtitle font-medium">Card branco</h3>
              <p className="mt-3 text-ink-soft">
                Borda de 1 px, cantos de 16 px e sombra quase imperceptível.
              </p>
            </Card>
          </li>
          <li>
            <Card tone="sand" className="reveal h-full">
              <h3 className="font-display text-subtitle font-medium">Card tonal</h3>
              <p className="mt-3 text-ink-soft">
                Para blocos dentro de seções claras, sem competir com o fundo.
              </p>
            </Card>
          </li>
          <li>
            <Card tone="ink" interactive className="reveal h-full">
              <h3 className="font-display text-subtitle font-medium">Card escuro, interativo</h3>
              <p className="mt-3 text-cream/80">
                Sobe de leve ao passar o mouse (desligado com movimento reduzido).
              </p>
            </Card>
          </li>
        </ul>
      </Section>

      <Section labelledBy="sg-acordeao">
        <SectionHeader
          titleId="sg-acordeao"
          eyebrow="Acordeão"
          title={
            <>
              Perguntas <Accent>frequentes</Accent>
            </>
          }
          description="Nativo (details/summary): abrir um fecha o outro, sem JavaScript, e as respostas ficam no HTML."
        />
        <div className="mx-auto mt-12 max-w-3xl">
          <Accordion items={sampleFaq} name="sg-faq" defaultOpen={0} />
        </div>
      </Section>

      <Section labelledBy="sg-galeria">
        <SectionHeader
          titleId="sg-galeria"
          eyebrow="Galeria e lightbox"
          title={
            <>
              Fotos <Accent>de exemplo</Accent>
            </>
          }
          description="Clique numa foto: ← → trocam, Esc ou um clique fora fecham."
        />
        <div className="mt-12">
          <LightboxGallery
            items={Object.values(images.exemplos).map((photo) => ({ alt: photo.alt, thumb: { src: photo.src, width: photo.width, height: photo.height }, full: { src: photo.src, width: photo.width, height: photo.height } }))}
            label="Fotos de exemplo"
          />
        </div>
      </Section>

      <Section tone="ink" labelledBy="sg-faixa-escura">
        <SectionHeader
          titleId="sg-faixa-escura"
          eyebrow="Faixa escura"
          title={
            <>
              Especialistas em <Accent>filhotes</Accent>
            </>
          }
          description="O acento troca para teal e o foco também, mantendo o contraste acima de 7:1."
        />
        <div className="mt-10 flex justify-center">
          <Button variant="accent" size="lg">
            Agendar o primeiro banho
          </Button>
        </div>
      </Section>
    </main>
  );
}
