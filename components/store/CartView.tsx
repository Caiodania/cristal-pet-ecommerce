"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CreateButton } from "@/components/ui/CtaButtons";
import { CheckboxField, TextAreaField, TextField } from "@/components/ui/Field";
import { Alert, Loading } from "@/components/ui/Status";
import { ArrowRightIcon, TrashIcon } from "@/components/ui/icons";
import { catalog } from "@/content/estatua";
import { ApiError, api, fileUrl } from "@/lib/loja/api";
import { LoginPrompt } from "@/components/conta/LoginPrompt";
import { useCart, useOrderHistory, type CartItem } from "@/lib/loja/carrinho";
import { account, useAccount } from "@/lib/loja/conta";
import { estimate, formatCents } from "@/lib/loja/estimativa";
import { fallbackMessage, orderMessage, whatsappUrl } from "@/lib/loja/pedido-whatsapp";
import type { OrderDto } from "@/lib/loja/tipos";

const labelOf = <T extends { id: string; label: string }>(list: T[], id: string) =>
  list.find((item) => item.id === id)?.label ?? id;

// ───────── Item do carrinho ─────────

type Preview = { status: "loading" } | { status: "ok"; imageUrl?: string } | { status: "gone" };

function CartItemRow({
  item,
  unitCents,
  onRemove,
  onGone,
}: {
  item: CartItem;
  unitCents: number | null;
  onRemove: () => void;
  onGone: (id: string) => void;
}) {
  const [preview, setPreview] = useState<Preview>({ status: "loading" });

  // o link da imagem é temporário: pede um novo ao servidor a cada visita
  useEffect(() => {
    let active = true;
    api
      .getPreview(item.previewId)
      .then((p) => {
        if (!active) return;
        if (p.status === "ready") setPreview({ status: "ok", imageUrl: fileUrl(p.imageUrl) });
        else {
          setPreview({ status: "gone" });
          onGone(item.id);
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 404) {
          setPreview({ status: "gone" });
          onGone(item.id);
        } else setPreview({ status: "ok" }); // sem rede: mostra sem a imagem
      });
    return () => {
      active = false;
    };
  }, [item.previewId, item.id, onGone]);

  const { options } = item;
  return (
    <Card as="li" className="flex gap-4 sm:gap-6">
      <div className="size-24 shrink-0 overflow-hidden rounded-soft bg-sand sm:size-32">
        {preview.status === "ok" && preview.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.imageUrl} alt={`Prévia da escultura${options.petName ? ` de ${options.petName}` : ""}`} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center p-2 text-center text-xs text-ink-soft">
            {preview.status === "loading" ? "Carregando…" : "Sem imagem"}
          </div>
        )}
      </div>
      <div className="grid min-w-0 flex-1 content-start gap-1">
        <h3 className="font-display text-xl font-extrabold">
          {options.petName ? `Escultura de ${options.petName}` : "Escultura do seu pet"}
        </h3>
        <p className="text-ink-soft">
          {labelOf(catalog.sizes, options.sizeId)} · {labelOf(catalog.poses, options.poseId)} ·{" "}
          {labelOf(catalog.colors, options.colorId)}
        </p>
        <p className="font-semibold">{formatCents(unitCents)}</p>
        {preview.status === "gone" && (
          <p role="alert" className="text-sm font-semibold text-danger">
            Esta prévia expirou. Remova e crie a escultura de novo.
          </p>
        )}
        <div className="mt-2">
          <Button variant="ghost" size="sm" icon={<TrashIcon />} onClick={onRemove}>
            Remover<span className="sr-only"> {options.petName ?? "escultura"} do carrinho</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ───────── Pedido enviado ─────────

function Sent({ order, token, items }: { order: OrderDto; token: string; items: CartItem[] }) {
  const trackUrl = `${window.location.origin}/pedido?c=${order.code}&t=${token}`;
  const message = orderMessage({
    code: order.code,
    items: items.map((i) => i.options),
    estimateCents: order.estimateCents,
    trackUrl,
  });
  return (
    <div className="mx-auto grid max-w-2xl gap-6 text-center">
      <Alert tone="success">Pedido registrado!</Alert>
      <div>
        <p className="text-ink-soft">O código do seu pedido é</p>
        <p className="font-display text-5xl font-extrabold text-teal-deep">{order.code}</p>
      </div>
      <p className="text-lead text-ink-soft">
        Falta só um passo: toque no botão abaixo e envie o pedido pelo WhatsApp. Lá combinamos o pagamento e a
        entrega com você.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button href={whatsappUrl(message)} size="lg">
          Enviar o pedido pelo WhatsApp
        </Button>
        <Button href={`/pedido?c=${order.code}&t=${token}`} variant="secondary" size="lg">
          Ver o pedido
        </Button>
      </div>
      <p className="text-sm text-ink-soft">
        Guarde o código. O pedido também fica em <Link href="/meus-pedidos" className="font-semibold text-teal-deep underline underline-offset-4">Meus pedidos</Link>, na sua conta, em qualquer aparelho.
      </p>
    </div>
  );
}

// ───────── Carrinho ─────────

type Errors = Partial<Record<"name" | "phone" | "consent", string>>;

