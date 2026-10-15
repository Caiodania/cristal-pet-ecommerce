import { Card } from "@/components/ui/Card";
import { CreateButton } from "@/components/ui/CtaButtons";
import { CubeIcon } from "@/components/ui/icons";
import { TodoTag } from "@/components/ui/Placeholder";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { catalog } from "@/content/estatua";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/loja/estimativa";

// A escala dos cubos mostra a diferença entre os tamanhos sem inventar medida.
const cubeScale = ["text-5xl", "text-6xl", "text-7xl"];

/**
 * Tamanhos como cartões de produto (preço e botão), mais os tipos e as cores
 * disponíveis. Medidas, preços e cores: TODO-CLIENTE (content/estatua.ts).
 */
export function Products() {
  return (
    <Section id="tamanhos" tone="sand" labelledBy="tamanhos-titulo">
      <SectionHeader
        eyebrow="Tamanhos e acabamentos"
        titleId="tamanhos-titulo"
        title={
          <>
            Escolha o <Accent>tamanho</Accent> da sua escultura
          </>
        }
        description="Três tamanhos para caber na estante, na mesa ou onde o seu pet mais gosta de ficar."
      />

      <ul className="mt-12 grid gap-5 sm:grid-cols-3">
        {catalog.sizes.map((size, index) => (
          <Card as="li" key={size.id} className="flex flex-col items-center gap-3 text-center">
            {/* altura fixa: os cubos de tamanhos diferentes alinham pela base */}
            <div className="grid h-20 items-end">
              <CubeIcon className={cn("text-teal-deep", cubeScale[index] ?? "text-5xl")} />
            </div>
            <h3 className="font-display text-xl font-medium">{size.label}</h3>
            <dl className="grid gap-1 text-sm text-ink-soft">
              <div className="flex items-center justify-center gap-2">
                <dt>Altura:</dt>
                <dd>
                  {size.cm ? (
                    `${size.cm} cm`
                  ) : (
                    <TodoTag todo="TODO-CLIENTE: altura em cm de cada tamanho" />
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-center gap-2">
                <dt>Preço:</dt>
                <dd>
                  {size.priceCents !== null ? (
                    <span className="text-base font-bold text-ink">{formatCents(size.priceCents)}</span>
                  ) : (
                    <TodoTag todo="TODO-CLIENTE: preço de cada tamanho" />
                  )}
                </dd>
              </div>
            </dl>
            <CreateButton size="md" sizeId={size.id} className="mt-auto" variant="secondary">
              Escolher
            </CreateButton>
          </Card>
        ))}
      </ul>

      <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold">Tipos</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {catalog.poses.map((pose) => (
              <li
                key={pose.id}
                className="rounded-full border border-line bg-white px-4 py-1.5 text-sm font-semibold"
              >
                {pose.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Cores</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {catalog.colors.map((color) => (
              <li
                key={color.id}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-sm font-semibold"
              >
                <span
                  aria-hidden="true"
                  className="size-4 rounded-full border border-field"
                  style={{ backgroundColor: color.swatch }}
                />
                {color.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
