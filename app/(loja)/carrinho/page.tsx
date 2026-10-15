import type { Metadata } from "next";
import { CartView } from "@/components/store/CartView";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false, follow: true },
};

export default function CarrinhoPage() {
  return (
    <main id="conteudo">
      <Section tone="cream" labelledBy="carrinho-titulo">
        <SectionHeader
          as="h1"
          align="start"
          titleId="carrinho-titulo"
          title={
            <>
              Seu <Accent>carrinho</Accent>
            </>
          }
          description="Confira as esculturas e envie o pedido. O pagamento é combinado no WhatsApp."
        />
        <div className="mt-10">
          <CartView />
        </div>
      </Section>
    </main>
  );
}
