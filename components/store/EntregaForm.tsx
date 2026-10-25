"use client";

import { useEffect, useRef, useState } from "react";
import { SelectField, TextField } from "@/components/ui/Field";
import { site } from "@/content/site";
import { api } from "@/lib/loja/api";
import { cn } from "@/lib/cn";
import { BR_STATES, DELIVERY_LABEL, formatCep, type Address, type DeliveryMethod } from "@/lib/loja/tipos";

export type EntregaValues = {
  delivery: DeliveryMethod;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export const EMPTY_ENTREGA: EntregaValues = {
  delivery: "entrega",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

export type EntregaErrors = Partial<Record<keyof EntregaValues, string>>;

/** Só valida o endereço quando a escolha é entrega (na retirada ele nem aparece). */
export function validateEntrega(v: EntregaValues): EntregaErrors {
  if (v.delivery !== "entrega") return {};
  const errors: EntregaErrors = {};
  if (v.cep.replace(/\D/g, "").length !== 8) errors.cep = "Informe o CEP com 8 números.";
  if (v.street.trim().length < 3) errors.street = "Informe a rua ou avenida.";
  if (!v.number.trim()) errors.number = 'Informe o número (ou "s/n").';
  if (v.neighborhood.trim().length < 2) errors.neighborhood = "Informe o bairro.";
  if (v.city.trim().length < 2) errors.city = "Informe a cidade.";
  if (!(BR_STATES as readonly string[]).includes(v.state)) errors.state = "Escolha o estado.";
  return errors;
}

/** O endereço no formato que a API espera. */
export const toAddress = (v: EntregaValues): Address => ({
  cep: v.cep.replace(/\D/g, ""),
  street: v.street.trim(),
  number: v.number.trim(),
  complement: v.complement.trim() || undefined,
  neighborhood: v.neighborhood.trim(),
  city: v.city.trim(),
  state: v.state,
});

const maskCep = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? formatCep(digits) || `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

const methods: { id: DeliveryMethod; hint: string }[] = [
  { id: "entrega", hint: "Combinamos o envio e o prazo com você no WhatsApp." },
  { id: "retirada", hint: `Você busca com a gente em ${site.address.city} - ${site.address.region}.` },
];

/**
 * "Como você quer receber": entrega (com endereço) ou retirada. Digitar o CEP
 * completo busca rua, bairro, cidade e estado sozinho (pelo servidor); se não
 * achar, o cliente preenche à mão. Os campos usam os nomes de autopreenchimento
 * do navegador (autocomplete), então o celular sugere o endereço salvo.
 */
export function EntregaForm({
  value,
  onChange,
  errors,
}: {
  value: EntregaValues;
  /** Mescla os campos novos no estado do pai. */
  onChange: (patch: Partial<EntregaValues>) => void;
  errors: EntregaErrors;
}) {
  const [lookup, setLookup] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  // o valor mais recente, para a resposta do CEP não apagar o que a pessoa digitou enquanto esperava
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  const lastCep = useRef("");

  function changeCep(raw: string) {
    const masked = maskCep(raw);
    onChange({ cep: masked });
    const digits = masked.replace(/\D/g, "");
    if (digits.length !== 8) return setLookup("idle");
    if (digits === lastCep.current) return;
    lastCep.current = digits;
    setLookup("loading");
    api
      .cep(digits)
      .then((result) => {
        if (lastCep.current !== digits) return; // o CEP mudou enquanto buscava
        if (!result.found || !result.address) return setLookup("notfound");
        // preenche só o que ainda está vazio: não apaga o que a pessoa já digitou
        const now = latest.current;
        onChange({
          street: now.street || result.address.street,
          neighborhood: now.neighborhood || result.address.neighborhood,
          city: now.city || result.address.city,
          state: now.state || result.address.state,
        });
        setLookup("found");
      })
      .catch(() => lastCep.current === digits && setLookup("notfound"));
  }

  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-3">
        <legend className="mb-1 font-semibold">Como você quer receber?</legend>
        {methods.map((method) => (
          <label key={method.id} className="cursor-pointer">
            <input
              type="radio"
              name="delivery"
              value={method.id}
              checked={value.delivery === method.id}
              onChange={() => onChange({ delivery: method.id })}
              className="peer sr-only"
            />
            <span
              className={cn(
                "grid gap-0.5 rounded-soft border-2 border-line bg-white p-3 transition-colors hover:border-magenta/50",
                "peer-checked:border-magenta peer-checked:bg-magenta-mist",
                "peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-magenta",
              )}
            >
              <span className="font-bold">{DELIVERY_LABEL[method.id]}</span>
              <span className="text-sm text-ink-soft">{method.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {value.delivery === "entrega" && (
        <div className="grid gap-4" role="group" aria-label="Endereço de entrega">
          <TextField
            label="CEP"
            name="cep"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
            value={value.cep}
            onChange={(e) => changeCep(e.target.value)}
            error={errors.cep}
            hint={
              lookup === "loading"
                ? "Buscando o endereço…"
                : lookup === "found"
                  ? "Endereço encontrado: confira e complete o número."
                  : lookup === "notfound"
                    ? "Não achamos este CEP. Preencha o endereço à mão."
                    : "Ao digitar o CEP completo, preenchemos o resto."
            }
          />
          <TextField
            label="Rua ou avenida"
            name="street"
            autoComplete="address-line1"
            maxLength={120}
            value={value.street}
            onChange={(e) => onChange({ street: e.target.value })}
            error={errors.street}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Número"
              name="number"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              value={value.number}
              onChange={(e) => onChange({ number: e.target.value })}
              error={errors.number}
            />
            <TextField
              label="Complemento"
              name="complement"
              optional
              autoComplete="address-line2"
              maxLength={60}
              value={value.complement}
              onChange={(e) => onChange({ complement: e.target.value })}
            />
          </div>
          <TextField
            label="Bairro"
            name="neighborhood"
            autoComplete="off"
            maxLength={80}
            value={value.neighborhood}
            onChange={(e) => onChange({ neighborhood: e.target.value })}
            error={errors.neighborhood}
          />
          <div className="grid grid-cols-[1fr_6.5rem] gap-4">
            <TextField
              label="Cidade"
              name="city"
              autoComplete="address-level2"
              maxLength={80}
              value={value.city}
              onChange={(e) => onChange({ city: e.target.value })}
              error={errors.city}
            />
            <SelectField
              label="UF"
              name="state"
              autoComplete="address-level1"
              value={value.state}
              onChange={(e) => onChange({ state: e.target.value })}
              error={errors.state}
            >
              <option value="">—</option>
              {BR_STATES.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
      )}
    </div>
  );
}
