import { cn } from "@/lib/cn";
import type { QuotaDto } from "@/lib/loja/tipos";

/**
 * Quantas prévias grátis a conta ainda tem: bolinhas cheias (já usadas) e vazias
 * (disponíveis) até 6; acima disso, uma barra. O texto diz o número, então a
 * figura é só enfeite (a cor sozinha não carrega a informação).
 */
export function QuotaMeter({ quota, className, label = true }: { quota: QuotaDto; className?: string; label?: boolean }) {
  const { limit, used, remaining } = quota;
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <p className="text-sm font-bold">
          {remaining === 0
            ? "Você usou todas as prévias grátis"
            : `${remaining} ${remaining === 1 ? "prévia grátis disponível" : "prévias grátis disponíveis"}`}
          <span className="font-normal text-ink-soft">
            {" "}
            ({used} de {limit} usadas)
          </span>
        </p>
      )}
      {limit <= 6 ? (
        <div aria-hidden="true" className="flex gap-1.5">
          {Array.from({ length: limit }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 flex-1 rounded-full transition-colors duration-500",
                i < used ? "bg-magenta" : "border-2 border-magenta/40 bg-white",
              )}
            />
          ))}
        </div>
      ) : (
        <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-magenta-mist">
          <div className="h-full rounded-full bg-magenta transition-[width] duration-500" style={{ width: `${(used / limit) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
