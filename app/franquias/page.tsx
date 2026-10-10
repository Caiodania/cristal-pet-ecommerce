import type { Metadata } from "next";
import { FinalCta } from "@/components/sections/FinalCta";
import { FranchiseBand } from "@/components/sections/FranchiseBand";
import { FranchiseVideos } from "@/components/sections/FranchiseVideos";

// Provisório: título e descrição finais de SEO entram na etapa 4.
export const metadata: Metadata = {
  title: "Franquia Cristal Pet Móvel",
  description:
    "Seja um franqueado Cristal Pet: leve para a sua cidade um modelo de banho e tosa móvel já testado, com marca premiada e método Low Stress.",
  alternates: { canonical: "/franquias" },
};

export default function FranquiasPage() {
  return (
    <main id="conteudo">
      <FranchiseBand tone="cream" heading="h1" withDetailsLink={false} />
      <FranchiseVideos tone="sand" />
      <FinalCta focus="franquia" />
    </main>
  );
}
