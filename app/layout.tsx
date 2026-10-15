import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { site } from "@/content/site";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

// Títulos: serifa suave com itálico (a palavra-acento). Texto: Nunito Sans, a
// fonte da marca. Só estas duas famílias são carregadas.
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
    default: `${site.name} | ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  // Provisório: o texto final de SEO entra na etapa de SEO.
  description:
    "Envie a foto do seu pet, veja a prévia e peça uma escultura 3D feita sob medida. Pedido e pagamento combinados pelo WhatsApp.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: site.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#4bc0af",
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
    <html lang="pt-BR" className={`${fraunces.variable} ${nunitoSans.variable}`}>
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:font-semibold focus:text-cream"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
