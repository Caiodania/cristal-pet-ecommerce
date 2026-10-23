"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { WhatsAppButton } from "@/components/ui/CtaButtons";
import { TextField } from "@/components/ui/Field";
import { TiltedOutline } from "@/components/ui/decor";
import { SculptureIllustration } from "@/components/ui/illustrations";
import { TodoTag } from "@/components/ui/Placeholder";
import { Alert } from "@/components/ui/Status";
import { ArrowRightIcon, CheckIcon, RefreshIcon } from "@/components/ui/icons";
import { catalog, previewsPerAccount } from "@/content/estatua";
import { optionImage } from "@/content/opcoes";
import { site } from "@/content/site";
import { ApiError, api, fileUrl } from "@/lib/loja/api";
import { LoginPrompt } from "@/components/conta/LoginPrompt";
import { QuotaMeter } from "@/components/conta/QuotaMeter";
import { useCart } from "@/lib/loja/carrinho";
import { account, useAccount } from "@/lib/loja/conta";
import { openAuth } from "@/lib/loja/dialogo-conta";
import { formatCents } from "@/lib/loja/estimativa";
import type { ItemConfig, PreviewDto } from "@/lib/loja/tipos";
import { useConfig } from "@/lib/loja/useConfig";
import { GeneratingCard } from "./GeneratingCard";
import { OptionGroup } from "./OptionGroup";
import { OptionVisual, SizeVisual } from "./OptionVisuals";
import { PhotoDropzone, type ChosenPhoto } from "./PhotoDropzone";
import { Stepper, type StepInfo } from "./Stepper";
import { SummaryCard } from "./SummaryCard";

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

