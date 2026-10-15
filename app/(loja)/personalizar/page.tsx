import type { Metadata } from "next";
import { Suspense } from "react";
import { Configurator } from "@/components/store/Configurator";
import { Loading } from "@/components/ui/Status";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Criar minha escultura",
  description: "Escolha o tamanho, o tipo e a cor, envie a foto do seu pet e veja a prévia da escultura 3D.",
  // área de compra: fora do Google (a vitrine é que aparece na busca)
  robots: { index: false, follow: true },
};

export default function PersonalizarPage() {
  return (
    <main id="conteudo">
      <Section tone="cream" labelledBy="personalizar-titulo">
        <SectionHeader
          as="h1"
          align="start"
          titleId="personalizar-titulo"
          title={
            <>
              Crie a sua <Accent>escultura</Accent>
            </>
          }
          description="Seis passos rápidos. Você vê a prévia antes de pedir."
        />
        <div className="mt-10">
          {/* useSearchParams (tamanho já escolhido na vitrine) exige Suspense no export estático */}
          <Suspense fallback={<Loading>Carregando…</Loading>}>
            <Configurator />
          </Suspense>
        </div>
      </Section>
    </main>
  );
}
