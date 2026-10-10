import { Section, SectionHeader } from "@/components/ui/Section";
import { WhatsAppButton } from "@/components/ui/CtaButtons";
import { CheckIcon } from "@/components/ui/icons";
import { site } from "@/content/site";

type LegalPageProps = {
  title: string;
  intro: string;
  /** O que o texto final vai cobrir. */
  topics: string[];
};

/**
 * Página legal ainda sem o texto final (TODO-CLIENTE, com revisão jurídica).
 * Fica fora do Google (`noindex`, definido em cada rota) até o texto existir.
 */
export function LegalPage({ title, intro, topics }: LegalPageProps) {
  return (
    <main id="conteudo">
      <Section tone="cream" labelledBy="legal-titulo">
        <div className="mx-auto max-w-3xl">
          <SectionHeader as="h1" align="start" titleId="legal-titulo" title={title} />
          <p className="mt-5 text-lead text-ink-soft">{intro}</p>

          <div
            data-todo="TODO-CLIENTE: texto jurídico revisado"
            className="mt-8 rounded-card border border-dashed border-ink-soft/40 bg-sand p-6"
          >
            <p className="font-display text-xl font-medium">
              Texto completo em elaboração
            </p>
            <p className="mt-2 text-ink-soft">
              Esta página será publicada com o texto completo antes do
              lançamento. Ela vai cobrir:
            </p>
            <ul className="mt-4 grid gap-2">
              {topics.map((topic) => (
                <li key={topic} className="flex items-start gap-3">
                  <CheckIcon className="mt-1 shrink-0 text-teal-deep" />
                  {topic}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-ink-soft">
            Enquanto isso, tire as suas dúvidas diretamente com a gente, {site.hoursSentence}.
          </p>
          <WhatsAppButton
            variant="secondary"
            size="md"
            message={site.whatsapp.defaultMessage}
            className="mt-4"
          >
            Falar no WhatsApp
          </WhatsAppButton>
        </div>
      </Section>
    </main>
  );
}
