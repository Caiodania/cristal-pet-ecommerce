"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  DELIVERY_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_TRANSITIONS,
  formatAddress,
  formatPhone,
  type AdminOrderDto,
  type AdminOrderItemDto,
  type ModelDto,
  type OrderStatus,
} from "@/lib/loja/tipos";
import { useConfig } from "@/lib/loja/useConfig";
import { AdminBar, lostAccess, useAdmin } from "./AdminGate";

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

/** Os dados de envio em texto puro, prontos para colar numa etiqueta ou numa mensagem. */
function shippingText(order: AdminOrderDto): string {
  const lines = [`Pedido ${order.code}`, `Destinatário: ${order.customerName ?? "—"}`];
  if (order.customerPhone) lines.push(`WhatsApp: ${formatPhone(order.customerPhone)}`);
  if (order.deliveryMethod === "retirada") lines.push("Retirada com a loja (sem envio)");
  else if (order.address) lines.push(formatAddress(order.address));
  return lines.join("\n");
}

// ───────── Arquivo de impressão de um item ─────────

/**
 * O passo que o dono controla: transformar a prévia que o cliente aprovou em um
 * arquivo 3D para a impressora. Gerar custa dinheiro no provedor, então pede
 * confirmação antes (também ao gerar de novo). Enquanto gera, mostra o andamento.
 */
