import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { images } from "@/content/images";

/**
 * A página "não encontrada" do site. É também o que o painel do dono mostra para
 * quem não é o dono: igual a qualquer endereço que não existe, para que nada
 * revele que o painel existe.
 */
export function NaoEncontrada() {
  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center bg-cream px-4 py-16 text-center">
      <div className="grid max-w-md justify-items-center gap-5">
        <Image src={images.logo.src} alt="" width={96} height={96} className="size-24" />
        <p aria-hidden="true" className="font-display text-7xl font-extrabold text-magenta">
          404
        </p>
        <h1 className="font-display text-3xl font-extrabold">Página não encontrada</h1>
        <p className="text-ink-soft">O endereço pode ter mudado ou não existe. Que tal voltar para a loja?</p>
        <Button href="/" size="lg">
          Voltar para a loja
        </Button>
      </div>
    </main>
  );
}
