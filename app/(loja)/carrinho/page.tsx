import type { Metadata } from "next";
import { CartView } from "@/components/store/CartView";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accent, Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false, follow: true },
};

export default function CarrinhoPage() {
  return (
    <main id="conteudo">
      <PageHeader
        titleId="carrinho-titulo"
        title={
          <>
            Seu <Accent>carrinho</Accent>
          </>
        }
        description="Confira as esculturas e envie o pedido. O pagamento é combinado no WhatsApp."
      />
      <Section tone="cream" className="pt-6!">
        <CartView />
      </Section>
    </main>
  );
}