function ModelPanel({
  orderId,
  orderStatus,
  item,
  demo,
  providerName,
  onModel,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  item: AdminOrderItemDto;
  demo: boolean;
  providerName?: string;
  onModel: (itemId: string, model: ModelDto) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const { model } = item;
  const canceled = orderStatus === "canceled";
  const name = item.petName ?? "o pet";

  async function start(regenerate: boolean) {
    setBusy(true);
    setError(undefined);
    try {
      onModel(item.id, await api.admin.startModel(orderId, item.id, { regenerate }));
      setConfirming(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível pedir o arquivo 3D.");
    } finally {
      setBusy(false);
    }
  }

  const running = model.status === "queued" || model.status === "processing";
  const regenerate = model.status === "ready";
  const provider = model.provider ?? providerName;

  return (
    <section aria-label={`Arquivo 3D de ${name}`} className="grid gap-4 rounded-soft bg-sand p-4">
      <div className="flex flex-wrap items-start gap-4">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(item.imageUrl)} alt="" className="size-16 shrink-0 rounded-soft bg-white object-cover" />
        )}
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h4 className="font-semibold">Arquivo para a impressora 3D</h4>
          <p className="text-sm text-ink-soft">
            Sai da prévia que o cliente aprovou
            {item.heightCm ? `, na altura de ${item.heightCm} cm` : ""}.
            {provider ? ` Gerado por ${provider}.` : ""}
          </p>
          {!!model.costCents && (
            <p className="text-sm text-ink-soft">Custo até agora: {formatCents(model.costCents)}</p>
          )}
        </div>
      </div>

      {model.status === "none" && !confirming && (
        <div className="grid gap-2">
          {canceled ? (
            <p className="text-sm text-ink-soft">Este pedido está cancelado: reabra o pedido para gerar o arquivo.</p>
          ) : !item.imageUrl ? (
            <p className="text-sm text-ink-soft">Este item não tem uma prévia aprovada para virar arquivo 3D.</p>
          ) : (
            <>
              {orderStatus === "new" && (
                <p className="text-sm text-ink-soft">
                  Dica: gere depois de confirmar o pedido com o cliente, porque esta etapa tem custo.
                </p>
              )}
              <div>
                <Button size="sm" onClick={() => setConfirming(true)}>
                  Gerar arquivo 3D
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {running && (
        <div className="grid gap-2" aria-live="polite">
          {typeof model.progress === "number" ? (
            <>
              <div
                role="progressbar"
                aria-label={`Gerando o arquivo 3D de ${name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(model.progress)}
                className="h-3 overflow-hidden rounded-full bg-white"
              >
                <div
                  className="h-full rounded-full bg-teal-deep transition-[width] duration-500"
                  style={{ width: `${Math.max(4, Math.min(100, model.progress))}%` }}
                />
              </div>
              <p className="text-sm text-ink-soft">
                {model.status === "queued" ? "Na fila…" : `Gerando o arquivo 3D… ${Math.round(model.progress)}%`}
              </p>
            </>
          ) : (
            <Loading>{model.status === "queued" ? "Na fila…" : "Gerando o arquivo 3D…"}</Loading>
          )}
          <p className="text-sm text-ink-soft">Pode levar alguns minutos. Você pode sair desta página: o arquivo continua sendo gerado.</p>
        </div>
      )}

      {model.status === "failed" && !confirming && (
        <div className="grid gap-2">
          <Alert>{model.errorMessage ?? "A geração do arquivo 3D falhou."}</Alert>
          {!canceled && (
            <div>
              <Button size="sm" onClick={() => setConfirming(true)}>
                Tentar de novo
              </Button>
            </div>
          )}
        </div>
      )}

      {model.status === "ready" && !confirming && (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {model.stlUrl && (
              <Button href={fileUrl(model.stlUrl)} size="sm" icon={<DownloadIcon />} download>
                Baixar STL (impressão)
              </Button>
            )}
            {model.glbUrl && (
              <Button href={fileUrl(model.glbUrl)} size="sm" variant="secondary" icon={<DownloadIcon />} download>
                Baixar GLB (visualizar)
              </Button>
            )}
          </div>
          {demo && (
            <p className="text-sm text-ink-soft">Arquivo de teste (modo demonstração): não é a escultura do pet.</p>
          )}
          <details className="rounded-soft bg-white p-3 text-sm">
            <summary className="cursor-pointer py-2 font-semibold">Antes de imprimir</summary>
            <ul className="mt-2 grid list-disc gap-1 pl-5 text-ink-soft">
              <li>
                Abra o STL no fatiador (Bambu Studio, PrusaSlicer, Cura…) e confira a escala
                {item.heightCm ? `: a altura deve ficar perto de ${item.heightCm} cm` : ""}.
              </li>
              <li>Veja se a malha está fechada (sem buracos) e se orelhas, patas e rabo não ficaram finos demais.</li>
              <li>Confira se há uma base plana para apoiar na mesa. Se não houver, adicione uma no fatiador.</li>
              <li>O GLB serve para girar e conferir o modelo na tela; o STL é o que vai para a impressora.</li>
            </ul>
          </details>
          {!canceled && (
            <div>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
                Gerar de novo
              </Button>
            </div>
          )}
        </div>
      )}

      {confirming && (
        <div role="group" aria-label="Confirmar a geração" className="grid gap-3 rounded-soft border-2 border-magenta/40 bg-white p-4">
          <p className="font-semibold">
            {regenerate ? `Gerar o arquivo 3D de ${name} de novo?` : `Gerar o arquivo 3D de ${name}?`}
          </p>
          <p className="text-sm text-ink-soft">
            {regenerate
              ? "Isso cobra de novo no serviço de IA 3D e troca os arquivos atuais pelos novos."
              : "Isso usa o serviço de IA 3D e tem custo por arquivo."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void start(regenerate)} disabled={busy}>
              {busy ? "Pedindo…" : "Sim, gerar"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
    </section>
  );
}

// ───────── Envio ─────────

function ShippingCard({ order }: { order: AdminOrderDto }) {
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(shippingText(order));
      setCopy("done");
    } catch {
      setCopy("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopy("idle"), 3000);
  }

  const pickup = order.deliveryMethod === "retirada";
  return (
    <Card className="grid gap-3">
      <h2 className="font-display text-xl font-extrabold">Envio</h2>

      <div className="grid gap-0.5">
        <p className="text-sm font-semibold text-ink-soft">
          {order.deliveryMethod ? DELIVERY_LABEL[order.deliveryMethod] : "Forma de entrega não informada"}
        </p>
        <p className="font-semibold">{order.customerName ?? "—"}</p>
        {order.customerPhone && <p>{formatPhone(order.customerPhone)}</p>}
      </div>

      {order.address ? (
        <address className="whitespace-pre-line rounded-soft bg-sand p-3 not-italic">{formatAddress(order.address)}</address>
      ) : pickup ? (
        <p className="rounded-soft bg-sand p-3 text-sm">O cliente busca com a loja: não precisa de endereço.</p>
      ) : (
        <p className="rounded-soft bg-sand p-3 text-sm text-ink-soft">
          Pedido sem endereço cadastrado{order.city ? ` (cidade: ${order.city})` : ""}. Combine pelo WhatsApp.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => void copyText()}>
          Copiar dados de envio
        </Button>
        {order.customerPhone && (
          <Button
            href={whatsappTo(
              order.customerPhone,
              `Olá${order.customerName ? `, ${order.customerName.split(" ")[0]}` : ""}! Aqui é da Cristal Pet, sobre o seu pedido ${order.code}.`,
            )}
            size="sm"
            variant="secondary"
            target="_blank"
            rel="noopener"
          >
            Chamar no WhatsApp<span className="sr-only"> (abre em nova aba)</span>
          </Button>
        )}
      </div>
      <p role="status" className="min-h-5 text-sm font-semibold text-teal-deep">
        {copy === "done" && "Copiado! É só colar."}
        {copy === "failed" && "Não deu para copiar: selecione o texto e copie à mão."}
      </p>

      {order.accountEmail && (
        <p className="border-t border-line pt-3 text-sm text-ink-soft">
          Conta do cliente: <span className="break-all font-semibold text-ink">{order.accountEmail}</span>
        </p>
      )}
      {order.notes && (
        <p className="rounded-soft bg-sand p-3 text-sm">
          <span className="font-semibold">Observação do cliente:</span> {order.notes}
        </p>
      )}
      <p className="flex justify-between border-t border-line pt-3">
        <span className="text-ink-soft">Valor estimado</span>
        <strong>{formatCents(order.estimateCents)}</strong>
      </p>
    </Card>
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
      if (lostAccess(e)) expire();
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
                <h1 className="font-display text-4xl font-extrabold">{order.code}</h1>
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
                      <h3 className="font-display text-2xl font-extrabold">
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
                        { url: item.photoUrl, label: "Foto original", download: item.photoDownloadUrl },
                        { url: item.imageUrl, label: "Prévia aprovada", download: item.imageDownloadUrl },
                      ].map(({ url, label, download }) => (
                        <figure key={label} className="grid gap-2">
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
                          <figcaption className="text-center text-sm text-ink-soft">{label}</figcaption>
                          {download && (
                            <Button
                              href={fileUrl(download)}
                              size="sm"
                              variant="secondary"
                              icon={<DownloadIcon />}
                              className="w-full"
                              download
                            >
                              Baixar<span className="sr-only"> {label.toLowerCase()}</span>
                            </Button>
                          )}
                        </figure>
                      ))}
                    </div>

                    <ModelPanel
                      orderId={order.id}
                      orderStatus={order.status}
                      item={item}
                      demo={config?.mode === "demo"}
                      providerName={config?.modelProvider.name}
                      onModel={setItemModel}
                    />
                  </Card>
                ))}
              </ul>

              <div className="grid gap-6">
                <ShippingCard order={order} />

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
                  <h2 className="mb-4 font-display text-xl font-extrabold">Andamento</h2>
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
