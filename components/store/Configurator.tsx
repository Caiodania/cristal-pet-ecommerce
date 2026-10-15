"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhatsAppButton } from "@/components/ui/CtaButtons";
import { TextField } from "@/components/ui/Field";
import { TodoTag } from "@/components/ui/Placeholder";
import { Alert, Loading } from "@/components/ui/Status";
import { ArrowRightIcon, CheckIcon, RefreshIcon } from "@/components/ui/icons";
import { catalog } from "@/content/estatua";
import { site } from "@/content/site";
import { ApiError, api, fileUrl } from "@/lib/loja/api";
import { getSessionId, useCart } from "@/lib/loja/carrinho";
import { formatCents } from "@/lib/loja/estimativa";
import type { ItemConfig, PreviewDto } from "@/lib/loja/tipos";
import { useConfig } from "@/lib/loja/useConfig";
import { OptionGroup } from "./OptionGroup";
import { PhotoDropzone, type ChosenPhoto } from "./PhotoDropzone";
import { Stepper, type StepInfo } from "./Stepper";
import { SummaryCard } from "./SummaryCard";
import { Turnstile } from "./Turnstile";

const STEPS: StepInfo[] = [
  { id: "tamanho", label: "Tamanho" },
  { id: "tipo", label: "Tipo" },
  { id: "cor", label: "Cor" },
  { id: "nome", label: "Nome" },
  { id: "foto", label: "Foto" },
  { id: "previa", label: "Prévia" },
];
const LAST = STEPS.length - 1;

type Gen =
  | { phase: "idle" }
  | { phase: "working"; message: string }
  | { phase: "ready"; preview: PreviewDto }
  | {
      phase: "error";
      message: string;
      /** Há como tentar de novo. */
      retry: boolean;
      /** A foto não serve: o caminho é trocar de foto. */
      changePhoto?: boolean;
      /** Cota ou limite do dia: o caminho é o WhatsApp. */
      whatsapp?: boolean;
      /** Prévia que falhou (dá para reiniciar a mesma). */
      previewId?: string;
    };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sameOptions = (a: ItemConfig, b: ItemConfig) =>
  a.sizeId === b.sizeId && a.poseId === b.poseId && a.colorId === b.colorId && (a.petName ?? "") === (b.petName ?? "");

function describeError(error: unknown): Extract<Gen, { phase: "error" }> {
  if (error instanceof ApiError) {
    if (error.code === "quota_exceeded" || error.code === "budget_exceeded") {
      return { phase: "error", message: error.message, retry: false, whatsapp: true };
    }
    return { phase: "error", message: error.message, retry: true };
  }
  return { phase: "error", message: "Algo deu errado. Tente de novo.", retry: true };
}

/**
 * Configurador de 6 etapas (tamanho, tipo, cor, nome, foto, prévia), na ordem da
 * loja de referência. A prévia é gerada no servidor por uma IA de imagem; aqui
 * o navegador envia a foto, acompanha o andamento e adiciona ao carrinho.
 */
