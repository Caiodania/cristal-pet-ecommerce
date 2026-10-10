// Conteúdo da linha de serviço (banho e tosa móvel). Os textos vêm do site atual
// da Cristal Pet e do inventário do cliente. Para trocar um texto, mude aqui.

import { images, type Img } from "./images";

export const servicos = [
  {
    id: "banho",
    title: "Banho terapêutico e higienização",
    description:
      "Banhos relaxantes com produtos de alta qualidade, respeitando a pele e a pelagem do seu pet.",
    icon: images.servicos.banho,
    // entra na mensagem do WhatsApp quando o clique vem deste card
    whatsapp: "um banho terapêutico e higienização",
  },
  {
    id: "tosa",
    title: "Tosa higiênica e da raça",
    description:
      "Cortes precisos feitos por profissionais experientes, seguindo o padrão da raça ou a sua preferência.",
    icon: images.servicos.tosa,
    whatsapp: "uma tosa",
  },
  {
    id: "hidratacao",
    title: "Hidratação e cuidados especiais",
    description:
      "Tratamentos que recuperam o brilho e a maciez dos pelos, para um visual bonito e saudável.",
    icon: images.servicos.hidratacao,
    whatsapp: "uma hidratação",
  },
] satisfies { id: string; title: string; description: string; icon: Img; whatsapp: string }[];

// TODO-CLIENTE: preço dos serviços ("a partir de R$"). A estrutura dos cards
// já comporta uma linha de preço.

export const passosServico = [
  {
    number: "01",
    title: "Agendamento fácil",
    description:
      "Entre em contato pelo WhatsApp ou telefone. Encontramos o melhor dia e horário na nossa agenda para atender você.",
    image: images.passos.agendamento,
  },
  {
    number: "02",
    title: "Chegamos até você",
    description:
      "Nossa unidade móvel, totalmente equipada com água aquecida e tudo o que seu pet precisa, estaciona na sua residência no horário combinado.",
    image: images.passos.van,
  },
  {
    number: "03",
    title: "Cuidado exclusivo e seguro",
    description:
      "Todo o procedimento (banho, tosa e o que mais for preciso) acontece dentro da van, com a atenção 100% voltada para o seu AUmigo.",
    image: images.passos.banho,
  },
  {
    number: "04",
    title: "Seu pet feliz e cheiroso",
    description:
      "Ao final, entregamos seu pet limpo, cheiroso e, o mais importante, tranquilo e feliz, sem que ele precise sair do conforto do seu lar.",
    image: images.passos.petFeliz,
  },
];

export const diferenciais = [
  {
    title: "Método Low Stress",
    description:
      "Atendimento 100% focado no bem-estar do seu pet. Sem gaiolas e com um ambiente tranquilo para reduzir a ansiedade.",
    icon: images.diferenciais.lowStress,
  },
  {
    title: "Comodidade total",
    description:
      "Nós vamos até você. Chega de estresse com deslocamento: seu pet é cuidado no conforto e na segurança do ambiente que ele já conhece.",
    icon: images.diferenciais.comodidade,
  },
  {
    title: "Atendimento exclusivo",
    description:
      "O horário é inteiramente dedicado ao seu AUmigo, sem a presença nem o barulho de outros animais e sem gaiolas. Atenção e carinho do início ao fim.",
    icon: images.diferenciais.exclusivo,
  },
  {
    title: "Qualidade reconhecida",
    description:
      "Certificados IPOPE de Qualidade no Atendimento: categoria Pet Shop em 2024 e categoria Pet Móvel em 2025.",
    icon: images.diferenciais.qualidade,
  },
] satisfies { title: string; description: string; icon: Img }[];

// TODO-CLIENTE: o inventário fala em "3º ano consecutivo" como melhor banho e
// tosa de Indaiatuba, mas só há certificados de 2024 e 2025. Confirmar o
// terceiro prêmio antes de publicar essa frase.
export const certificados = [
  { ano: "2025", categoria: "Categoria Pet Móvel", image: images.premios.ipope2025 },
  { ano: "2024", categoria: "Categoria Pet Shop", image: images.premios.ipope2024 },
];

