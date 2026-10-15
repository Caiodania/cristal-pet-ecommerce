import type { Metadata } from "next";
import { LegalPage } from "@/components/sections/LegalPage";

// noindex até o texto final existir (TODO-CLIENTE, revisão jurídica: produto sob medida).
export const metadata: Metadata = {
  title: "Trocas e devoluções",
  robots: { index: false, follow: true },
};

export default function TrocasEDevolucoesPage() {
  return (
    <LegalPage
      title="Trocas e devoluções"
      intro="Como funcionam trocas, devoluções e garantia das esculturas, que são feitas sob medida a partir da foto do seu pet."
      topics={[
        "Regras para produtos feitos sob medida",
        "O que fazer se a peça chegar com defeito",
        "Prazos e como solicitar",
        "Garantia da escultura",
      ]}
    />
  );
}
