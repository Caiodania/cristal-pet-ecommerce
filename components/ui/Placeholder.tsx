import { cn } from "@/lib/cn";
import { CameraIcon, CubeIcon } from "./icons";

type PlaceholderProps = {
  /** O que vai aparecer aqui, em palavras do visitante ("Foto da escultura"). */
  label: string;
  /**
   * Pendência registrada no HTML (`data-todo`). Para achar tudo o que falta
   * antes do lançamento: procurar por `data-todo` no site gerado.
   */
  todo: string;
  kind?: "escultura" | "foto";
  ratio?: "square" | "portrait" | "landscape";
  className?: string;
};

const ratios = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  landscape: "aspect-[4/3]",
} as const;

/** Selo "A definir" para um dado do cliente que ainda não chegou. */
export function TodoTag({
  todo,
  children = "A definir",
}: {
  todo: string;
  children?: string;
}) {
  return (
    <span
      data-todo={todo}
      className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-ink-soft ring-1 ring-inset ring-ink-soft/30"
    >
      {children}
    </span>
  );
}

/**
 * Espaço reservado para uma foto que ainda não existe. Tem a proporção final,
 * então trocar pela foto real não muda o layout. O texto sobre fundo areia tem
 * 5,8:1 de contraste.
 */
export function Placeholder({
  label,
  todo,
  kind = "escultura",
  ratio = "portrait",
  className,
}: PlaceholderProps) {
  const Icon = kind === "escultura" ? CubeIcon : CameraIcon;
  return (
    <div
      role="img"
      aria-label={`${label} (em breve)`}
      data-todo={todo}
      className={cn(
        "relative grid w-full place-items-center overflow-hidden rounded-card",
        "border border-dashed border-ink-soft/40 bg-sand text-ink-soft",
        ratios[ratio],
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <Icon className="text-4xl" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span
        aria-hidden="true"
        className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-cream"
      >
        Em breve
      </span>
    </div>
  );
}
