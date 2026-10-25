import type { Metadata } from "next";

// Painel do dono: fora do Google e sem a vitrine ao redor. O título é genérico DE
// PROPÓSITO: quem não é o dono vê aqui a página "não encontrada", então o HTML
// não pode entregar o nome do painel (o AdminGate troca o título para o dono).
export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-sand">{children}</div>;
}
