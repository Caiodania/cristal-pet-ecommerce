import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa6";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Carousel } from "@/components/ui/Carousel";
import { InstagramFacade } from "@/components/ui/InstagramFacade";
import { feedbackVideos } from "@/content/instagram";
import { site } from "@/content/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/** Feedback dos clientes: 4 vídeos do Instagram em fachada + convite às redes. */
export function FeedbackSection({ tone = "cream" }: { tone?: "cream" | "sand" }) {
  return (
    <Section id="feedback" tone={tone} labelledBy="feedback-titulo">
      <SectionHeader
        eyebrow="Feedback dos clientes"
        titleId="feedback-titulo"
        title={
          <>
            Quem já recebeu a Cristal Pet <Accent>em casa</Accent>
          </>
        }
        description="Vídeos enviados pelos tutores. O vídeo só carrega do Instagram quando você toca em assistir."
      />

      <Carousel
        label="Vídeos de clientes"
        className="mt-12"
        slideClassName="w-[78%] sm:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-3rem)/4)]"
      >
        {feedbackVideos.map((video) => (
          <InstagramFacade
            key={video.id}
            permalink={video.permalink}
            description={video.description}
          />
        ))}
      </Carousel>

      <Card className="mx-auto mt-14 max-w-3xl text-center">
        <h3 className="font-display text-2xl font-medium">Siga a Cristal Pet</h3>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">
          Por lá você acompanha novos atendimentos, os bastidores da unidade
          móvel e dicas para o seu pet.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            href={site.social.instagram}
            size="md"
            icon={<FaInstagram aria-hidden="true" className="text-lg" />}
          >
            {site.social.instagramHandle}
          </Button>
          <Button
            href={site.social.facebook}
            variant="secondary"
            size="md"
            icon={<FaFacebookF aria-hidden="true" className="text-base" />}
          >
            Facebook
          </Button>
        </div>
      </Card>

      <p className="mt-8 text-center text-ink-soft">
        Já foi atendido pela Cristal Pet?{" "}
        <a
          href={buildWhatsAppUrl(site.whatsapp.messages.feedback)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-teal-deep underline underline-offset-4"
        >
          <FaWhatsapp aria-hidden="true" className="text-lg" />
          Envie o vídeo do seu pet pelo WhatsApp
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </p>
    </Section>
  );
}
