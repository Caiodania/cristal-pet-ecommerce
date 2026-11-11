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
import { portraitCatalog, portraitPhotoTips } from "@/content/quadros";
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
import { PortraitVisual } from "./PortraitVisual";
import { PortraitSummary } from "./PortraitSummary";

const STEPS: StepInfo[] = [
  { id: "tamanho", label: "Tamanho" },
  { id: "tipo", label: "Tipo" },
  { id: "cor", label: "Cor" },
  { id: "nome", label: "Nome" },
  { id: "foto", label: "Foto" },
  { id: "previa", label: "Prévia" },
];
const LAST = STEPS.length - 1;
const PORTRAIT_STEPS = STEPS.map((step, index) => index === 1 ? { id: "estilo", label: "Estilo" } : index === 2 ? { id: "moldura", label: "Moldura" } : step);

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
type Saved = { sizeId?: string; poseId?: string; colorId?: string; styleId?: string; frameId?: string; petName?: string };
function readSaved(key: string): Saved {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(key) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => typeof entry === "string")) as Saved;
  } catch {
    return {};
  }
}
const writeSaved = (key: string, value: Saved | null) => {
  try {
    if (value) window.sessionStorage.setItem(key, JSON.stringify(value));
    else window.sessionStorage.removeItem(key);
  } catch {
    /* sem armazenamento */
  }
};
const sameOptions = (a: ItemConfig, b: ItemConfig) => {
  if (a.sizeId !== b.sizeId || (a.petName ?? "") !== (b.petName ?? "")) return false;
  if (a.productType === "quadro" || b.productType === "quadro") {
    return a.productType === "quadro" && b.productType === "quadro" && a.styleId === b.styleId && a.frameId === b.frameId;
  }
  return a.poseId === b.poseId && a.colorId === b.colorId;
};

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
export function Configurator({ productType = "escultura" }: { productType?: "escultura" | "quadro" }) {
  const isPortrait = productType === "quadro";
  const saveKey = isPortrait ? "cp:quadro-config:v1" : "cp:config:v1";
  const contactMessage = isPortrait ? "Olá! Quero saber mais sobre um quadro personalizado do meu pet." : site.whatsapp.messages.escultura;
  const params = useSearchParams();
  const config = useConfig();
  const cart = useCart();
  const { user, quota } = useAccount();

  // a vitrine pode mandar escolhas prontas (?tamanho=&tipo=&cor=); só vale o que existe no catálogo
  const pick = <T extends { id: string }>(list: T[], key: string) => {
    const value = params.get(key);
    return list.some((item) => item.id === value) ? (value ?? undefined) : undefined;
  };
  const fromUrl = ["tamanho", "tipo", "cor", "estilo", "moldura"].some((key) => params.has(key));
  const [saved] = useState<Saved>(() => (fromUrl || typeof window === "undefined" ? {} : readSaved(saveKey)));
  const valid = <T extends { id: string }>(list: T[], id: string | undefined) =>
    list.some((item) => item.id === id) ? id : undefined;
  const sizes = isPortrait ? portraitCatalog.sizes : catalog.sizes;
  const wantedSize = pick<{ id: string }>(sizes, "tamanho") ?? valid<{ id: string }>(sizes, saved.sizeId);
  const wantedPose = pick(catalog.poses, "tipo") ?? valid(catalog.poses, saved.poseId);
  const wantedColor = pick(catalog.colors, "cor") ?? valid(catalog.colors, saved.colorId);
  const wantedStyle = pick(portraitCatalog.styles, "estilo") ?? valid(portraitCatalog.styles, saved.styleId);
  const wantedFrame = pick(portraitCatalog.frames, "moldura") ?? valid(portraitCatalog.frames, saved.frameId);
  // com as três escolhas prontas, a pessoa já começa no nome
  const [step, setStep] = useState(wantedSize && (isPortrait ? wantedStyle && wantedFrame : wantedPose && wantedColor) ? 3 : 0);
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
  const [styleId, setStyleId] = useState<string | undefined>(wantedStyle);
  const [frameId, setFrameId] = useState<string | undefined>(wantedFrame);
  const [petName, setPetName] = useState(saved.petName ?? "");
  const [photo, setPhoto] = useState<ChosenPhoto | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [gen, setGen] = useState<Gen>({ phase: "idle" });
  const generating = useRef(false);
  const [added, setAdded] = useState(false);

  // guarda as escolhas na aba (para não perdê-las num desvio de login)
  useEffect(() => {
    writeSaved(saveKey, { sizeId, poseId, colorId, styleId, frameId, petName });
  }, [saveKey, sizeId, poseId, colorId, styleId, frameId, petName]);

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
    isPortrait
      ? sizeId && styleId && frameId ? { productType: "quadro", sizeId, styleId, frameId, petName: petName.trim() || undefined } : undefined
      : sizeId && poseId && colorId ? { sizeId, poseId, colorId, petName: petName.trim() || undefined } : undefined;
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
      if (Date.now() - startedAt > 300_000) {
        return setGen({ phase: "error", message: "A geração está demorando. Consulte o andamento novamente em instantes.", retry: true, previewId: id });
      }
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
        if (preview.status === "expired") return setGen({ phase: "error", message: "Esta prévia expirou. Gere uma nova para continuar.", retry: true });
        if (preview.status === "rejected") {
          return setGen({
            phase: "error",
            message: preview.errorMessage ?? "Esta foto não serve para a prévia. Escolha outra.",
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
    if (!options || !photo || photoBusy || generating.current) return;
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
    if (!options || !photo || photoBusy || generating.current) return;
    generating.current = true;
    const myRun = ++run.current;
    let pendingId: string | undefined;
    setStep(LAST);
    setAdded(false);
    setGen({ phase: "working", message: "Enviando a foto…" });
    try {
      let preview: PreviewDto;
      if (sourceId.current) {
        setGen({ phase: "working", message: "Gerando a prévia…" });
        const created = await api.regeneratePreview(sourceId.current, { options, deferStart: true });
        pendingId = created.id;
        if (myRun !== run.current) return;
        preview = { ...(await api.startPreview(created.id)), remaining: created.remaining };
      } else {
        const created = await api.createPreview({ options });
        await api.uploadPhoto(created.id, photo.blob);
        pendingId = created.id;
        if (myRun !== run.current) return;
        setGen({ phase: "working", message: "Gerando a prévia…" });
        preview = { ...(await api.startPreview(created.id)), remaining: created.remaining };
      }
      if (myRun !== run.current) return;
      sourceId.current = preview.id;
      void account.refresh(); // a cota da conta mudou
      if (preview.status === "ready") setGen({ phase: "ready", preview });
      else await waitForPreview(preview.id, myRun);
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
      if (pendingId && error instanceof ApiError && ["timeout", "network"].includes(error.code)) {
        sourceId.current = pendingId;
        await waitForPreview(pendingId, myRun);
      } else setGen({ ...describeError(error), previewId: pendingId });
    } finally {
      generating.current = false;
      void account.refresh();
    }
  }

  async function restartFailed(previewId: string) {
    if (generating.current) return;
    generating.current = true;
    const myRun = ++run.current;
    setGen({ phase: "working", message: "Gerando a prévia…" });
    try {
      let preview = await api.getPreview(previewId);
      if (myRun !== run.current) return;
      if (preview.status === "queued" || preview.status === "failed") preview = await api.startPreview(previewId);
      if (myRun !== run.current) return;
      if (preview.status === "ready") setGen({ phase: "ready", preview });
      else await waitForPreview(previewId, myRun);
    } catch (error) {
      if (myRun === run.current) setGen({ ...describeError(error), previewId });
    } finally {
      generating.current = false;
      void account.refresh();
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
    writeSaved(saveKey, null);
    setAdded(true);
  }

  function startOver() {
    run.current += 1;
    sourceId.current = undefined;
    setStep(0);
    setSizeId(undefined);
    setPoseId(undefined);
    setColorId(undefined);
    setStyleId(undefined);
    setFrameId(undefined);
    setPetName("");
    chosePhoto(null);
    writeSaved(saveKey, null);
  }

  const canContinue =
    (step === 0 && !!sizeId) ||
    (step === 1 && !!(isPortrait ? styleId : poseId)) ||
    (step === 2 && !!(isPortrait ? frameId : colorId)) ||
    step === 3 ||
    (step === 4 && !!photo && !photoBusy && !!options && (!outOfPreviews || Boolean(ready && !stale)));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="grid gap-8">
        <div ref={top} className="scroll-mt-24">
          <Stepper steps={isPortrait ? PORTRAIT_STEPS : STEPS} current={step} onGo={(nextStep) => { if (gen.phase !== "working") setStep(nextStep); }} />
        </div>

        <div className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-8">
          {isPortrait && step === 0 && <OptionGroup legend="Qual o tamanho do seu quadro?" name="tamanho" value={sizeId} onChange={setSizeId} hint="Escolha o espaço que o seu pet vai ocupar na parede." note="Medidas da arte. Acabamento e disponibilidade confirmados pelo WhatsApp. Ilustrações fora de escala." options={portraitCatalog.sizes.map((size) => ({ id: size.id, label: size.label, visual: <PortraitVisual sizeId={size.id} />, detail: <>{size.blurb}<strong className="mt-2 block">{formatCents(size.priceCents)}</strong></> }))} />}
          {isPortrait && step === 1 && <OptionGroup legend="Qual estilo combina com o seu pet?" name="estilo" value={styleId} onChange={setStyleId} hint="A arte será criada a partir da foto do seu pet." note="Ilustrações de referência. A prévia personalizada aparece na última etapa." options={portraitCatalog.styles.map((style) => ({ id: style.id, label: style.label, detail: style.description, visual: <PortraitVisual styleId={style.id} sizeId={sizeId} /> }))} />}
          {isPortrait && step === 2 && <OptionGroup legend="Como você quer emoldurar?" name="moldura" value={frameId} onChange={setFrameId} hint="O toque final para combinar com a sua casa." note="Simulação de cor. Materiais e acabamento são confirmados antes da produção." options={portraitCatalog.frames.map((frame) => ({ id: frame.id, label: frame.label, swatch: frame.swatch, detail: frame.description, visual: <PortraitVisual frameId={frame.id} styleId={styleId} sizeId={sizeId} /> }))} />}
          {!isPortrait && step === 0 && (
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

          {!isPortrait && step === 1 && (
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

          {!isPortrait && step === 2 && (
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
                <p className="mt-1 text-ink-soft">{isPortrait ? "Se quiser, incluímos o nome na composição do retrato." : "Ele fica gravado em alto-relevo na base, na mesma cor da escultura."}</p>
              </div>
              <div className="grid items-center gap-6 md:grid-cols-2">
                <div>
                  <div className="rounded-card bg-gradient-to-b from-silver-mist to-pearl px-6 pb-2 pt-4">
                    {isPortrait ? <PortraitVisual styleId={styleId} frameId={frameId} sizeId={sizeId} name={petName.trim() || undefined} /> : <SculptureIllustration
                      pose={poseId ?? "sentado"}
                      tint={tint}
                      name={petName.trim() || undefined}
                      label="Ilustração da escultura com o nome em relevo na base"
                    />}
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
                    hint={isPortrait ? "Deixe vazio para uma arte sem texto." : "Sem nome, a base fica lisa."}
                  />
                  {!isPortrait && nameExample && (
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
                    Tem mais de um pet? Termine esta criação e faça outra em seguida: elas podem seguir juntas no carrinho.
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
                  text={`Cada conta gera até ${config?.previewsPerAccount ?? previewsPerAccount} prévias grátis, compartilhadas entre quadros e esculturas. Escolha a foto agora e entre na hora de gerar.`}
                />
              )}
              {user && quota && <QuotaMeter quota={quota} className="rounded-soft bg-silver-mist p-4" />}
              {outOfPreviews && (
                <div className="grid gap-3">
                  <Alert>Você já usou todas as prévias da sua conta. Fale com a gente pelo WhatsApp que a gente ajuda você.</Alert>
                  <div>
                    <WhatsAppButton size="md" message={contactMessage}>
                      Falar no WhatsApp
                    </WhatsAppButton>
                  </div>
                </div>
              )}
              <PhotoDropzone photo={photo} onChange={chosePhoto} onBusyChange={setPhotoBusy} petName={petName.trim() || undefined} productType={productType} tips={isPortrait ? portraitPhotoTips : undefined} />
            </div>
          )}

          {step === LAST && (
            <div className="grid gap-5" aria-live="polite">
              <h2 className="font-display text-2xl font-extrabold">{isPortrait ? "A prévia do seu quadro" : "A prévia da sua escultura"}</h2>

              {gen.phase === "idle" && <p className="text-ink-soft">Envie a foto na etapa anterior para gerar a prévia.</p>}

              {gen.phase === "working" && (
                <GeneratingCard message={gen.message} pose={poseId} tint={tint} name={petName.trim() || undefined} portrait={isPortrait ? { styleId, frameId, sizeId } : undefined} />
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
                      <WhatsAppButton size="md" message={contactMessage}>
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
                      <span className="absolute -top-3 left-4 z-10 rounded-full bg-navy px-4 py-1 text-sm font-bold text-white shadow-soft">
                        Prévia pronta!
                      </span>
                      {/* link assinado do servidor: não passa pelo otimizador de imagens */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileUrl(ready.imageUrl)}
                        alt={`Prévia ${isPortrait ? "do quadro" : "da escultura"}${ready.options.petName ? ` de ${ready.options.petName}` : ""}`}
                        className="relative max-h-[32rem] w-auto max-w-full rounded-card border-4 border-white bg-pearl shadow-lift"
                      />
                    </div>
                  )}
                  {config?.imageProvider.mode === "mock" && (
                    <p className="text-center text-sm text-ink-soft">Imagem de demonstração: não é uma arte gerada a partir da sua foto.</p>
                  )}
                  {isPortrait && <p className="text-center text-sm text-ink-soft">Confira o rosto, as cores e o nome. A prévia orienta a arte; impressão e acabamento serão confirmados com você antes da produção.</p>}
                  {stale && <Alert tone="info">Você mudou as opções. Gere a prévia de novo para ver como fica.</Alert>}
                </div>
              )}

              {ready && !added && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    onClick={stale ? requestGenerate : addToCart}
                    disabled={Boolean(stale && outOfPreviews)}
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
                  <Alert tone="success">{isPortrait ? "Quadro adicionado ao carrinho!" : "Escultura adicionada ao carrinho!"}</Alert>
                  <div className="flex flex-wrap gap-3">
                    <Button href="/carrinho" size="lg" icon={<ArrowRightIcon />} iconPosition="end">
                      Ir para o carrinho
                    </Button>
                    <Button variant="secondary" size="lg" onClick={startOver}>
                      {isPortrait ? "Criar outro quadro" : "Criar outra escultura"}
                    </Button>
                    <Button href={isPortrait ? "/personalizar" : "/quadros/personalizar"} variant="ghost">{isPortrait ? "Criar também uma escultura" : "Criar também um quadro"}</Button>
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

      {isPortrait ? <PortraitSummary chosen={{ productType: "quadro", sizeId, styleId, frameId, petName: petName.trim() || undefined }} photoUrl={photo?.url} previewUrl={ready?.imageUrl && !stale ? fileUrl(ready.imageUrl) : undefined} /> : <SummaryCard
        chosen={{ sizeId, poseId, colorId, petName: petName.trim() || undefined }}
        photoUrl={photo?.url}
        previewUrl={ready?.imageUrl ? fileUrl(ready.imageUrl) : undefined}
      />}
    </div>
  );
}
