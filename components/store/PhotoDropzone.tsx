"use client";

import { useId, useRef, useState } from "react";
import { Alert, Loading } from "@/components/ui/Status";
import { CameraIcon, UploadIcon } from "@/components/ui/icons";
import { photoTips } from "@/content/estatua";
import { cn } from "@/lib/cn";
import { PhotoError, preparePhoto } from "@/lib/loja/imagem";

export type ChosenPhoto = { blob: Blob; url: string; name: string };

type PhotoDropzoneProps = {
  photo: ChosenPhoto | null;
  onChange: (photo: ChosenPhoto | null) => void;
};

/**
 * Escolha da foto: botão (abre galeria ou câmera) ou arrastar e soltar. A foto é
 * reduzida e recodificada aqui mesmo, no navegador, antes de qualquer envio.
 */
export function PhotoDropzone({ photo, onChange }: PhotoDropzoneProps) {
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
    <div className="grid gap-4">
      <h2 className="font-display text-2xl font-medium">Envie a foto do seu pet</h2>
      <ul className="grid gap-2 text-ink-soft sm:grid-cols-2">
        {photoTips.map((tip) => (
          <li key={tip} className="flex items-start gap-2">
            <CameraIcon className="mt-1 shrink-0 text-teal-deep" />
            {tip}
          </li>
        ))}
      </ul>

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
          "grid place-items-center gap-4 rounded-card border-2 border-dashed p-6 text-center transition-colors",
          "has-[input:focus-visible]:outline-[3px] has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-teal-deep",
          dragging ? "border-teal-deep bg-teal-mist" : "border-field bg-white",
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
              className="max-h-72 w-auto max-w-full rounded-soft object-contain shadow-soft"
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
            <UploadIcon className="text-5xl text-teal-deep" />
            <label
              htmlFor={inputId}
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-ink px-7 font-semibold text-cream hover:bg-ink/85"
            >
              Escolher foto
            </label>
            <p className="text-sm text-ink-soft">ou arraste e solte aqui. JPG, PNG ou WebP.</p>
          </>
        )}
      </div>

      {busy && <Loading>Preparando a foto…</Loading>}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