export function Configurator() {
  const params = useSearchParams();
  const config = useConfig();
  const cart = useCart();

  const wanted = params.get("tamanho");
  const [step, setStep] = useState(0);
  const [sizeId, setSizeId] = useState<string | undefined>(
    catalog.sizes.some((s) => s.id === wanted) ? (wanted ?? undefined) : undefined,
  );
  const [poseId, setPoseId] = useState<string>();
  const [colorId, setColorId] = useState<string>();
  const [petName, setPetName] = useState("");
  const [photo, setPhoto] = useState<ChosenPhoto | null>(null);
  const [gen, setGen] = useState<Gen>({ phase: "idle" });
  const [remaining, setRemaining] = useState<number>();
  const [added, setAdded] = useState(false);
  const [captcha, setCaptcha] = useState<string>();
  const [captchaReset, setCaptchaReset] = useState(0);

  // id da última prévia que já recebeu a foto (para gerar outra sem reenviar)
  const sourceId = useRef<string | undefined>(undefined);
  // cada geração tem um número; respostas de gerações antigas são ignoradas
  const run = useRef(0);
  useEffect(
    () => () => {
      run.current += 1; // sair da página cancela o acompanhamento
    },
    [],
  );

  // A miniatura da foto (blob:) vive aqui, no pai: o campo de foto sai da tela ao
  // passar para a prévia, mas o resumo e a volta à etapa da foto ainda precisam dela.
  // Só libera a memória quando a foto é trocada ou a página fecha.
  const lastPhotoUrl = useRef<string | undefined>(undefined);
  useEffect(() => {
    const previous = lastPhotoUrl.current;
    lastPhotoUrl.current = photo?.url;
    if (previous && previous !== photo?.url) URL.revokeObjectURL(previous);
  }, [photo?.url]);
  useEffect(
    () => () => {
      if (lastPhotoUrl.current) URL.revokeObjectURL(lastPhotoUrl.current);
    },
    [],
  );

  const options: ItemConfig | undefined =
    sizeId && poseId && colorId ? { sizeId, poseId, colorId, petName: petName.trim() || undefined } : undefined;
  const ready = gen.phase === "ready" ? gen.preview : undefined;
  const stale = ready && options ? !sameOptions(ready.options, options) : false;
  const needsCaptcha = Boolean(config?.turnstileSiteKey);
  const captchaMissing = needsCaptcha && !captcha;

  function chosePhoto(next: ChosenPhoto | null) {
    setPhoto(next);
    sourceId.current = undefined; // foto nova: precisa subir de novo
    run.current += 1;
    setGen({ phase: "idle" });
    setAdded(false);
  }

  async function waitForPreview(id: string, myRun: number) {
    const startedAt = Date.now();
    let failures = 0;
    while (myRun === run.current) {
      await sleep(2000);
      if (myRun !== run.current) return;
      try {
        const preview = await api.getPreview(id);
        failures = 0;
        if (myRun !== run.current) return;
        if (preview.status === "ready") return setGen({ phase: "ready", preview });
        if (preview.status === "failed") {
          return setGen({
            phase: "error",
            message: preview.errorMessage ?? "Não foi possível gerar a prévia.",
            retry: true,
            previewId: id,
          });
        }
        if (preview.status === "rejected") {
          return setGen({
            phase: "error",
            message: preview.errorMessage ?? "Esta foto não serve para a escultura. Escolha outra.",
            retry: false,
            changePhoto: true,
          });
        }
        setGen({
          phase: "working",
          message: Date.now() - startedAt > 20_000 ? "Quase lá, só mais um instante…" : "Gerando a prévia…",
        });
      } catch (error) {
        failures += 1;
        if (failures >= 3) {
          return setGen({ ...describeError(error), previewId: id });
        }
      }
    }
  }

  async function generate() {
    if (!options || !photo) return;
    const myRun = ++run.current;
    setStep(LAST);
    setAdded(false);
    setGen({ phase: "working", message: "Enviando a foto…" });
    try {
      let preview: PreviewDto;
      if (sourceId.current) {
        setGen({ phase: "working", message: "Gerando a prévia…" });
        preview = await api.regeneratePreview(sourceId.current, {
          sessionId: getSessionId(),
          options,
          turnstileToken: captcha,
        });
      } else {
        const created = await api.createPreview({ sessionId: getSessionId(), options, turnstileToken: captcha });
        await api.uploadPhoto(created.id, photo.blob);
        if (myRun !== run.current) return;
        setGen({ phase: "working", message: "Gerando a prévia…" });
        preview = { ...(await api.startPreview(created.id)), remaining: created.remaining };
      }
      if (myRun !== run.current) return;
      sourceId.current = preview.id;
      setRemaining(preview.remaining);
      await waitForPreview(preview.id, myRun);
    } catch (error) {
      if (myRun === run.current) setGen(describeError(error));
    } finally {
      setCaptcha(undefined); // o token vale uma vez só
      setCaptchaReset((n) => n + 1);
    }
  }

  async function restartFailed(previewId: string) {
    const myRun = ++run.current;
    setGen({ phase: "working", message: "Gerando a prévia…" });
    try {
      await api.startPreview(previewId);
      await waitForPreview(previewId, myRun);
    } catch (error) {
      if (myRun === run.current) setGen({ ...describeError(error), previewId });
    }
  }

  function next() {
    if (step < LAST - 1) return setStep(step + 1);
    if (step === LAST - 1) {
      if (ready && !stale) return setStep(LAST); // já tem prévia boa: só mostra
      void generate();
    }
  }

  function addToCart() {
    if (!ready || stale) return;
    cart.add(ready.id, ready.options);
    setAdded(true);
  }

  function startOver() {
    run.current += 1;
    sourceId.current = undefined;
    setStep(0);
    setSizeId(undefined);
    setPoseId(undefined);
    setColorId(undefined);
    setPetName("");
    chosePhoto(null);
    setRemaining(undefined);
  }

  const canContinue =
    (step === 0 && !!sizeId) ||
    (step === 1 && !!poseId) ||
    (step === 2 && !!colorId) ||
    step === 3 ||
    (step === 4 && !!photo && !!options && !captchaMissing);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="grid gap-8">
        <Stepper steps={STEPS} current={step} onGo={setStep} />

        <div className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-8">
          {step === 0 && (
            <OptionGroup
              legend="Escolha o tamanho"
              name="tamanho"
              value={sizeId}
              onChange={setSizeId}
              options={catalog.sizes.map((size) => ({
                id: size.id,
                label: size.label,
                detail: (
                  <>
                    <span className="block">
                      Altura: {size.cm ? `${size.cm} cm` : <TodoTag todo="TODO-CLIENTE: altura em cm" />}
                    </span>
                    <span className="block">
                      Preço:{" "}
                      {size.priceCents !== null ? (
                        <strong className="text-ink">{formatCents(size.priceCents)}</strong>
                      ) : (
                        <TodoTag todo="TODO-CLIENTE: preço" />
                      )}
                    </span>
                  </>
                ),
              }))}
            />
          )}

          {step === 1 && (
            <OptionGroup
              legend="Escolha o tipo da escultura"
              name="tipo"
              value={poseId}
              onChange={setPoseId}
              options={catalog.poses.map((pose) => ({ id: pose.id, label: pose.label }))}
            />
          )}

          {step === 2 && (
            <OptionGroup
              legend="Escolha a cor"
              name="cor"
              value={colorId}
              onChange={setColorId}
              hint="A escultura é impressa em uma cor só."
              options={catalog.colors.map((color) => ({ id: color.id, label: color.label, swatch: color.swatch }))}
            />
          )}

          {step === 3 && (
            <div className="grid gap-4">
              <h2 className="font-display text-2xl font-medium">Qual é o nome do seu pet?</h2>
              <TextField
                label="Nome do pet"
                optional
                maxLength={30}
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                autoComplete="off"
                hint="Usamos o nome para identificar a sua escultura."
              />
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-6">
              <PhotoDropzone photo={photo} onChange={chosePhoto} />
              {config?.turnstileSiteKey && (
                <Turnstile siteKey={config.turnstileSiteKey} onToken={setCaptcha} resetKey={captchaReset} />
              )}
            </div>
          )}

          {step === LAST && (
            <div className="grid gap-5" aria-live="polite">
              <h2 className="font-display text-2xl font-medium">A prévia da sua escultura</h2>

              {gen.phase === "idle" && <p className="text-ink-soft">Envie a foto na etapa anterior para gerar a prévia.</p>}

              {gen.phase === "working" && (
                <div className="grid gap-3 rounded-soft bg-sand p-6">
                  <Loading>{gen.message}</Loading>
                  <p className="text-sm text-ink-soft">Pode levar alguns instantes. Não feche esta página.</p>
                </div>
              )}

              {gen.phase === "error" && (
                <div className="grid gap-4">
                  <Alert>{gen.message}</Alert>
                  <div className="flex flex-wrap gap-3">
                    {gen.retry && (
                      <Button
                        variant="primary"
                        size="md"
                        icon={<RefreshIcon />}
                        onClick={() => (gen.previewId ? void restartFailed(gen.previewId) : void generate())}
                      >
                        Tentar de novo
                      </Button>
                    )}
                    {gen.changePhoto && (
                      <Button variant="primary" size="md" onClick={() => setStep(4)}>
                        Escolher outra foto
                      </Button>
                    )}
                    {gen.whatsapp && (
                      <WhatsAppButton size="md" message={site.whatsapp.messages.escultura}>
                        Falar no WhatsApp
                      </WhatsAppButton>
                    )}
                  </div>
                </div>
              )}

              {ready && (
                <div className="grid gap-4">
                  {ready.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fileUrl(ready.imageUrl)}
                      alt={`Prévia da escultura${ready.options.petName ? ` de ${ready.options.petName}` : ""}`}
                      className="mx-auto max-h-[32rem] w-auto max-w-full rounded-card border border-line bg-sand"
                    />
                  )}
                  {config?.mode === "demo" && (
                    <p className="text-center text-sm text-ink-soft">Imagem de demonstração: não é a escultura final.</p>
                  )}
                  {stale && <Alert tone="info">Você mudou as opções. Gere a prévia de novo para ver como fica.</Alert>}
                </div>
              )}

              {ready && !added && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    onClick={stale ? () => void generate() : addToCart}
                    icon={stale ? <RefreshIcon /> : <CheckIcon />}
                  >
                    {stale ? "Gerar a prévia com as novas opções" : "Gostei! Adicionar ao carrinho"}
                  </Button>
                  {!stale && (
                    <Button
                      variant="secondary"
                      size="lg"
                      icon={<RefreshIcon />}
                      disabled={remaining === 0}
                      onClick={() => void generate()}
                    >
                      Gerar outra
                    </Button>
                  )}
                </div>
              )}
              {ready && !added && remaining !== undefined && (
                <p className="text-sm text-ink-soft">
                  {remaining > 0
                    ? `Você ainda pode gerar ${remaining} ${remaining === 1 ? "prévia" : "prévias"} hoje.`
                    : "Você usou todas as prévias de hoje. Amanhã tem mais, ou fale com a gente no WhatsApp."}
                </p>
              )}

              {added && (
                <div className="grid gap-4">
                  <Alert tone="success">Escultura adicionada ao carrinho!</Alert>
                  <div className="flex flex-wrap gap-3">
                    <Button href="/carrinho" size="lg" icon={<ArrowRightIcon />} iconPosition="end">
                      Ir para o carrinho
                    </Button>
                    <Button variant="secondary" size="lg" onClick={startOver}>
                      Criar outra escultura
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* navegação entre as etapas */}
          {step < LAST && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep(step - 1)} className={step === 0 ? "invisible" : ""}>
                Voltar
              </Button>
              <Button
                size="lg"
                onClick={next}
                disabled={!canContinue}
                icon={<ArrowRightIcon className="text-lg" />}
                iconPosition="end"
              >
                {step === LAST - 1 ? (ready && !stale ? "Ver a prévia" : "Gerar a prévia") : "Continuar"}
              </Button>
            </div>
          )}
          {step === LAST && !added && gen.phase !== "working" && (
            <div className="mt-8">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Mudar as opções
              </Button>
            </div>
          )}
        </div>
      </div>

      <SummaryCard
        chosen={{ sizeId, poseId, colorId, petName: petName.trim() || undefined }}
        photoUrl={photo?.url}
        previewUrl={ready?.imageUrl ? fileUrl(ready.imageUrl) : undefined}
      />
    </div>
  );
}
