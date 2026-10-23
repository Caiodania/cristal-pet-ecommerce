import type { Metadata } from "next";
import { Suspense } from "react";
import { Configurator } from "@/components/store/Configurator";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accent, Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Status";

export const metadata: Metadata = {
  title: "Criar minha escultura",
  description: "Escolha o tamanho, o tipo e a cor, envie a foto do seu pet e veja a prévia da escultura 3D.",
  // área de compra: fora do Google (a vitrine é que aparece na busca)
  robots: { index: false, follow: true },
};

export default function PersonalizarPage() {
  return (
    <main id="conteudo">
      <PageHeader
        titleId="personalizar-titulo"
        title={
          <>
            Crie a sua <Accent>escultura</Accent>
          </>
        }
        description="Seis passos rápidos. Você vê a prévia antes de pedir."
      />
      <Section tone="cream" className="pt-6!">
        {/* useSearchParams (tamanho já escolhido na vitrine) exige Suspense no export estático */}
        <Suspense fallback={<Loading>Carregando…</Loading>}>
          <Configurator />
        </Suspense>
      </Section>
    </main>
  );
}