// Valores confirmados pelo cliente em 17/09/2026. Mostrados já com o número
// final no HTML: nada de "0" para quem não roda JavaScript.
export const numeros = [
  { id: "pets", value: "90 mil+", label: "Pets atendidos", icon: images.numeros.pets },
  { id: "cidades", value: "4", label: "Cidades atendidas", icon: images.numeros.cidades },
  { id: "anos", value: "9+", label: "Anos de experiência", icon: images.numeros.anos },
] satisfies { id: string; value: string; label: string; icon: Img }[];

export const filhotes = {
  intro:
    "O primeiro banho define como o seu filhote vai encarar o cuidado pelo resto da vida. Por isso, com o método Low Stress, tudo acontece no tempo dele, com paciência, carinho e sem estresse.",
  highlights: [
    "Primeiro contato sem pressa, sem gaiolas e sem outros animais por perto",
    "Sons, equipamentos e água aquecida apresentados aos poucos, no ritmo dele",
    "Adaptação gradual para que o banho vire um momento tranquilo pelo resto da vida",
  ],
};

export const sobre = {
  story: [
    "A Cristal Pet Móvel nasceu em 2017 do sonho de Alexandre Moraes de revolucionar a experiência de banho e tosa para os pets e seus tutores.",
    "Incomodado com o estresse e a ansiedade que muitos animais sentiam em ambientes agitados e impessoais, ele criou um serviço que une excelência técnica, conveniência e, acima de tudo, respeito pelo bem-estar animal.",
    "Começamos com uma van e um grande propósito: levar um cuidado de altíssima qualidade direto para a casa dos clientes. Hoje são mais de 90.000 atendimentos e uma rede de franqueados que leva o mesmo cuidado a Campinas, Valinhos e Vinhedo.",
  ],
  pillars: [
    {
      title: "Missão",
      body: "Proporcionar o serviço de banho e tosa mais seguro, confortável e conveniente do mercado, tratando cada pet com a dignidade e o carinho que ele merece, por meio do método Low Stress.",
      icon: images.sobre.missao,
    },
    {
      title: "Visão",
      body: "Ser a marca de referência e a primeira escolha em cuidado pet móvel no Brasil, expandindo a nossa qualidade por meio de uma rede de franqueados apaixonados.",
      icon: images.sobre.visao,
    },
  ],
  values: [
    "Bem-estar animal acima de tudo.",
    "Excelência e qualidade em cada detalhe.",
    "Comodidade e segurança para o cliente.",
    "Confiança e transparência.",
    "Inovação constante.",
  ],
};

export const franquia = {
  intro:
    "Leve para a sua cidade um modelo de banho e tosa móvel já testado, com marca reconhecida e um método de atendimento que conquistou milhares de tutores na região.",
  highlights: [
    "Marca premiada: certificados IPOPE de qualidade no atendimento",
    "Método Low Stress validado em mais de 90 mil atendimentos",
    "Modelo móvel: você leva o serviço até o cliente, sem ponto comercial",
    "Franquias já em funcionamento em Campinas, Valinhos e Vinhedo",
  ],
  // Vídeos locais: só baixam quando a pessoa aperta o play (preload="none").
  videos: [
    {
      id: "pratica",
      src: "/video/franquia-na-pratica.mp4",
      poster: images.franquia.posterPratica,
      title: "A franquia na prática",
      description: "A unidade móvel Cristal Pet pronta para rodar e atender.",
    },
    {
      id: "atendimento",
      src: "/video/franquia-por-dentro-do-atendimento.mp4",
      poster: images.franquia.posterAtendimento,
      title: "Por dentro do atendimento",
      description: "O dia a dia de quem opera uma unidade Cristal Pet.",
    },
  ],
};
