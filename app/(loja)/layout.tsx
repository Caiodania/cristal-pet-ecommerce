import { DemoBanner } from "@/components/layout/DemoBanner";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";

// Área pública da loja: vitrine, personalizar, carrinho, pedidos e páginas legais.
export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    // no celular a barra de abas fixa ocupa 4rem no rodapé
    <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <SiteHeader />
      <DemoBanner />
      {children}
      <SiteFooter />
      <MobileTabBar />
      {/* no celular, "Ajuda" da barra de abas já abre o WhatsApp */}
      <WhatsAppFloat className="max-md:hidden" />
    </div>
  );
}
