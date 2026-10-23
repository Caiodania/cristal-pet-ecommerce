import { useId } from "react";
import { cn } from "@/lib/cn";
import { sculptureSvg } from "@/lib/loja/ilustracao";

type Props = {
  pose?: "sentado" | "busto" | "na-pose" | string;
  /** Cor do material, #rrggbb. */
  tint?: string;
  /** Nome em relevo na frente da base. */
  name?: string;
  /** Descrição para leitor de tela; sem ela, a ilustração é decorativa. */
  label?: string;
  className?: string;
};

/**
 * Cachorrinho sobre a base octogonal, na cor escolhida e com o nome em relevo.
 * Serve de prévia AO VIVO no configurador (muda a cada escolha) e de reserva
 * quando uma opção ainda não tem foto. O desenho em si (SVG) vem de
 * lib/loja/ilustracao.ts, o mesmo que o servidor usa na imagem do modo
 * demonstração. Não representa o pet do cliente: é ilustrativa.
 */
export function SculptureIllustration({ pose, tint, name, label, className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <span
      className={cn("block w-full [&>svg]:block [&>svg]:h-auto [&>svg]:w-full", className)}
      // SVG gerado por nós; o nome do usuário é escapado em ilustracao.ts
      dangerouslySetInnerHTML={{ __html: sculptureSvg({ pose, tint, name, label, uid }) }}
    />
  );
}
