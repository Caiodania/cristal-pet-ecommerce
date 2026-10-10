import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { franquia } from "@/content/banho-e-tosa";

/**
 * Vídeos da franquia, arquivos próprios. `preload="none"`: o navegador só
 * baixa quando a pessoa aperta o play (os arquivos têm 13 e 19 MB).
 * TODO-CLIENTE: legendas para os vídeos, se tiverem fala.
 */
export function FranchiseVideos({ tone = "sand" }: { tone?: "cream" | "sand" }) {
  return (
    <Section id="videos" tone={tone} labelledBy="videos-titulo">
      <SectionHeader
        eyebrow="Veja na prática"
        titleId="videos-titulo"
        title={
          <>
            Como é <Accent>operar</Accent> uma unidade
          </>
        }
        description="O vídeo só carrega quando você aperta o play."
      />
      <ul className="mt-12 grid gap-8 md:grid-cols-2">
        {franquia.videos.map((video) => (
          <li key={video.id}>
            <figure className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
              <video
                controls
                preload="none"
                poster={video.poster.src}
                width={video.poster.width}
                height={video.poster.height}
                aria-label={`${video.title}: ${video.description}`}
                className="aspect-video w-full bg-ink"
              >
                <source src={video.src} type="video/mp4" />
                Seu navegador não reproduz este vídeo.
              </video>
              <figcaption className="p-5">
                <p className="font-display text-xl font-medium">{video.title}</p>
                <p className="mt-1 text-ink-soft">{video.description}</p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  );
}
