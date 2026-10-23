import type { Metadata } from "next";
import { Suspense } from "react";
import { CriarContaCorpo } from "@/components/conta/PaginasConta";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accent, Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Status";

export const metadata: Metadata = {
  title: "Criar conta",
  robots: { index: false, follow: true },
};

export default function CriarContaPage() {
  return (
    <main id="conteudo">
      <PageHeader
        titleId="criar-conta-titulo"
        title={
          <>
            Crie a sua <Accent>conta grátis</Accent>
          </>
        }
        description="Com a conta você gera as prévias da sua escultura e acompanha os pedidos em qualquer aparelho."
      />
      <Section tone="cream" className="pt-6!">
        <Suspense fallback={<Loading>Carregando…</Loading>}>
          <CriarContaCorpo />
        </Suspense>
      </Section>
    </main>
  );
}
