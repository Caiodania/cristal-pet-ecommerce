import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CubeIcon } from "@/components/ui/icons";
import { Placeholder, TodoTag } from "@/components/ui/Placeholder";
import { colors, sizes } from "@/content/estatua";
import { cn } from "@/lib/cn";

// A escala dos cubos mostra a diferença entre os tamanhos sem inventar medida.
const cubeScale = ["text-5xl", "text-6xl", "text-7xl"];

type SizesSectionProps = {
  id?: string;
  tone?: "cream" | "sand";
  /** Na página de esculturas, inclui o comparativo com a mão. */
  withComparison?: boolean;
  /** Na home, leva à página com os detalhes. */
  moreHref?: string;
};

/** Tamanhos e acabamentos. Medidas, preços e cores: TODO-CLIENTE. */
export function SizesSection({
  id = "tamanhos",
  tone = "cream",
  withComparison = false,
  moreHref,
}: SizesSectionProps) {
  return (
    <Section id={id} tone={tone} labelledBy={`${id}-titulo`}>
      <SectionHeader
        eyebrow="Tamanhos e acabamentos"
        titleId={`${id}-titulo`}
        title={
          <>
            Escolha o <Accent>tamanho</Accent> da sua escultura
          </>
        }
        description="Três tamanhos para caber na estante, na mesa ou onde o seu pet mais gosta de ficar."
      />

      <ul className="mt-12 grid gap-5 sm:grid-cols-3">
        {sizes.map((size, index) => (
          <Card
            as="li"
            key={size.id}
            className="flex flex-col items-center gap-3 text-center"
          >
            {/* altura fixa: os cubos de tamanhos diferentes alinham pela base */}
            <div className="grid h-20 items-end">
              <CubeIcon
                className={cn("text-teal-deep", cubeScale[index] ?? "text-5xl")}
              />
            </div>
            <h3 className="font-display text-xl font-medium">{size.label}</h3>
            <dl className="grid gap-1 text-sm text-ink-soft">
              <div className="flex items-center justify-center gap-2">
                <dt>Altura:</dt>
                <dd>
                  {size.cm ? `${size.cm} cm` : <TodoTag todo="TODO-CLIENTE: altura em cm de cada tamanho" />}
                </dd>
              </div>
              <div className="flex items-center justify-center gap-2">
                <dt>Preço:</dt>
                <dd>
                  {size.priceCents !== null ? (
                    new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(size.priceCents / 100)
                  ) : (
                    <TodoTag todo="TODO-CLIENTE: preço de cada tamanho" />
                  )}
                </dd>
              </div>
            </dl>
          </Card>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-ink-soft">
        <span className="font-semibold text-ink">Cores e acabamentos:</span>
        {colors.length > 0 ? (
          colors.map((color) => (
            <span key={color.id} className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-5 rounded-full border border-line"
                style={{ backgroundColor: color.swatch }}
              />
              {color.label}
            </span>
          ))
        ) : (
          <TodoTag todo="TODO-CLIENTE: cores e acabamentos do material" />
        )}
      </div>

      {withComparison && (
        <div className="mx-auto mt-12 max-w-2xl">
          <Placeholder
            kind="foto"
            label="Foto comparando os tamanhos com uma mão"
            todo="TODO-FOTO: comparativo dos 3 tamanhos com uma mão"
            ratio="landscape"
          />
        </div>
      )}

      {moreHref && (
        <div className="mt-10 text-center">
          <Button href={moreHref} variant="primary">
            Ver tamanhos e detalhes
          </Button>
        </div>
      )}
    </Section>
  );
}
