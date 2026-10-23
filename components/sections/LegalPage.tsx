import { WhatsAppButton } from "@/components/ui/CtaButtons";
import { CheckIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
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
      <PageHeader titleId="legal-titulo" title={title} description={intro} />
      <Section tone="cream" className="pt-6!">
        <div className="mx-auto max-w-3xl">
          <div
            data-todo="TODO-CLIENTE: texto jurídico revisado"
            className="rounded-card border border-dashed border-ink-soft/40 bg-sand p-6"
          >
            <p className="font-display text-xl font-extrabold">
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
            message={site.whatsapp.messages.duvida}
            className="mt-4"
          >
            Falar no WhatsApp
          </WhatsAppButton>
        </div>
      </Section>
    </main>
  );
}
