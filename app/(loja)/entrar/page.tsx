import type { Metadata } from "next";
import { Suspense } from "react";
import { EntrarCorpo } from "@/components/conta/PaginasConta";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accent, Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Status";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: true },
};

export default function EntrarPage() {
  return (
    <main id="conteudo">
      <PageHeader
        titleId="entrar-titulo"
        title={
          <>
            Entre na sua <Accent>conta</Accent>
          </>
        }
        description="Para gerar prévias de escultura e acompanhar os seus pedidos."
      />
      <Section tone="cream" className="pt-6!">
        {/* useSearchParams (para onde voltar depois do login) exige Suspense no export estático */}
        <Suspense fallback={<Loading>Carregando…</Loading>}>
          <EntrarCorpo />
        </Suspense>
      </Section>
    </main>
  );
}
