import type { Metadata, Viewport } from "next";
import { Nunito, Nunito_Sans } from "next/font/google";
import { images } from "@/content/images";
import { site } from "@/content/site";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

// Identidade da AUmor de Patas: títulos em Nunito pesado, texto em Nunito Sans. Só
// estas duas famílias são carregadas. Ícones (app/icon.png, apple-icon.png, favicon.ico)
// e imagem de compartilhamento (public/images/og.jpg) saem do logo: `npm run marca`.
const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.name} | ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  // Provisório: o texto final de SEO entra na etapa de SEO.
  description:
    "Transforme a foto do seu pet em um quadro personalizado ou uma escultura 3D. Veja a prévia e combine pedido e pagamento pelo WhatsApp.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: site.name,
    images: [{ url: images.share.src, width: images.share.width, height: images.share.height, alt: images.share.alt }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2347",
};

// Layout mínimo: fontes e "pular para o conteúdo". Cada área monta o seu
// próprio cabeçalho: (loja) tem vitrine, barra de abas e rodapé; admin tem o
// painel do dono.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} ${nunitoSans.variable}`}>
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:font-semibold focus:text-snow"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
