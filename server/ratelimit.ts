// Limite de tentativas em memória. Em serverless cada instância tem a sua
// própria contagem, então isto é uma proteção BÁSICA (login e criação de
// prévias); o limite diário "de verdade" fica no banco (ver services/previews).

const hits = new Map<string, number[]>();

/** true se ainda pode; false se passou do limite na janela. Conta a tentativa. */
export function allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // evita crescer sem fim
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return true;
}

export const resetRateLimits = () => hits.clear();
