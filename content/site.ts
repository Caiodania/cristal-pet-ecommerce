// Dados da loja num só lugar: trocar telefone, horário ou texto aqui reflete no
// cabeçalho, rodapé, WhatsApp e FAQ. Pendências do cliente ficam marcadas com
// TODO-CLIENTE.

export const site = {
  // TODO-CLIENTE: nome comercial da loja de esculturas (e logo próprio).
  name: "Cristal Pet Esculturas",
  shortName: "Cristal Pet",
  tagline: "Esculturas 3D do seu pet",
  locale: "pt-BR",

  whatsapp: {
    number: "5519971548471",
    display: "(19) 97154-8471",
    // Mensagens já escritas na conversa, uma por origem do clique.
    messages: {
      escultura: "Olá! Quero fazer uma escultura 3D do meu pet.",
      duvida: "Olá! Tenho uma dúvida sobre as esculturas 3D.",
    },
  },
  email: "cristalpetmovel@gmail.com",

  address: {
    street: "Rua México, 311",
    city: "Indaiatuba",
    region: "SP",
  },

  // NÃO é 24h. Atendimento de segunda a sábado, nestes horários.
  hours: [
    { days: "Segunda a sexta", time: "8h às 17h" },
    { days: "Sábado", time: "8h às 13h" },
  ],
  hoursSentence: "de segunda a sexta, das 8h às 17h, e aos sábados, das 8h às 13h",

  social: {
    instagram: "https://www.instagram.com/cristalpetmovel",
    // TODO-CLIENTE: este link parece ser de perfil pessoal; trocar pela
    // página comercial da Cristal Pet no Facebook.
    facebook: "https://www.facebook.com/cristal.moraes.1232/",
  },

  // TODO-CLIENTE: CNPJ e razão social para o rodapé.
  // TODO-CLIENTE: endereço do site institucional da Cristal Pet Móvel (banho e
  // tosa), para o rodapé apontar para ele.
} as const;

/** Menu principal do cabeçalho (desktop) e do menu do celular. */
export const nav = [
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Tamanhos", href: "/#tamanhos" },
  { label: "Perguntas", href: "/#faq" },
  { label: "Contato", href: "/contato" },
] as const;

export const legalLinks = [
  { label: "Política de privacidade", href: "/politica-de-privacidade" },
  { label: "Termos de uso", href: "/termos-de-uso" },
  { label: "Trocas e devoluções", href: "/trocas-e-devolucoes" },
  { label: "Entrega e frete", href: "/entrega-e-frete" },
] as const;
