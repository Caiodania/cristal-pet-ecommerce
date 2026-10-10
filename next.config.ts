import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export estático para a Netlify: gera a pasta `out/`.
  output: "export",

  // O otimizador padrão de imagens precisa de servidor; no export estático as
  // imagens são servidas como estão, então chegam já otimizadas (webp, no
  // tamanho certo) em /public/images.
  images: { unoptimized: true },

  // O domínio ainda não existe e não pode ficar fixo no código. Ordem:
  // NEXT_PUBLIC_SITE_URL (definida à mão) → URL (a Netlify preenche sozinha
  // com o endereço principal do site) → localhost no desenvolvimento.
  env: {
    // `||` (e não `??`): uma variável definida mas vazia também cai no próximo
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.URL ||
      "http://localhost:3000",
  },
};

export default nextConfig;
