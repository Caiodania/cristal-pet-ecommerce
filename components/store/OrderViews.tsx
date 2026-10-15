"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CreateButton } from "@/components/ui/CtaButtons";
import { Alert, Loading, StatusBadge, Timeline, formatDateTime } from "@/components/ui/Status";
import { catalog } from "@/content/estatua";
import { ApiError, api, fileUrl } from "@/lib/loja/api";
import { useOrderHistory, type OrderRef } from "@/lib/loja/carrinho";
import { formatCents } from "@/lib/loja/estimativa";
import { orderSupportUrl } from "@/lib/loja/pedido-whatsapp";
import type { OrderDto } from "@/lib/loja/tipos";

const labelOf = <T extends { id: string; label: string }>(list: T[], id: string) =>
  list.find((item) => item.id === id)?.label ?? id;

type Loaded = { state: "loading" } | { state: "ok"; order: OrderDto } | { state: "error"; message: string; notFound: boolean };

function useOrder(code: string | null, token: string | null): Loaded {
  const [loaded, setLoaded] = useState<Loaded & { key?: string }>({ state: "loading" });
  const key = code && token ? `${code}:${token}` : undefined;

  useEffect(() => {
    if (!code || !token) return;
    let active = true;
    api
      .getOrder(code, token)
      .then((order) => active && setLoaded({ state: "ok", order, key }))
      .catch(
        (error) =>
          active &&
          setLoaded({
            state: "error",
            notFound: error instanceof ApiError && error.status === 404,
            message: error instanceof ApiError ? error.message : "Não foi possível carregar o pedido.",
            key,
          }),
      );
    return () => {
      active = false;
    };
  }, [code, token, key]);

  if (!key) return { state: "error", message: "Link do pedido incompleto. Use o link que enviamos ou o de Meus pedidos.", notFound: true };
  // evita mostrar o pedido anterior enquanto o novo carrega
  return loaded.key === key || loaded.state === "loading" ? loaded : { state: "loading" };
}

// ───────── /pedido?c=…&t=… ─────────

export function OrderView() {
  const params = useSearchParams();
  const code = params.get("c");
  const token = params.get("t");
  const loaded = useOrder(code, token);
  const history = useOrderHistory();

  // abriu o link em outro aparelho: guarda no histórico daqui
  const order = loaded.state === "ok" ? loaded.order : undefined;
  const { add } = history;
  const known = history.orders.some((o) => o.code === order?.code);
  useEffect(() => {
    if (order && token && !known) {
      add({ code: order.code, token, createdAt: order.createdAt, itemCount: order.items.length });
    }
  }, [order, token, known, add]);

  if (loaded.state === "loading") return <Loading>Carregando o pedido…</Loading>;
  if (loaded.state === "error") {
    return (
      <div className="grid max-w-xl gap-4">
        <Alert>{loaded.message}</Alert>
        <div className="flex flex-wrap gap-3">
          <Button href="/meus-pedidos" size="md">Meus pedidos</Button>
          <Button href="/contato" size="md" variant="secondary">Falar com a gente</Button>
        </div>
      </div>
    );
  }

  const o = loaded.order;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={o.status} audience="customer" />
          <span className="text-ink-soft">Feito em {formatDateTime(o.createdAt)}</span>
        </div>

        <ul className="grid gap-4" aria-label="Esculturas do pedido">
          {o.items.map((item) => (
            <Card as="li" key={item.id} className="flex gap-4 sm:gap-6">
              <div className="size-24 shrink-0 overflow-hidden rounded-soft bg-sand sm:size-32">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl(item.imageUrl)} alt={`Prévia da escultura${item.petName ? ` de ${item.petName}` : ""}`} className="size-full object-cover" />
                ) : null}
              </div>
              <div className="grid content-start gap-1">
                <h3 className="font-display text-xl font-medium">
                  {item.petName ? `Escultura de ${item.petName}` : "Escultura do seu pet"}
                </h3>
                <p className="text-ink-soft">
                  {labelOf(catalog.sizes, item.sizeId)} · {labelOf(catalog.poses, item.poseId)} ·{" "}
                  {labelOf(catalog.colors, item.colorId)}
                </p>
                <p className="font-semibold">{formatCents(item.unitCents)}</p>
              </div>
            </Card>
          ))}
        </ul>

        <p className="flex justify-between gap-3 border-t border-line pt-4 text-lg">
          <span>Valor estimado</span>
          <strong>{formatCents(o.estimateCents)}</strong>
        </p>
        <p className="-mt-4 text-sm text-ink-soft">O valor final é combinado com você no WhatsApp.</p>
      </div>

      <aside className="grid gap-6 rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
        <div>
          <p className="text-sm text-ink-soft">Pedido</p>
          <p className="font-display text-3xl font-medium text-teal-deep">{o.code}</p>
        </div>
        <div>
          <h2 className="mb-3 font-display text-xl font-medium">Andamento</h2>
          <Timeline events={o.timeline} audience="customer" />
        </div>
        <Button href={orderSupportUrl(o.code)} variant="secondary" size="md">
          Falar sobre este pedido
        </Button>
      </aside>
    </div>
  );
}

// ───────── /meus-pedidos ─────────

function OrderRow({ order: ref }: { order: OrderRef }) {
  const loaded = useOrder(ref.code, ref.token);
  return (
    <Card as="li" className="flex flex-wrap items-center justify-between gap-4">
      <div className="grid gap-1">
        <p className="font-display text-2xl font-medium text-teal-deep">{ref.code}</p>
        <p className="text-sm text-ink-soft">
          {formatDateTime(ref.createdAt)} · {ref.itemCount} {ref.itemCount === 1 ? "escultura" : "esculturas"}
          {loaded.state === "ok" && ` · ${formatCents(loaded.order.estimateCents)}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {loaded.state === "ok" && <StatusBadge status={loaded.order.status} audience="customer" />}
        {loaded.state === "loading" && <span className="text-sm text-ink-soft">Atualizando…</span>}
        {loaded.state === "error" && <span className="text-sm text-ink-soft">Sem atualização</span>}
        <Button href={`/pedido?c=${ref.code}&t=${ref.token}`} size="sm" variant="secondary">
          Ver o pedido<span className="sr-only"> {ref.code}</span>
        </Button>
      </div>
    </Card>
  );
}

export function MyOrders() {
  const { orders } = useOrderHistory();

  if (orders.length === 0) {
    return (
      <div className="mx-auto grid max-w-md justify-items-center gap-4 text-center">
        <p className="font-display text-2xl font-medium">Nenhum pedido neste aparelho</p>
        <p className="text-ink-soft">
          Os pedidos que você enviar ficam aqui. Se fez o pedido em outro aparelho, abra o link que recebeu e ele
          aparece neste também.
        </p>
        <CreateButton />
      </div>
    );
  }
  return (
    <div className="grid gap-6">
      <ul className="grid gap-4" aria-label="Seus pedidos">
        {orders.map((order) => (
          <OrderRow key={order.code} order={order} />
        ))}
      </ul>
      <p className="text-sm text-ink-soft">
        Estes são os pedidos feitos neste aparelho. Para tirar dúvidas, fale com a gente pelo{" "}
        <Link href="/contato" className="font-semibold text-teal-deep underline underline-offset-4">
          contato
        </Link>
        .
      </p>
    </div>
  );
}
