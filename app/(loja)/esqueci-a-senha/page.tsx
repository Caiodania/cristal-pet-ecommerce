import type { Metadata } from "next";
import { EsqueciCorpo } from "@/components/conta/PaginasConta";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accent, Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Esqueci a senha",
  robots: { index: false, follow: true },
};

export default function EsqueciPage() {
  return (
    <main id="conteudo">
      <PageHeader
        titleId="esqueci-titulo"
        title={
          <>
            Recupere a sua <Accent>senha</Accent>
          </>
        }
      />
      <Section tone="cream" className="pt-6!">
        <EsqueciCorpo />
      </Section>
    </main>
  );
}
