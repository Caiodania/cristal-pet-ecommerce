import type { Metadata } from "next";
import { LegalPage } from "@/components/sections/LegalPage";

// noindex até o texto final existir (TODO-CLIENTE: prazos e modalidades de entrega).
export const metadata: Metadata = {
  title: "Entrega e frete",
  robots: { index: false, follow: true },
};

export default function EntregaEFretePage() {
  return (
    <LegalPage
      title="Entrega e frete"
      intro="Prazos de produção e formas de entrega da sua escultura, combinadas diretamente com você pelo WhatsApp."
      topics={[
        "Prazo de produção da escultura",
        "Entrega local e envio para outras cidades",
        "Valor do frete",
        "Como acompanhar o seu pedido",
      ]}
    />
  );
}