// As escolhas ficam guardadas na aba enquanto a pessoa entra ou confirma o e-mail
// (a foto não: ela escolhe de novo). Só vale quando o endereço não traz escolhas.
const SAVE_KEY = "cp:config:v1";
type Saved = { sizeId?: string; poseId?: string; colorId?: string; petName?: string };
function readSaved(): Saved {
  try {
    return JSON.parse(window.sessionStorage.getItem(SAVE_KEY) ?? "{}") as Saved;
  } catch {
    return {};
  }
}
const writeSaved = (value: Saved | null) => {
  try {
    if (value) window.sessionStorage.setItem(SAVE_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(SAVE_KEY);
  } catch {
    /* sem armazenamento */
  }
};
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
  const { user, quota } = useAccount();

  // a vitrine pode mandar escolhas prontas (?tamanho=&tipo=&cor=); só vale o que existe no catálogo
  const pick = <T extends { id: string }>(list: T[], key: string) => {
    const value = params.get(key);
    return list.some((item) => item.id === value) ? (value ?? undefined) : undefined;
  };
  const fromUrl = ["tamanho", "tipo", "cor"].some((key) => params.has(key));
  const [saved] = useState<Saved>(() => (fromUrl || typeof window === "undefined" ? {} : readSaved()));
  const valid = <T extends { id: string }>(list: T[], id: string | undefined) =>
    list.some((item) => item.id === id) ? id : undefined;
  const wantedSize = pick(catalog.sizes, "tamanho") ?? valid(catalog.sizes, saved.sizeId);
  const wantedPose = pick(catalog.poses, "tipo") ?? valid(catalog.poses, saved.poseId);
  const wantedColor = pick(catalog.colors, "cor") ?? valid(catalog.colors, saved.colorId);
  // com as três escolhas prontas, a pessoa já começa no nome
  const [step, setStep] = useState(wantedSize && wantedPose && wantedColor ? 3 : 0);
  // ao mudar de etapa, leva o topo do configurador à vista (o conteúdo muda de altura)
  const top = useRef<HTMLDivElement>(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    top.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [step]);
  const [sizeId, setSizeId] = useState<string | undefined>(wantedSize);
  const [poseId, setPoseId] = useState<string | undefined>(wantedPose);
  const [colorId, setColorId] = useState<string | undefined>(wantedColor);
  const [petName, setPetName] = useState(saved.petName ?? "");
  const [photo, setPhoto] = useState<ChosenPhoto | null>(null);
  const [gen, setGen] = useState<Gen>({ phase: "idle" });
  const [added, setAdded] = useState(false);

  // guarda as escolhas na aba (para não perdê-las num desvio de login)
  useEffect(() => {
    writeSaved({ sizeId, poseId, colorId, petName });
  }, [sizeId, poseId, colorId, petName]);

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

  const chosenColor = catalog.colors.find((c) => c.id === colorId);
  const tint = chosenColor?.swatch ?? "#f3f0e8";
  const nameExample = optionImage("nome", "exemplo", "");

  const options: ItemConfig | undefined =
    sizeId && poseId && colorId ? { sizeId, poseId, colorId, petName: petName.trim() || undefined } : undefined;
  const ready = gen.phase === "ready" ? gen.preview : undefined;
  const stale = ready && options ? !sameOptions(ready.options, options) : false;
  // a conta já usou todas as prévias: não adianta tentar (o servidor também recusa)
  const outOfPreviews = Boolean(user) && quota?.remaining === 0;

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

  /**
   * Gerar exige conta. Sem login, abre o diálogo ("Faça login ou crie a sua conta
   * para poder gerar a sua prévia") SEM sair da página; ao entrar, continua sozinho.
   */
  function requestGenerate() {
    if (!options || !photo) return;
    if (!user) {
      openAuth({
        tab: "signup",
        reason: "Faça login ou crie a sua conta para poder gerar a sua prévia.",
        onSuccess: () => void generate(),
      });
      return;
    }
    void generate();
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
        preview = await api.regeneratePreview(sourceId.current, { options });
      } else {
        const created = await api.createPreview({ options });
        await api.uploadPhoto(created.id, photo.blob);
        if (myRun !== run.current) return;
        setGen({ phase: "working", message: "Gerando a prévia…" });
        preview = { ...(await api.startPreview(created.id)), remaining: created.remaining };
      }
      if (myRun !== run.current) return;
      sourceId.current = preview.id;
      void account.refresh(); // a cota da conta mudou
      await waitForPreview(preview.id, myRun);
    } catch (error) {
      if (myRun !== run.current) return;
      if (error instanceof ApiError && error.code === "login_required") {
        // a sessão venceu no meio do caminho: pede o login e continua
        setGen({ phase: "idle" });
        setStep(LAST - 1);
        void account.refresh();
        openAuth({
          tab: "login",
          reason: "A sua sessão terminou. Entre de novo para gerar a prévia.",
          onSuccess: () => void generate(),
        });
        return;
      }
      if (error instanceof ApiError && error.code === "quota_exceeded") void account.refresh();
      setGen(describeError(error));
    } finally {
      void account.refresh();
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
      requestGenerate();
    }
  }

  function addToCart() {
    if (!ready || stale) return;
    cart.add(ready.id, ready.options);
    writeSaved(null);
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
    writeSaved(null);
  }

  const canContinue =
    (step === 0 && !!sizeId) ||
    (step === 1 && !!poseId) ||
    (step === 2 && !!colorId) ||
    step === 3 ||
    (step === 4 && !!photo && !!options && !outOfPreviews);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="grid gap-8">
        <div ref={top} className="scroll-mt-24">
          <Stepper steps={STEPS} current={step} onGo={setStep} />
        </div>

        <div className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-8">
          {step === 0 && (
            <OptionGroup
              legend="Qual o tamanho da escultura?"
              name="tamanho"
              value={sizeId}
              onChange={setSizeId}
              hint="Pense em onde ela vai ficar. As três têm o mesmo capricho nos detalhes."
              ratio="landscape"
              note="Ilustração de escala: o tamanho real em centímetros é o que aparece em cada cartão."
              options={catalog.sizes.map((size) => ({
                id: size.id,
                label: size.label,
                badge: undefined,
                visual: <SizeVisual scale={size.scale} tint="#e4d9c6" />,
                detail: (
                  <>
                    <span className="block">{size.blurb}</span>
                    <span className="mt-2 block">
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
              legend="Como você quer a pose?"
              name="tipo"
              value={poseId}
              onChange={setPoseId}
              hint="Escolha o formato da escultura."
              note="Imagens ilustrativas: a sua escultura é feita a partir da foto do seu pet."
              options={catalog.poses.map((pose) => ({
                id: pose.id,
                label: pose.label,
                detail: pose.description,
                visual: <OptionVisual kind="tipo" id={pose.id} pose={pose.id} tint="#e4d9c6" />,
              }))}
            />
          )}

          {step === 2 && (
            <OptionGroup
              legend="Em que cor?"
              name="cor"
              value={colorId}
              onChange={setColorId}
              layout="rows"
              hint="A escultura é impressa em uma cor só."
              note="Imagens ilustrativas: o tom final pode variar um pouco com o material e a luz."
              options={catalog.colors.map((color) => ({
                id: color.id,
                label: color.label,
                swatch: color.swatch,
                badge: color.badge,
                detail: color.description,
                visual: <OptionVisual kind="cor" id={color.id} pose={poseId ?? "sentado"} tint={color.swatch} sizes="112px" />,
              }))}
            />
          )}

          {step === 3 && (
            <div className="grid gap-6">
              <div>
                <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Qual é o nome do seu pet?</h2>
                <p className="mt-1 text-ink-soft">Ele fica gravado em alto-relevo na base, na mesma cor da escultura.</p>
              </div>
              <div className="grid items-center gap-6 md:grid-cols-2">
                <div>
                  <div className="rounded-card bg-gradient-to-b from-teal-mist to-sand px-6 pb-2 pt-4">
                    <SculptureIllustration
                      pose={poseId ?? "sentado"}
                      tint={tint}
                      name={petName.trim() || undefined}
                      label="Ilustração da escultura com o nome em relevo na base"
                    />
                  </div>
                  <p className="mt-2 text-center text-xs text-ink-soft">Ilustração: o nome aparece aqui enquanto você digita.</p>
                </div>
                <div className="grid gap-4">
                  <TextField
                    label="Nome do pet"
                    optional
                    maxLength={30}
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    autoComplete="off"
                    hint="Sem nome, a base fica lisa."
                  />
                  {nameExample && (
                    <figure className="relative overflow-hidden rounded-card shadow-soft">
                      <Image
                        src={nameExample.src}
                        alt=""
                        width={nameExample.width}
                        height={nameExample.height}
                        sizes="(max-width: 768px) 90vw, 320px"
                        className="aspect-[16/10] w-full object-cover object-bottom"
                      />
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-4 pb-3 pt-8 text-sm font-semibold text-white">
                        Exemplo: letras em alto-relevo, na mesma cor do corpo.
                      </figcaption>
                    </figure>
                  )}
                  <p className="text-sm text-ink-soft">
                    Tem mais de um pet? Termine esta escultura e crie outra em seguida: as duas seguem juntas no carrinho.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-6">
              {/* a conta só é cobrada na hora de gerar: avisa já, sem bloquear a escolha da foto */}
              {!user && (
                <LoginPrompt
                  compact
                  title="Crie a sua conta grátis para ver a prévia"
                  text={`Cada conta gera até ${config?.previewsPerAccount ?? previewsPerAccount} prévias de escultura sem pagar nada. Você pode escolher a foto agora e entrar na hora de gerar.`}
                />
              )}
              {user && quota && <QuotaMeter quota={quota} className="rounded-soft bg-magenta-mist p-4" />}
              {outOfPreviews && (
                <div className="grid gap-3">
                  <Alert>Você já usou todas as prévias da sua conta. Fale com a gente pelo WhatsApp que a gente ajuda você.</Alert>
                  <div>
                    <WhatsAppButton size="md" message={site.whatsapp.messages.escultura}>
                      Falar no WhatsApp
                    </WhatsAppButton>
                  </div>
                </div>
              )}
              <PhotoDropzone photo={photo} onChange={chosePhoto} petName={petName.trim() || undefined} />
            </div>
          )}

          {step === LAST && (
            <div className="grid gap-5" aria-live="polite">
              <h2 className="font-display text-2xl font-extrabold">A prévia da sua escultura</h2>

              {gen.phase === "idle" && <p className="text-ink-soft">Envie a foto na etapa anterior para gerar a prévia.</p>}

              {gen.phase === "working" && (
                <GeneratingCard message={gen.message} pose={poseId} tint={tint} name={petName.trim() || undefined} />
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
                        onClick={() => (gen.previewId ? void restartFailed(gen.previewId) : requestGenerate())}
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
                    <div className="relative mx-auto w-fit max-w-full rotate-1 rounded-card">
                      <TiltedOutline rotate={-3} x={-8} y={10} />
                      <span className="absolute -top-3 left-4 z-10 rounded-full bg-magenta px-4 py-1 text-sm font-bold text-white shadow-soft">
                        Prévia pronta!
                      </span>
                      {/* link assinado do servidor: não passa pelo otimizador de imagens */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileUrl(ready.imageUrl)}
                        alt={`Prévia da escultura${ready.options.petName ? ` de ${ready.options.petName}` : ""}`}
                        className="relative max-h-[32rem] w-auto max-w-full rounded-card border-4 border-white bg-sand shadow-lift"
                      />
                    </div>
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
                    onClick={stale ? requestGenerate : addToCart}
                    icon={stale ? <RefreshIcon /> : <CheckIcon />}
                  >
                    {stale ? "Gerar a prévia com as novas opções" : "Gostei! Adicionar ao carrinho"}
                  </Button>
                  {!stale && (
                    <Button
                      variant="secondary"
                      size="lg"
                      icon={<RefreshIcon />}
                      disabled={outOfPreviews}
                      onClick={requestGenerate}
                    >
                      Gerar outra
                    </Button>
                  )}
                </div>
              )}
              {ready && !added && quota && (
                <p className="text-sm text-ink-soft">
                  {quota.remaining > 0
                    ? `Você ainda pode gerar ${quota.remaining} ${quota.remaining === 1 ? "prévia" : "prévias"} nesta conta.`
                    : "Você usou todas as prévias da sua conta. Fale com a gente no WhatsApp que a gente ajuda você."}
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
