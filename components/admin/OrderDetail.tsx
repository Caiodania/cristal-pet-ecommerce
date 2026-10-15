"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import { Alert, Loading, StatusBadge, Timeline, formatDateTime } from "@/components/ui/Status";
import { DownloadIcon } from "@/components/ui/icons";
import { catalog } from "@/content/estatua";
import { ApiError, api, fileUrl } from "@/lib/loja/api";
import { formatCents } from "@/lib/loja/estimativa";
import {
  ORDER_STATUS_LABEL,
  ORDER_TRANSITIONS,
  type AdminOrderDto,
  type AdminOrderItemDto,
  type ModelDto,
  type OrderStatus,
} from "@/lib/loja/tipos";
import { useConfig } from "@/lib/loja/useConfig";
import { AdminBar, useAdmin } from "./AdminGate";

const labelOf = <T extends { id: string; label: string }>(list: T[], id: string) =>
  list.find((item) => item.id === id)?.label ?? id;

/** Texto do botão para ir a cada status. */
const ACTION: Record<OrderStatus, string> = {
  new: "Reabrir pedido",
  confirmed: "Confirmar pedido",
  in_production: "Iniciar produção",
  ready: "Marcar como pronto",
  delivered: "Marcar como entregue",
  canceled: "Cancelar pedido",
};

