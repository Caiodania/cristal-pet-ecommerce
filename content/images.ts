// Registro das imagens da marca (fora da galeria, que tem o seu próprio arquivo).
// Dimensões conferidas nos arquivos: a página reserva o espaço e não "pula".
// Ícones ilustrados que acompanham um título têm alt vazio (decorativos); as
// fotos e ilustrações que carregam informação têm descrição.

export type Img = { src: string; width: number; height: number; alt: string };

const img = (src: string, width: number, height: number, alt = ""): Img => ({
  src: `/images/${src}`,
  width,
  height,
  alt,
});

export const images = {
  logo: img(
    "marca/logo-cristal-pet-movel.webp",
    500,
    500,
    "Logo da Cristal Pet Móvel: uma pata verde-água com um shih tzu de laço rosa em uma banheira de espuma",
  ),
  heroCao: img(
    "hero/cao-sorridente-bolhas-banho-movel.webp",
    900,
    900,
    "Cão sorridente cercado por bolhas de sabão após o banho na unidade móvel",
  ),

  servicos: {
    banho: img("servicos/icone-banho-terapeutico.webp", 250, 250),
    tosa: img("servicos/icone-tosa-higienica-e-da-raca.webp", 250, 250),
    hidratacao: img("servicos/icone-hidratacao-e-cuidados.webp", 250, 250),
  },

  diferenciais: {
    lowStress: img("diferenciais/icone-metodo-low-stress.webp", 250, 250),
    comodidade: img("diferenciais/icone-comodidade-total.webp", 250, 250),
    exclusivo: img("diferenciais/icone-atendimento-exclusivo.webp", 250, 250),
    qualidade: img("diferenciais/icone-qualidade-premiada.webp", 250, 250),
  },

  sobre: {
    missao: img("sobre/icone-missao.webp", 250, 250),
    visao: img("sobre/icone-visao.webp", 250, 250),
    valores: img("sobre/icone-valores.webp", 250, 250),
    corgi: img(
      "sobre/corgi-sorridente-recortado.webp",
      1024,
      1024,
      "Corgi sorridente recortado sobre uma forma orgânica cor de pêssego",
    ),
  },

  passos: {
    agendamento: img(
      "passos/passo-1-agendamento-whatsapp.webp",
      563,
      563,
      "Mão segurando um celular com o WhatsApp aberto para agendar o atendimento",
    ),
    van: img(
      "passos/passo-2-van-cristal-pet-interior.webp",
      563,
      563,
      "Interior da van da Cristal Pet, com mesa de tosa, secador e caixa de secagem",
    ),
    banho: img(
      "passos/passo-3-corgi-banho-com-espuma.webp",
      563,
      563,
      "Corgi tomando banho com espuma, sorrindo durante o atendimento",
    ),
    petFeliz: img(
      "passos/passo-4-maltes-feliz-apos-banho.webp",
      563,
      563,
      "Cão maltês branco com laço vermelho, limpo e feliz após o banho e a tosa",
    ),
  },

  cidades: img(
    "cidades/cidades-atendidas-montagem.webp",
    900,
    306,
    "Fotos aéreas de Indaiatuba, Campinas, Valinhos e Vinhedo, as cidades atendidas pela Cristal Pet",
  ),

  numeros: {
    pets: img("numeros/contador-pets-atendidos.webp", 80, 80),
    cidades: img("numeros/contador-cidades-atendidas.webp", 80, 80),
    anos: img("numeros/contador-anos-de-experiencia.webp", 80, 80),
  },

  premios: {
    ipope2025: img(
      "premios/certificado-ipope-2025-pet-movel.webp",
      1200,
      836,
      "Certificado IPOPE de Qualidade no Atendimento, edição 2025, categoria Pet Móvel, concedido à Cristal Pet Móvel em Indaiatuba, SP",
    ),
    ipope2024: img(
      "premios/certificado-ipope-2024-pet-shop.webp",
      1200,
      841,
      "Certificado IPOPE de Qualidade no Atendimento, edição 2024, categoria Pet Shop, concedido à Cristal Pet Móvel em Indaiatuba, SP",
    ),
  },

  franquia: {
    cartaz: img(
      "franquia/cartaz-seja-um-franqueado.webp",
      900,
      1279,
      "Cartaz da Cristal Pet Móvel com o convite Seja um Franqueado",
    ),
    posterPratica: img(
      "franquia/franquia-na-pratica-poster.webp",
      848,
      480,
      "Unidade móvel da Cristal Pet pronta para atender",
    ),
    posterAtendimento: img(
      "franquia/por-dentro-do-atendimento-poster.webp",
      848,
      480,
      "Atendimento dentro da unidade móvel da Cristal Pet",
    ),
  },
} as const;
