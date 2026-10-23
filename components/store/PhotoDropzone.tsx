"use client";

import { useId, useRef, useState } from "react";
import { Alert, Loading } from "@/components/ui/Status";
import { CameraIcon, CheckIcon, UploadIcon } from "@/components/ui/icons";
import { photoTips } from "@/content/estatua";
import { cn } from "@/lib/cn";
import { PhotoError, preparePhoto } from "@/lib/loja/imagem";

export type ChosenPhoto = { blob: Blob; url: string; name: string };

type PhotoDropzoneProps = {
  photo: ChosenPhoto | null;
  onChange: (photo: ChosenPhoto | null) => void;
  /** Nome do pet, para personalizar o título. */
  petName?: string;
};

/**
 * Escolha da foto: botão (abre galeria ou câmera) ou arrastar e soltar. A foto é
 * reduzida e recodificada aqui mesmo, no navegador, antes de qualquer envio.
 */
export function PhotoDropzone({ photo, onChange, petName }: PhotoDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    setBusy(true);
    try {
      const prepared = await preparePhoto(file);
      onChange({ blob: prepared.blob, url: URL.createObjectURL(prepared.blob), name: file.name });
    } catch (e) {
      setError(e instanceof PhotoError ? e.message : "Não foi possível abrir esta foto. Tente outra.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ""; // permite escolher a mesma foto de novo
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
          {petName ? `Envie uma foto de ${petName}` : "Envie a foto do seu pet"}
        </h2>
        <p className="mt-1 text-ink-soft">A prévia fica pronta em instantes e você só pede se gostar.</p>
      </div>

      <div className="rounded-card border border-teal/50 bg-teal-mist p-4 sm:p-5">
        <p className="font-display font-extrabold">Dicas para uma escultura mais fiel</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {photoTips.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-sm">
              <CheckIcon className="mt-0.5 shrink-0 text-base text-teal-deep" />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "grid place-items-center gap-4 rounded-card border-2 border-dashed p-6 text-center transition-colors sm:p-8",
          "has-[input:focus-visible]:outline-[3px] has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-magenta",
          dragging ? "border-magenta bg-magenta/5" : "border-magenta/50 bg-white",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />

        {photo ? (
          <>
            {/* miniatura local (blob:), não passa pelo otimizador de imagens */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt="A foto que você escolheu"
              className="max-h-80 w-auto max-w-full -rotate-1 rounded-soft border-4 border-white object-contain shadow-lift"
            />
            <p className="text-sm text-ink-soft">{photo.name}</p>
            <label
              htmlFor={inputId}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-ink px-5 text-sm font-semibold hover:bg-ink hover:text-cream"
            >
              <UploadIcon /> Trocar foto
            </label>
          </>
        ) : (
          <>
            <span className="grid size-20 place-items-center rounded-full bg-magenta/10 text-magenta">
              <UploadIcon className="text-4xl" />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold">Toque para enviar a foto</p>
              <p className="mt-1 text-sm text-ink-soft">ou arraste e solte aqui. JPG, PNG ou WebP.</p>
            </div>
            <label
              htmlFor={inputId}
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-magenta px-7 font-semibold text-white shadow-soft hover:brightness-110 hover:shadow-lift"
            >
              <CameraIcon /> Escolher foto
            </label>
          </>
        )}
      </div>

      {busy && <Loading>Preparando a foto…</Loading>}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
