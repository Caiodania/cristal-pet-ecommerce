import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_LABEL_CUSTOMER,
  type OrderEventDto,
  type OrderStatus,
} from "@/lib/loja/tipos";
import { cn } from "@/lib/cn";

// Pares de cor já medidos (texto sobre fundo): novo 4,95 · confirmado ≥ 5 ·
// produção 16,5 · pronto 7,8 · entregue 5,8 · cancelado 6,4.
const tone: Record<OrderStatus, string> = {
  new: "bg-magenta text-white",
  confirmed: "bg-teal-mist text-teal-deep ring-1 ring-inset ring-teal-deep/30",
  in_production: "bg-ink text-cream",
  ready: "bg-teal text-ink",
  delivered: "bg-sand text-ink-soft ring-1 ring-inset ring-ink-soft/30",
  canceled: "bg-white text-ink-soft ring-1 ring-inset ring-ink-soft/40",
};

/** Etiqueta do status. `audience="customer"` usa as palavras do cliente. */
export function StatusBadge({
  status,
  audience = "owner",
  className,
}: {
  status: OrderStatus;
  audience?: "owner" | "customer";
  className?: string;
}) {
  const label = (audience === "customer" ? ORDER_STATUS_LABEL_CUSTOMER : ORDER_STATUS_LABEL)[status];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
        tone[status],
        className,
      )}
    >
      {label}
    </span>
  );
}

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** Linha do tempo do pedido. `audience` escolhe o vocabulário dos status. */
export function Timeline({
  events,
  audience = "owner",
}: {
  events: OrderEventDto[];
  audience?: "owner" | "customer";
}) {
  const labels = audience === "customer" ? ORDER_STATUS_LABEL_CUSTOMER : ORDER_STATUS_LABEL;
  return (
    <ol className="grid gap-4">
      {events.map((event, index) => {
        const internal = event.note?.startsWith("[interno]");
        return (
          <li key={`${event.at}-${index}`} className="relative pl-7">
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-0 top-1.5 size-3 rounded-full",
                index === events.length - 1 ? "bg-teal-deep" : "bg-field",
              )}
            />
            {index < events.length - 1 && (
              <span aria-hidden="true" className="absolute bottom-[-1rem] left-[0.3125rem] top-5 w-0.5 bg-line" />
            )}
            <p className="font-semibold">{internal ? "Anotação interna" : labels[event.status]}</p>
            <p className="text-sm text-ink-soft">
              <time dateTime={event.at}>{formatDateTime(event.at)}</time>
            </p>
            {event.note && <p className="mt-1 text-ink-soft">{internal ? event.note.replace("[interno] ", "") : event.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/** Anel de carregamento com texto: anunciado como "ocupado" pelos leitores de tela. */
export function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-3 text-ink-soft">
      <progress className="spinner" aria-label="Carregando" />
      <span>{children}</span>
    </div>
  );
}

/** Aviso de erro ou informação, anunciado quando aparece. */
export function Alert({
  tone: kind = "error",
  children,
  className,
}: {
  tone?: "error" | "info" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    error: "border-danger bg-white text-danger",
    info: "border-teal-deep bg-teal-mist text-ink",
    success: "border-teal-deep bg-teal-mist text-ink",
  } as const;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn("rounded-soft border-2 px-4 py-3 font-semibold", styles[kind], className)}
    >
      {children}
    </div>
  );
}
