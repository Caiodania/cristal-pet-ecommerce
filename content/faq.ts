// Perguntas frequentes. Ficam em dados (e não no componente) porque o build
// também as usa para gerar o FAQPage do Google (etapa 4): as respostas são
// texto simples, sem JSX. Cada pergunta aparece em UMA página, para não
// repetir conteúdo entre URLs.
//
// Os textos do banho e tosa vêm do site atual da Cristal Pet (validados com o
// cliente). Os da escultura só dizem o que já está decidido; prazo, material,
// tamanho e preço entram quando o cliente passar (TODO-CLIENTE).

import { site } from "./site";

export type FaqItem = { question: string; answer: string };

/** FAQ da home: perguntas gerais. */
export const faqHome: FaqItem[] = [
  {
    question: "Quais cidades vocês atendem?",
    answer:
      "Atendemos atualmente Indaiatuba, Campinas, Valinhos e Vinhedo. Se você mora em outra região, fale com a gente pelo WhatsApp: estamos sempre avaliando novas áreas de cobertura.",
  },
  {
    question: "Minha cidade não está na lista de atendimento, e agora?",
    answer:
      "Mesmo assim, entre em contato! Estamos sempre expandindo nossa área de cobertura e talvez já estejamos chegando perto de você.",
  },
  {
    question: "Como entro em contato com a Cristal Pet?",
    answer: `Você pode falar com a gente pelo WhatsApp ${site.whatsapp.display}. Atendemos ${site.hoursSentence}.`,
  },
  {
    question: "Onde fica a sede da Cristal Pet?",
    answer: `Nossa base fica na ${site.address.street}, em ${site.address.city} - ${site.address.region}, de onde saem nossas unidades móveis para atender você na sua casa.`,
  },
  {
    question: "Como funciona a escultura 3D do meu pet?",
    answer:
      "Você envia uma foto do seu pet, vê a prévia da escultura em 3D e combina o pedido com a gente pelo WhatsApp. A peça é impressa em 3D pela nossa equipe.",
  },
];

/** FAQ da página de banho e tosa. */
export const faqBanho: FaqItem[] = [
  {
    question: "Como funciona o agendamento?",
    answer: `O agendamento é feito direto pelo WhatsApp. Você entra em contato, informa a cidade, o serviço desejado e a raça do seu pet, e a gente confirma o melhor dia e horário para o atendimento. Nosso atendimento é ${site.hoursSentence}.`,
  },
  {
    question: "Como funciona o atendimento da unidade móvel?",
    answer:
      "Nossa van totalmente equipada vai até a porta da sua casa. O banho e a tosa acontecem dentro do veículo, sem a necessidade de levar o seu pet até uma loja física. Para o atendimento, precisamos apenas de um ponto de água e de uma tomada 220 volts próximos ao local onde a van vai estacionar.",
  },
  {
    question: "Preciso estar em casa durante o atendimento?",
    answer:
      "Recomendamos que o tutor esteja em casa ou por perto durante o serviço, principalmente no momento da entrega do pet ao final do atendimento.",
  },
  {
    question: "Quais serviços vocês oferecem?",
    answer:
      "Trabalhamos com banho, tosa, hidratação, corte de unha e escovação de dente, adaptados às necessidades de cada pet. Fale com a gente para saber qual o serviço ideal para o seu companheiro.",
  },
  {
    question: "Quanto tempo dura o atendimento?",
    answer:
      "O tempo varia de acordo com a raça, o tipo de pelagem e o serviço escolhido. Em geral, o atendimento completo leva entre 40 minutos e 1 hora e meia.",
  },
  {
    question: "Posso remarcar ou cancelar meu horário?",
    answer:
      "Sim! Basta entrar em contato pelo WhatsApp com pelo menos 24 horas de antecedência para reagendar ou cancelar o seu horário sem problemas.",
  },
];

/** FAQ da página de esculturas. */
export const faqEscultura: FaqItem[] = [
  {
    question: "Como faço o pedido da escultura?",
    answer:
      "Você envia a foto do seu pet, escolhe as opções e vê a prévia em 3D. Depois, o pedido segue para o nosso WhatsApp, onde combinamos pagamento e entrega diretamente com você.",
  },
  {
    question: "Como devo tirar a foto do meu pet?",
    answer:
      "Use uma foto com um pet só, de preferência de corpo inteiro, com boa iluminação e fundo simples. Quanto mais nítida a foto, mais fiel fica a escultura.",
  },
  {
    question: "Quem faz a escultura?",
    answer:
      "A escultura é impressa em 3D pela própria equipe da Cristal Pet, a partir do modelo gerado com a foto do seu pet.",
  },
  {
    question: "Como é feito o pagamento?",
    answer:
      "O pagamento é combinado diretamente com a gente pelo WhatsApp, depois que você envia o pedido. Não é preciso criar conta nem cadastrar cartão no site.",
  },
];
