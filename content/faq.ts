// Perguntas frequentes da loja. Ficam em dados (e não no componente) porque o
// build também as usa para gerar o FAQPage do Google (etapa de SEO): as
// respostas são texto simples, sem JSX.
//
// Só dizem o que já está decidido. Prazo, material, tamanho e preço entram
// quando o cliente passar (TODO-CLIENTE).

import { previewsPerAccount } from "./estatua";
import { site } from "./site";

export type FaqItem = { question: string; answer: string };

export const faq: FaqItem[] = [
  {
    question: "Como funciona o pedido da escultura?",
    answer:
      "Você escolhe as opções, cria uma conta grátis, envia a foto do seu pet e vê a prévia da escultura. Se gostar, adiciona ao carrinho e envia o pedido para o nosso WhatsApp, onde combinamos pagamento e entrega diretamente com você.",
  },
  {
    question: "Como devo tirar a foto do meu pet?",
    answer:
      "Use uma foto com um pet só, de preferência de corpo inteiro, com boa iluminação e fundo simples. Quanto mais nítida a foto, mais fiel fica a escultura.",
  },
  {
    question: "A prévia é igual à escultura final?",
    answer:
      "A prévia é uma representação de como a escultura vai ficar. Antes de imprimir, conferimos tudo com você pelo WhatsApp, e o lado do pet que a foto não mostra é estimado.",
  },
  {
    question: "Quem faz a escultura?",
    answer:
      "A escultura é impressa em 3D pela própria equipe da Cristal Pet, a partir do modelo criado com a foto do seu pet.",
  },
  {
    question: "Como é feito o pagamento?",
    answer:
      "O pagamento é combinado diretamente com a gente pelo WhatsApp, depois que você envia o pedido. Você não cadastra cartão no site. A conta serve para gerar as prévias e acompanhar os pedidos.",
  },
  {
    question: "E o prazo e a entrega?",
    answer:
      "Informamos o prazo de produção e combinamos a entrega com você quando fechamos o pedido pelo WhatsApp.",
  },
  {
    question: "Preciso criar conta? Quantas prévias posso gerar?",
    answer: `Você navega pelo site sem conta. Para gerar a prévia, cria uma conta grátis (e-mail e senha, ou Google). Cada conta pode gerar até ${previewsPerAccount} prévias sem pagar nada: se não gostar do resultado, gera outra. Precisa de mais? É só falar com a gente pelo WhatsApp. Só pede a escultura quem gostar.`,
  },
  {
    question: "O que acontece com a foto do meu pet?",
    answer:
      "A foto fica ligada à sua conta e é usada apenas para gerar a prévia e a escultura do seu pedido. Os detalhes estão na política de privacidade.",
  },
  {
    question: "Como acompanho o meu pedido?",
    answer: `Em "Meus pedidos", na sua conta, você vê todos os pedidos e o andamento de cada um, em qualquer aparelho. O link que enviamos no WhatsApp também abre o pedido direto. Para falar com a gente: WhatsApp ${site.whatsapp.display}, ${site.hoursSentence}.`,
  },
];
