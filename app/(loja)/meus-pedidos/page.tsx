import type { Metadata } from "next";
import { MyOrders } from "@/components/store/OrderViews";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accent, Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Meus pedidos",
  robots: { index: false, follow: true },
};

export default function MeusPedidosPage() {
  return (
    <main id="conteudo">
      <PageHeader
        titleId="pedidos-titulo"
        title={
          <>
            Meus <Accent>pedidos</Accent>
          </>
        }
        description="Acompanhe o andamento das suas esculturas. Os pedidos ficam na sua conta, em qualquer aparelho."
      />
      <Section tone="cream" className="pt-6!">
        <MyOrders />
      </Section>
    </main>
  );
}
