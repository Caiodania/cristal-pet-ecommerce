import type { Metadata } from "next";
import { MyOrders } from "@/components/store/OrderViews";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Meus pedidos",
  robots: { index: false, follow: true },
};

export default function MeusPedidosPage() {
  return (
    <main id="conteudo">
      <Section tone="cream" labelledBy="pedidos-titulo">
        <SectionHeader
          as="h1"
          align="start"
          titleId="pedidos-titulo"
          title={
            <>
              Meus <Accent>pedidos</Accent>
            </>
          }
          description="Acompanhe o andamento das suas esculturas. Não precisa de login."
        />
        <div className="mt-10">
          <MyOrders />
        </div>
      </Section>
    </main>
  );
}
