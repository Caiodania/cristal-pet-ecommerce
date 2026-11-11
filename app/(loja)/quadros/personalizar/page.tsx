import type { Metadata } from "next";
import { Suspense } from "react";
import { Configurator } from "@/components/store/Configurator";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accent, Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Status";

export const metadata: Metadata = { title: "Criar meu quadro", description: "Personalize o quadro do seu pet e confira a prévia antes de pedir.", robots: { index: false, follow: true } };

export default function PersonalizarQuadroPage() {
  return <main id="conteudo"><PageHeader titleId="personalizar-quadro" title={<>Crie o seu <Accent>quadro</Accent></>} description="Escolha tamanho, estilo e moldura. Envie a foto e veja a prévia antes de pedir." /><Section tone="snow" className="pt-6!"><Suspense fallback={<Loading>Carregando…</Loading>}><Configurator key="quadro" productType="quadro" /></Suspense></Section></main>;
}
