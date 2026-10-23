import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderView } from "@/components/store/OrderViews";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accent, Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Status";

export const metadata: Metadata = {
  title: "Acompanhar pedido",
  robots: { index: false, follow: false },
};

// A página é uma só; o pedido vem da query string (?c=código&t=token) e é buscado
// no navegador: no export estático não dá para gerar uma página por pedido.
export default function PedidoPage() {
  return (
    <main id="conteudo">
      <PageHeader
        titleId="pedido-titulo"
        title={
          <>
            Acompanhar <Accent>pedido</Accent>
          </>
        }
      />
      <Section tone="cream" className="pt-6!">
        <Suspense fallback={<Loading>Carregando…</Loading>}>
          <OrderView />
        </Suspense>
      </Section>
    </main>
  );
}
