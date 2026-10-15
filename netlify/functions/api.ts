// Ponto de entrada da API na Netlify. Uma função atende todo `/api/*`; as rotas
// estão em server/router.ts. (Funções "v2": recebem um Request padrão e
// devolvem um Response padrão.)

import { handle } from "../../server/router";

const api = async (req: Request): Promise<Response> => handle(req);

export default api;

export const config = { path: "/api/*" };
