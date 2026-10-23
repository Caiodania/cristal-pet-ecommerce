import type { Metadata } from "next";
import { MinhaContaCorpo } from "@/components/conta/PaginasConta";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accent, Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Minha conta",
  robots: { index: false, follow: true },
};

export default function MinhaContaPage() {
  return (
    <main id="conteudo">
      <PageHeader
        titleId="conta-titulo"
        title={
          <>
            Minha <Accent>conta</Accent>
          </>
        }
        description="Suas prévias, seus pedidos e os dados do seu cadastro."
      />
      <Section tone="cream" className="pt-6!">
        <MinhaContaCorpo />
      </Section>
    </main>
  );
}