export function CartView() {
  const cart = useCart();
  const history = useOrderHistory();
  const { status, user } = useAccount();

  // o nome já vem da conta; só vira "do formulário" quando a pessoa digita
  const [typedName, setName] = useState<string>();
  const name = typedName ?? user?.name ?? "";
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<{ message: string; offerFallback: boolean }>();
  const [gone, setGone] = useState<string[]>([]);
  const [sent, setSent] = useState<{ order: OrderDto; token: string; items: CartItem[] }>();
  const formRef = useRef<HTMLFormElement>(null);

  const markGone = (id: string) => setGone((current) => (current.includes(id) ? current : [...current, id]));

  if (sent) return <Sent {...sent} />;

  // as prévias do carrinho são da conta: sem login não dá para ver nem enviar
  if (cart.count > 0 && status === "loading") return <Loading>Carregando o carrinho…</Loading>;
  if (cart.count > 0 && status === "ready" && !user) {
    return (
      <LoginPrompt
        title="Entre para ver o seu carrinho"
        text="As suas prévias ficam guardadas na sua conta. Faça login para ver o carrinho e enviar o pedido."
        className="mx-auto max-w-2xl"
      />
    );
  }

  if (cart.count === 0) {
    return (
      <div className="mx-auto grid max-w-md justify-items-center gap-4 text-center">
        <p className="font-display text-2xl font-extrabold">Seu carrinho está vazio</p>
        <p className="text-ink-soft">Crie a escultura do seu pet e ela aparece aqui.</p>
        <CreateButton />
      </div>
    );
  }

  const totals = estimate(cart.items.map((i) => i.options));

  function validate(): Errors {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "Informe o seu nome.";
    const digits = phone.replace(/\D/g, "");
    if (phone.trim() && (digits.length < 10 || digits.length > 13)) {
      next.phone = "Informe o WhatsApp com DDD, ou deixe em branco.";
    }
    if (!consent) next.consent = "Aceite a política de privacidade para enviar o pedido.";
    return next;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(undefined);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      // leva o foco ao primeiro campo com erro (depois que o React mostrar o erro)
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (gone.length) {
      setFailure({ message: "Remova do carrinho as esculturas com a prévia expirada.", offerFallback: false });
      return;
    }

    setSubmitting(true);
    try {
      const items = cart.items;
      const { order, token } = await api.createOrder({
        previewIds: items.map((i) => i.previewId),
        customer: {
          name: name.trim(),
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        consent: true,
      });
      history.add({ code: order.code, token, createdAt: order.createdAt, itemCount: order.items.length });
      cart.clear();
      setSent({ order, token, items });
    } catch (error) {
      if (error instanceof ApiError && error.code === "login_required") void account.refresh(); // sessão vencida: o carrinho pede o login
      const offline = !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
      setFailure({
        message: error instanceof ApiError ? error.message : "Não foi possível enviar o pedido.",
        offerFallback: offline,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start">
      <ul className="grid gap-4" aria-label="Esculturas no carrinho">
        {cart.items.map((item, index) => (
          <CartItemRow
            key={item.id}
            item={item}
            unitCents={totals.unitCents[index] ?? null}
            onRemove={() => cart.remove(item.id)}
            onGone={markGone}
          />
        ))}
        <li>
          <Button href="/personalizar" variant="ghost">
            + Criar outra escultura
          </Button>
        </li>
      </ul>

      <form
        ref={formRef}
        onSubmit={submit}
        noValidate
        className="grid gap-5 rounded-card border border-line bg-white p-5 shadow-soft sm:p-6 lg:sticky lg:top-24"
      >
        <h2 className="font-display text-2xl font-extrabold">Enviar o pedido</h2>

        <div className="grid gap-1 border-b border-line pb-4">
          {totals.discountCents > 0 && (
            <p className="flex justify-between text-sm text-ink-soft">
              <span>Desconto (2ª peça)</span>
              <span>− {formatCents(totals.discountCents)}</span>
            </p>
          )}
          <p className="flex justify-between text-lg">
            <span>Valor estimado</span>
            <strong>{formatCents(totals.totalCents)}</strong>
          </p>
          <p className="text-sm text-ink-soft">
            O valor final, o pagamento e a entrega são combinados com você no WhatsApp.
          </p>
        </div>

        <TextField
          label="Seu nome"
          name="name"
          autoComplete="name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <TextField
          label="WhatsApp"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          optional
          maxLength={20}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          hint="Com DDD. Ajuda a gente a falar com você."
        />
        <TextField
          label="Cidade"
          name="city"
          autoComplete="address-level2"
          optional
          maxLength={60}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <TextAreaField
          label="Observações"
          name="notes"
          optional
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <CheckboxField
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          error={errors.consent}
          label={
            <>
              Li e aceito a{" "}
              <Link
                href="/politica-de-privacidade"
                target="_blank"
                className="font-semibold text-teal-deep underline underline-offset-4"
              >
                política de privacidade
                <span className="sr-only"> (abre em nova aba)</span>
              </Link>
              .
            </>
          }
        />

        {failure && (
          <div className="grid gap-3">
            <Alert>{failure.message}</Alert>
            {failure.offerFallback && (
              <Button
                href={whatsappUrl(fallbackMessage(cart.items.map((i) => i.options)))}
                variant="secondary"
                size="md"
              >
                Enviar só pelo WhatsApp
              </Button>
            )}
          </div>
        )}

        <Button type="submit" size="lg" disabled={submitting} icon={<ArrowRightIcon className="text-lg" />} iconPosition="end">
          {submitting ? "Enviando…" : "Enviar pedido"}
        </Button>
        {submitting && <Loading>Registrando o pedido…</Loading>}
      </form>
    </div>
  );
}
