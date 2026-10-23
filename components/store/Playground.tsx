"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TiltedOutline } from "@/components/ui/decor";
import { SculptureIllustration } from "@/components/ui/illustrations";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import { TodoTag } from "@/components/ui/Placeholder";
import { catalog } from "@/content/estatua";
import { optionImage } from "@/content/opcoes";
import { cn } from "@/lib/cn";
import { estimate, formatCents } from "@/lib/loja/estimativa";

const legend = "mb-3 font-display text-lg font-extrabold";

/**
 * "Monte a sua": uma prévia ao vivo na vitrine. Troque tamanho, tipo e cor e a
 * escultura muda na hora (as fotos de cor são ilustrativas); o botão leva ao
 * configurador já com as escolhas. É um gostinho: nome e foto vêm depois.
 */
export function Playground() {
  const [sizeId, setSizeId] = useState("media");
  const [poseId, setPoseId] = useState("sentado");
  const [colorId, setColorId] = useState("branco");

  const color = catalog.colors.find((c) => c.id === colorId) ?? catalog.colors[0];
  const size = catalog.sizes.find((s) => s.id === sizeId) ?? catalog.sizes[0];
  const pose = catalog.poses.find((p) => p.id === poseId) ?? catalog.poses[0];
  const total = estimate([{ sizeId, poseId, colorId }]).totalCents;
  const bust = poseId === "busto";
  const hasPhoto = Boolean(optionImage("cor", colorId, ""));

  const href = `/personalizar?tamanho=${sizeId}&tipo=${poseId}&cor=${colorId}`;

  return (
    <div className="mt-14 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
      {/* prévia */}
      <div className="relative mx-auto w-full max-w-md">
        <TiltedOutline rotate={-3} x={-12} y={12} className="rounded-[2rem]" />
        <figure className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border-4 border-white bg-sand shadow-lift">
          {catalog.colors.map((c) => {
            const photo = optionImage("cor", c.id, "");
            if (!photo) return null;
            return (
              <Image
                key={c.id}
                src={photo.src}
                alt=""
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 640px) 90vw, 440px"
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 size-full object-cover transition-[opacity,scale] duration-700 ease-out",
                  c.id === colorId ? "opacity-100" : "opacity-0",
                  // busto: aproxima do rosto (a foto de cada cor é da peça sentada)
                  bust ? "origin-[50%_22%] scale-[1.55]" : "scale-100",
                )}
              />
            );
          })}
          {!hasPhoto && (
            <span className="absolute inset-0 grid place-items-center bg-gradient-to-b from-teal-mist to-sand p-8">
              <SculptureIllustration pose={poseId} tint={color.swatch} />
            </span>
          )}

          <figcaption className="absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold shadow-soft backdrop-blur">
              <span
                aria-hidden="true"
                className="size-4 rounded-full border border-field"
                style={{ backgroundColor: color.swatch }}
              />
              {size.label} · {pose.label} · {color.label}
            </span>
            <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white">
              Imagem ilustrativa
            </span>
          </figcaption>
        </figure>
        {poseId === "na-pose" && (
          <p className="mt-4 text-center text-sm font-semibold text-ink-soft">
            Aqui a pose segue a da foto que você enviar.
          </p>
        )}
      </div>

      {/* escolhas */}
      <div className="grid gap-8">
        <fieldset>
          <legend className={legend}>1. Tamanho</legend>
          <div className="grid grid-cols-3 gap-3">
            {catalog.sizes.map((s) => (
              <label key={s.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="vitrine-tamanho"
                  value={s.id}
                  checked={sizeId === s.id}
                  onChange={() => setSizeId(s.id)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "relative grid h-full justify-items-center gap-1 rounded-2xl border-2 border-line bg-white p-3 text-center shadow-soft",
                    "transition-[border-color,box-shadow,translate] duration-200 hover:border-magenta/50 motion-safe:hover:-translate-y-0.5",
                    "peer-checked:border-magenta peer-checked:shadow-lift",
                    "peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-magenta",
                    "[&_.ok]:scale-50 [&_.ok]:opacity-0 peer-checked:[&_.ok]:scale-100 peer-checked:[&_.ok]:opacity-100",
                  )}
                >
                  <span className="flex h-20 w-full items-end justify-center" aria-hidden="true">
                    <span className="block transition-[width] duration-300" style={{ width: `${Math.round(s.scale * 72)}%` }}>
                      <SculptureIllustration pose="sentado" tint={color.swatch} />
                    </span>
                  </span>
                  <span className="font-display text-base font-extrabold">{s.label}</span>
                  <span className="text-xs text-ink-soft">
                    {s.cm ? `${s.cm} cm` : <TodoTag todo="TODO-CLIENTE: altura em cm" />}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ok absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-magenta text-white transition duration-200"
                  >
                    <CheckIcon className="text-xs" />
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legend}>2. Tipo</legend>
          <div className="flex flex-wrap gap-3">
            {catalog.poses.map((p) => {
              const thumb = optionImage("tipo", p.id, "");
              return (
                <label key={p.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="vitrine-tipo"
                    value={p.id}
                    checked={poseId === p.id}
                    onChange={() => setPoseId(p.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-full border-2 border-line bg-white py-1.5 pl-1.5 pr-5 font-bold shadow-soft",
                      "transition-[border-color,box-shadow,background-color] duration-200 hover:border-magenta/50",
                      "peer-checked:border-magenta peer-checked:bg-magenta peer-checked:text-white peer-checked:shadow-lift",
                      "peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-magenta",
                    )}
                  >
                    <span aria-hidden="true" className="relative block size-9 overflow-hidden rounded-full bg-sand">
                      {thumb ? (
                        <Image
                          src={thumb.src}
                          alt=""
                          width={72}
                          height={90}
                          sizes="36px"
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="grid size-full place-items-center bg-teal-mist">
                          <span className="block w-7">
                            <SculptureIllustration pose={p.id} tint="#d6c9b3" />
                          </span>
                        </span>
                      )}
                    </span>
                    {p.label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legend}>3. Cor</legend>
          <div className="flex flex-wrap gap-4">
            {catalog.colors.map((c) => (
              <label key={c.id} className="group cursor-pointer text-center">
                <input
                  type="radio"
                  name="vitrine-cor"
                  value={c.id}
                  checked={colorId === c.id}
                  onChange={() => setColorId(c.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: c.swatch }}
                  className={cn(
                    "grid size-14 place-items-center rounded-full border-4 border-white shadow-soft ring-2 ring-line",
                    "transition-[box-shadow,scale] duration-200 group-hover:scale-110",
                    "peer-checked:ring-4 peer-checked:ring-magenta",
                    "peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-4 peer-focus-visible:outline-magenta",
                    "[&_.ok]:opacity-0 peer-checked:[&_.ok]:opacity-100",
                  )}
                >
                  <CheckIcon
                    className={cn(
                      "ok text-xl transition-opacity",
                      // o "ok" precisa aparecer em qualquer cor: claro no escuro e escuro no claro
                      c.id === "preto" || c.id === "marrom" || c.id === "cinza" ? "text-white" : "text-ink",
                    )}
                  />
                </span>
                <span className="mt-2 block text-sm font-bold">{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="rounded-3xl bg-white p-5 shadow-soft sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-sm font-semibold text-ink-soft">Sua escolha</p>
            <p className="font-display text-xl font-extrabold">
              {size.label} · {pose.label} · {color.label}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {total !== null ? (
                <>
                  A partir de <strong className="text-ink">{formatCents(total)}</strong>
                </>
              ) : (
                <>
                  Valor combinado no WhatsApp <TodoTag todo="TODO-CLIENTE: preço de cada tamanho" />
                </>
              )}
            </p>
          </div>
          <Button href={href} size="lg" className="btn-sheen mt-4 w-full sm:mt-0 sm:w-auto" icon={<ArrowRightIcon className="text-lg" />} iconPosition="end">
            Criar com essas escolhas
          </Button>
        </div>
        <p className="-mt-4 text-sm text-ink-soft">O nome do pet e a foto você escolhe no próximo passo.</p>
      </div>
    </div>
  );
}