function whatsappTo(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

// ───────── Arquivo de impressão de um item ─────────

function ModelPanel({
  orderId,
  item,
  demo,
  onModel,
}: {
  orderId: string;
  item: AdminOrderItemDto;
  demo: boolean;
  onModel: (itemId: string, model: ModelDto) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const { model } = item;

  async function start() {
    setBusy(true);
    setError(undefined);
    try {
      onModel(item.id, await api.admin.startModel(orderId, item.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível pedir o arquivo 3D.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-soft bg-sand p-4">
      <h4 className="font-semibold">Arquivo para a impressora 3D</h4>

      {model.status === "none" && (
        <>
          <p className="text-sm text-ink-soft">Ainda não foi gerado. Gere depois de confirmar o pedido (esta etapa tem custo).</p>
          <div>
            <Button size="sm" onClick={start} disabled={busy}>
              {busy ? "Pedindo…" : "Gerar arquivo 3D"}
            </Button>
          </div>
        </>
      )}

      {(model.status === "queued" || model.status === "processing") && <Loading>Gerando o arquivo 3D…</Loading>}

      {model.status === "failed" && (
        <>
          <Alert>{model.errorMessage ?? "A geração do arquivo 3D falhou."}</Alert>
          <div>
            <Button size="sm" onClick={start} disabled={busy}>
              Tentar de novo
            </Button>
          </div>
        </>
      )}

      {model.status === "ready" && (
        <div className="flex flex-wrap gap-2">
          {model.stlUrl && (
            <Button href={fileUrl(model.stlUrl)} size="sm" icon={<DownloadIcon />} download>
              Baixar STL
            </Button>
          )}
          {model.glbUrl && (
            <Button href={fileUrl(model.glbUrl)} size="sm" variant="secondary" icon={<DownloadIcon />} download>
              Baixar GLB
            </Button>
          )}
        </div>
      )}

      {demo && model.status === "ready" && (
        <p className="text-sm text-ink-soft">Arquivo de teste (modo demonstração): não é a escultura do pet.</p>
      )}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

// ───────── Pedido ─────────

export function OrderDetail() {
  const params = useSearchParams();
  const id = params.get("id");
  const { expire } = useAdmin();
  const config = useConfig();

  const [order, setOrder] = useState<AdminOrderDto>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [adminNotes, setAdminNotes] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const fail = useCallback(
    (e: unknown, fallback: string) => {
      if (e instanceof ApiError && e.status === 401) return expire();
      setError(e instanceof ApiError ? e.message : fallback);
    },
    [expire],
  );

  useEffect(() => {
    if (!id) return;
    let active = true;
    api.admin
      .order(id)
      .then((loaded) => {
        if (!active) return;
        setOrder(loaded);
        setError(undefined);
      })
      .catch((e) => active && fail(e, "Não foi possível carregar o pedido."));
    return () => {
      active = false;
    };
  }, [id, fail]);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      setOrder(await api.admin.order(id));
    } catch {
      /* o estado anterior continua à vista */
    }
  }, [id]);

  // Atualiza o item na hora e, quando o arquivo 3D muda de fase, recarrega o pedido
  // inteiro: a linha do tempo ganha as anotações internas (pedido, pronto).
  const setItemModel = useCallback(
    (itemId: string, model: ModelDto) => {
      setOrder((current) =>
        current && { ...current, items: current.items.map((i) => (i.id === itemId ? { ...i, model } : i)) },
      );
      if (model.status !== "none") void reload();
    },
    [reload],
  );

  // enquanto algum arquivo 3D está sendo gerado, pergunta o andamento a cada 3 s
  const orderId = order?.id;
  const running = order?.items
    .filter((i) => i.model.status === "processing" || i.model.status === "queued")
    .map((i) => i.id)
    .join(",");
  useEffect(() => {
    if (!orderId || !running) return;
    const timer = setInterval(async () => {
      for (const itemId of running.split(",")) {
        try {
          setItemModel(itemId, await api.admin.model(orderId, itemId));
        } catch {
          /* tenta de novo no próximo ciclo */
        }
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [orderId, running, setItemModel]);

  async function changeStatus(next: OrderStatus) {
    if (!order) return;
    if (next === "canceled" && !window.confirm("Cancelar este pedido? Dá para reabrir depois.")) return;
    setBusy(true);
    setError(undefined);
    try {
      setOrder(await api.admin.updateOrder(order.id, { status: next, note: note.trim() || undefined }));
      setNote("");
    } catch (e) {
      fail(e, "Não foi possível mudar o status.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    if (!order || adminNotes === undefined) return;
    setBusy(true);
    setSaved(false);
    try {
      setOrder(await api.admin.updateOrder(order.id, { adminNotes }));
      setAdminNotes(undefined);
      setSaved(true);
    } catch (e) {
      fail(e, "Não foi possível salvar a anotação.");
    } finally {
      setBusy(false);
    }
  }

  if (!id) {
    return (
      <>
        <AdminBar />
        <main id="conteudo" className="container-page py-8">
          <Alert>Pedido não informado.</Alert>
        </main>
      </>
    );
  }

  // imagens ampliáveis: foto original e prévia de cada item
  const gallery: LightboxImage[] =
    order?.items.flatMap((item) => [
      ...(item.photoUrl ? [{ src: fileUrl(item.photoUrl)!, width: 1024, height: 1024, alt: `Foto original de ${item.petName ?? "o pet"}` }] : []),
      ...(item.imageUrl ? [{ src: fileUrl(item.imageUrl)!, width: 1024, height: 1024, alt: `Prévia da escultura de ${item.petName ?? "o pet"}` }] : []),
    ]) ?? [];
  const open = (url: string | undefined) => {
    const index = gallery.findIndex((g) => g.src === fileUrl(url));
    if (index >= 0) setLightbox(index);
  };

  return (
    <>
      <AdminBar />
      <main id="conteudo" className="container-page grid gap-8 py-8">
        <Link href="/admin" className="w-fit font-semibold text-teal-deep underline underline-offset-4">
          ← Pedidos
        </Link>

        {error && <Alert>{error}</Alert>}
        {!order && !error && <Loading>Carregando o pedido…</Loading>}

        {order && (
          <>
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-4xl font-medium">{order.code}</h1>
                <StatusBadge status={order.status} />
                <span className="text-ink-soft">Recebido em {formatDateTime(order.createdAt)}</span>
              </div>

              {ORDER_TRANSITIONS[order.status].length > 0 && (
                <div className="grid max-w-3xl gap-3 rounded-card border border-line bg-white p-4 shadow-soft">
                  <TextField
                    label="Recado para o cliente"
                    optional
                    maxLength={300}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    hint="Aparece na linha do tempo que o cliente vê (ex.: “Pix recebido”)."
                  />
                  <div className="flex flex-wrap gap-2">
                    {ORDER_TRANSITIONS[order.status].map((next) => (
                      <Button
                        key={next}
                        size="md"
                        variant={next === "canceled" ? "secondary" : "primary"}
                        disabled={busy}
                        onClick={() => void changeStatus(next)}
                      >
                        {ACTION[next]}
                        <span className="sr-only"> (muda para {ORDER_STATUS_LABEL[next]})</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
              <ul className="grid gap-6" aria-label="Esculturas do pedido">
                {order.items.map((item) => (
                  <Card as="li" key={item.id} className="grid gap-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-2xl font-medium">
                        {item.petName ? `Escultura de ${item.petName}` : "Escultura do pet"}
                      </h3>
                      <p className="font-semibold">{formatCents(item.unitCents)}</p>
                    </div>
                    <p className="text-ink-soft">
                      {labelOf(catalog.sizes, item.sizeId)}
                      {item.heightCm ? ` (${item.heightCm} cm)` : ""} · {labelOf(catalog.poses, item.poseId)} ·{" "}
                      {labelOf(catalog.colors, item.colorId)}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { url: item.photoUrl, label: "Foto original" },
                        { url: item.imageUrl, label: "Prévia aprovada" },
                      ].map(({ url, label }) => (
                        <figure key={label}>
                          {url ? (
                            <button
                              type="button"
                              onClick={() => open(url)}
                              className="block w-full overflow-hidden rounded-soft bg-sand"
                              aria-label={`Ampliar: ${label}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={fileUrl(url)} alt="" className="aspect-square w-full object-cover" />
                            </button>
                          ) : (
                            <div className="grid aspect-square place-items-center rounded-soft bg-sand text-sm text-ink-soft">
                              Sem imagem
                            </div>
                          )}
                          <figcaption className="mt-1 text-center text-sm text-ink-soft">{label}</figcaption>
                        </figure>
                      ))}
                    </div>

                    <ModelPanel orderId={order.id} item={item} demo={config?.mode === "demo"} onModel={setItemModel} />
                  </Card>
                ))}
              </ul>

              <div className="grid gap-6">
                <Card className="grid gap-2">
                  <h2 className="font-display text-xl font-medium">Cliente</h2>
                  <p className="font-semibold">{order.customerName ?? "—"}</p>
                  {order.city && <p className="text-ink-soft">{order.city}</p>}
                  {order.customerPhone ? (
                    <Button
                      href={whatsappTo(
                        order.customerPhone,
                        `Olá${order.customerName ? `, ${order.customerName.split(" ")[0]}` : ""}! Aqui é da Cristal Pet, sobre o seu pedido ${order.code}.`,
                      )}
                      size="sm"
                      variant="secondary"
                      className="w-fit"
                    >
                      Chamar no WhatsApp
                    </Button>
                  ) : (
                    <p className="text-sm text-ink-soft">Sem telefone: o cliente chama pelo WhatsApp da loja.</p>
                  )}
                  {order.notes && (
                    <p className="mt-2 rounded-soft bg-sand p-3 text-sm">
                      <span className="font-semibold">Observação do cliente:</span> {order.notes}
                    </p>
                  )}
                  <p className="mt-2 flex justify-between border-t border-line pt-3">
                    <span className="text-ink-soft">Valor estimado</span>
                    <strong>{formatCents(order.estimateCents)}</strong>
                  </p>
                </Card>

                <Card className="grid gap-3">
                  <TextAreaField
                    label="Anotações internas"
                    maxLength={2000}
                    value={adminNotes ?? order.adminNotes ?? ""}
                    onChange={(e) => {
                      setAdminNotes(e.target.value);
                      setSaved(false);
                    }}
                    hint="Só você vê."
                  />
                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={() => void saveNotes()} disabled={busy || adminNotes === undefined}>
                      Salvar anotação
                    </Button>
                    {saved && <span role="status" className="text-sm font-semibold text-teal-deep">Salvo.</span>}
                  </div>
                </Card>

                <Card>
                  <h2 className="mb-4 font-display text-xl font-medium">Andamento</h2>
                  <Timeline events={order.timeline} />
                </Card>
              </div>
            </div>
          </>
        )}

        <Lightbox
          label="Imagens do pedido"
          images={gallery}
          index={lightbox}
          onIndexChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      </main>
    </>
  );
}

