import type { Metadata } from "next";
import { LegalPage } from "@/components/sections/LegalPage";

// noindex até o texto final existir (TODO-CLIENTE, revisão jurídica).
export const metadata: Metadata = {
  title: "Política de privacidade",
  robots: { index: false, follow: true },
};

export default function PoliticaDePrivacidadePage() {
  return (
    <LegalPage
      title="Política de privacidade"
      intro="Como a Cristal Pet Móvel trata os seus dados e as fotos do seu pet, de acordo com a Lei Geral de Proteção de Dados (LGPD)."
      topics={[
        "Quais dados coletamos (nome, cidade, contato e as fotos do seu pet)",
        "Para que usamos cada dado",
        "Por quanto tempo guardamos as fotos e os pedidos",
        "Com quem compartilhamos (hospedagem e o serviço que gera a prévia em 3D)",
        "Os seus direitos e como exercê-los",
        "Como falar com a gente sobre os seus dados",
      ]}
    />
  );
}
