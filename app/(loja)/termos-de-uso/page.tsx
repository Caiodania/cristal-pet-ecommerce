import type { Metadata } from "next";
import { LegalPage } from "@/components/sections/LegalPage";

// noindex até o texto final existir (TODO-CLIENTE, revisão jurídica).
export const metadata: Metadata = {
  title: "Termos de uso",
  robots: { index: false, follow: true },
};

export default function TermosDeUsoPage() {
  return (
    <LegalPage
      title="Termos de uso"
      intro="As regras para usar o site da Cristal Pet Móvel e pedir uma escultura 3D do seu pet."
      topics={[
        "Uso do site e das fotos enviadas",
        "A conta gratuita e o limite de prévias por conta",
        "A prévia em 3D como representação da escultura",
        "Como funciona o pedido pelo WhatsApp",
        "Direitos sobre as imagens e as esculturas",
        "Responsabilidades da Cristal Pet e do cliente",
      ]}
    />
  );
}
