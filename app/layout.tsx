import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";
import { site } from "@/content/site";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

// Títulos: serifa suave com itálico (a palavra-acento). Texto: Nunito Sans, a
// fonte atual da marca. Só estas duas famílias são carregadas.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.name} | Banho e tosa móvel e esculturas 3D do seu pet`,
    template: `%s | ${site.name}`,
  },
  // Provisório: o texto final de SEO entra na etapa 4.
  description:
    "Banho e tosa móvel com método Low Stress, na porta da sua casa, em Indaiatuba, Campinas, Valinhos e Vinhedo.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: site.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#4bc0af",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${nunitoSans.variable}`}
    >
      {/* no celular a barra de abas fixa ocupa 4rem no rodapé */}
      <body className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:font-semibold focus:text-cream"
        >
          Pular para o conteúdo
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
        <MobileTabBar />
        {/* no celular, "Ajuda" da barra de abas já abre o WhatsApp */}
        <WhatsAppFloat className="max-md:hidden" />
      </body>
    </html>
  );
}
