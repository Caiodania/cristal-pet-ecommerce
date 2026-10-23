import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmarCorpo } from "@/components/conta/PaginasConta";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accent, Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Status";

// Recebe o link do e-mail de confirmação (e o retorno do login com Google).
export const metadata: Metadata = {
  title: "Confirmar e-mail",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ConfirmarPage() {
  return (
    <main id="conteudo">
      <PageHeader
        titleId="confirmar-titulo"
        title={
          <>
            Confirmando a sua <Accent>conta</Accent>
          </>
        }
      />
      <Section tone="cream" className="pt-6!">
        <Suspense fallback={<Loading>Carregando…</Loading>}>
          <ConfirmarCorpo />
        </Suspense>
      </Section>
    </main>
  );
}
