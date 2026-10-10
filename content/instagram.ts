// Vídeos do Instagram exibidos em fachada: o embed (e o JavaScript do Instagram)
// só carrega quando a pessoa clica. Para trocar ou adicionar um vídeo, cole o
// link do reel (sem os parâmetros de rastreio) em `permalink`. A `description`
// aparece no card antes do clique e serve de nome acessível.
//
// TODO-FOTO: as fachadas ainda não têm miniatura. Exportar o quadro de abertura
// de cada reel e declarar em `poster`.

export type InstagramVideo = {
  id: string;
  permalink: string;
  description: string;
};

export const metodoLowStressReel: InstagramVideo = {
  id: "reel-dotl-ymdg28",
  permalink: "https://www.instagram.com/reel/DOTl_ymDg28/",
  description: "Método Low Stress na prática",
};

export const filhotesVideos: InstagramVideo[] = [
  {
    id: "reel-dpxd53tdr0s",
    permalink: "https://www.instagram.com/reel/DPXd53TDR0S/",
    description: "Adaptação de um filhote ao banho e tosa com a Cristal Pet Móvel",
  },
  {
    id: "reel-dpzpnisdf4y",
    permalink: "https://www.instagram.com/reel/DPZPNISDf4Y/",
    description: "Filhote no primeiro banho com o método Low Stress da Cristal Pet",
  },
];

export const feedbackVideos: InstagramVideo[] = [
  {
    id: "reel-do-hdj2juf5",
    permalink: "https://www.instagram.com/reel/DO_hdj2jUF5/",
    description: "Depoimento de cliente da Cristal Pet Móvel publicado no Instagram",
  },
  {
    id: "reel-c1prk8iocpu",
    permalink: "https://www.instagram.com/reel/C1PRK8iOcPu/",
    description: "Vídeo de um atendimento da Cristal Pet Móvel publicado no Instagram",
  },
  {
    id: "reel-dpgfkubje1i",
    permalink: "https://www.instagram.com/reel/DPGfKUbje1i/",
    description: "Depoimento de cliente da Cristal Pet Móvel publicado no Instagram",
  },
  {
    id: "reel-dpj5b-8dzsm",
    permalink: "https://www.instagram.com/reel/DPJ5B_8DZsM/",
    description: "Depoimento de cliente da Cristal Pet Móvel publicado no Instagram",
  },
];
