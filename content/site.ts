// Dados da loja num só lugar: trocar telefone, horário ou texto aqui reflete no
// cabeçalho, rodapé, WhatsApp e FAQ. Pendências do cliente ficam marcadas com
// TODO-CLIENTE.

export const site = {
  // Nome e logo: AUmor de Patas (o cliente mandou o logo; fica em assets/marca/).
  name: "AUmor de Patas",
  shortName: "AUmor de Patas",
  /** Descrição das coleções da loja. */
  descriptor: "Esculturas e quadros",
  tagline: "Seu pet em esculturas e quadros",
  locale: "pt-BR",

  whatsapp: {
    number: "5519971548471",
    display: "(19) 97154-8471",
    // Mensagens já escritas na conversa, uma por origem do clique.
    messages: {
      escultura: "Olá! Quero fazer uma escultura 3D do meu pet.",
      quadro: "Olá! Quero fazer um quadro personalizado do meu pet.",
      duvida: "Olá! Tenho uma dúvida sobre os quadros e as esculturas do meu pet.",
    },
  },
  // TODO-CLIENTE: telefone, e-mail, endereço, horário e redes abaixo ainda são os
  // da Cristal Pet Móvel (o site anterior). Trocar pelos da AUmor de Patas.
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
    // página comercial da AUmor de Patas no Facebook.
    facebook: "https://www.facebook.com/cristal.moraes.1232/",
  },

  // TODO-CLIENTE: CNPJ e razão social para o rodapé.
  // TODO-CLIENTE: se a AUmor de Patas tiver um site institucional, o endereço dele
  // para o rodapé apontar.
} as const;

/** Menu principal do cabeçalho (desktop) e do menu do celular. */
export const nav = [
  { label: "Esculturas", href: "/personalizar" },
  { label: "Quadros", href: "/quadros" },
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Contato", href: "/contato" },
] as const;

export const legalLinks = [
  { label: "Política de privacidade", href: "/politica-de-privacidade" },
  { label: "Termos de uso", href: "/termos-de-uso" },
  { label: "Trocas e devoluções", href: "/trocas-e-devolucoes" },
  { label: "Entrega e frete", href: "/entrega-e-frete" },
] as const;
