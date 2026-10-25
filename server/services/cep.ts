// Busca de endereço pelo CEP (ViaCEP, gratuito). Roda no SERVIDOR, não no
// navegador: assim o site não precisa liberar um terceiro na política de
// segurança nem expõe o CEP do cliente a outro serviço pelo navegador. Se o
// ViaCEP estiver fora do ar ou não achar, a resposta é "não achei" e o cliente
// digita o endereço à mão: o pedido nunca depende dele.

export type CepResult = { street: string; neighborhood: string; city: string; state: string };

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";

export async function lookupCep(cep: string, fetchImpl: typeof fetch = fetch): Promise<CepResult | null> {
  if (!/^\d{8}$/.test(cep)) return null;
  try {
    const response = await fetchImpl(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Record<string, unknown>;
    if (data.erro) return null;
    const result = {
      street: clean(data.logradouro, 120),
      neighborhood: clean(data.bairro, 80),
      city: clean(data.localidade, 80),
      state: clean(data.uf, 2).toUpperCase(),
    };
    return result.city && result.state ? result : null;
  } catch {
    return null;
  }
}
