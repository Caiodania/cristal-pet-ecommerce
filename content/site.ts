// Dados do site num só lugar: trocar telefone, horário ou cidade aqui reflete
// no cabeçalho, rodapé, WhatsApp, SEO e FAQ. Pendências do cliente ficam
// marcadas com TODO-CLIENTE.

export const site = {
  name: "Cristal Pet Móvel",
  shortName: "Cristal Pet",
  slogan: "Sua pet shop móvel de confiança.",
  locale: "pt-BR",
  foundedYear: 2017,

  whatsapp: {
    number: "5519971548471",
    display: "(19) 97154-8471",
    defaultMessage: "Olá! Quero agendar um banho e tosa para o meu pet.",
    // Mensagens já escritas na conversa, uma por origem do clique.
    messages: {
      escultura: "Olá! Quero fazer uma escultura 3D do meu pet.",
      filhote:
        "Olá! Tenho um filhote e quero agendar o primeiro banho dele com a Cristal Pet.",
      franquia:
        "Olá! Tenho interesse em ser um franqueado da Cristal Pet Móvel e gostaria de saber mais.",
      feedback:
        "Olá! Fui atendido pela Cristal Pet e quero enviar uma foto ou vídeo do meu pet.",
      cidade: "Olá! Gostaria de saber se a Cristal Pet atende a minha cidade.",
    },
  },
  phone: { href: "tel:+5519971548471", display: "(19) 97154-8471" },
  email: "cristalpetmovel@gmail.com",

  address: {
    street: "Rua México, 311",
    city: "Indaiatuba",
    region: "SP",
    note: "escritório e garagem",
  },

  // NÃO é 24h. Atendimento de segunda a sábado, nestes horários.
  hours: [
    { days: "Segunda a sexta", time: "8h às 17h" },
    { days: "Sábado", time: "8h às 13h" },
  ],
  hoursSentence: "de segunda a sexta, das 8h às 17h, e aos sábados, das 8h às 13h",

  cities: ["Indaiatuba", "Campinas", "Valinhos", "Vinhedo"],

  social: {
    instagram: "https://www.instagram.com/cristalpetmovel",
    instagramHandle: "@cristalpetmovel",
    // TODO-CLIENTE: este link parece ser de perfil pessoal; trocar pela
    // página comercial da Cristal Pet no Facebook.
    facebook: "https://www.facebook.com/cristal.moraes.1232/",
  },

  // TODO-CLIENTE: CNPJ e razão social para o rodapé.

  /**
   * Chave da loja de esculturas.
   * false: os botões "Criar minha escultura" abrem o WhatsApp com a mensagem
   *        pronta (a loja ainda não existe).
   * true:  abrem o configurador (/personalizar) e a barra de abas ganha
   *        "Pedidos" e "Carrinho". Vira true na fase 1B.
   */
  store: { enabled: false },
} as const;

/** Menu principal do cabeçalho (desktop) e do menu do celular. */
export const nav = [
  { label: "Esculturas", href: "/esculturas" },
  { label: "Banho e tosa", href: "/banho-e-tosa" },
  { label: "Sobre", href: "/#sobre" },
  { label: "FAQ", href: "/#faq" },
] as const;

/** Links extras que só o menu do celular e o rodapé mostram. */
export const navSecondary = [
  { label: "Franquias", href: "/franquias" },
  { label: "Contato", href: "/contato" },
] as const;

export const legalLinks = [
  { label: "Política de privacidade", href: "/politica-de-privacidade" },
  { label: "Termos de uso", href: "/termos-de-uso" },
  { label: "Trocas e devoluções", href: "/trocas-e-devolucoes" },
  { label: "Entrega e frete", href: "/entrega-e-frete" },
] as const;
