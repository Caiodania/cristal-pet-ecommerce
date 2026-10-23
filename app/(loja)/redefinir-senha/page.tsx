import type { Metadata } from "next";
import { Suspense } from "react";
import { RedefinirCorpo } from "@/components/conta/PaginasConta";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accent, Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Status";

// Esta página recebe o link do e-mail de recuperação: nunca deve ser indexada nem
// mandar o endereço (com o token) para outros sites.
export const metadata: Metadata = {
  title: "Nova senha",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function RedefinirSenhaPage() {
  return (
    <main id="conteudo">
      <PageHeader
        titleId="redefinir-titulo"
        title={
          <>
            Crie uma <Accent>nova senha</Accent>
          </>
        }
      />
      <Section tone="cream" className="pt-6!">
        {/* o token vem depois do # do endereço: só o navegador enxerga, então a página é montada lá */}
        <Suspense fallback={<Loading>Carregando…</Loading>}>
          <RedefinirCorpo />
        </Suspense>
      </Section>
    </main>
  );
}
