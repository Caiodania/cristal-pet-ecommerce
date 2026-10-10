import { Accent, Section } from "@/components/ui/Section";
import { Carousel } from "@/components/ui/Carousel";
import { WhatsAppButton } from "@/components/ui/CtaButtons";
import { CheckIcon } from "@/components/ui/icons";
import { InstagramFacade } from "@/components/ui/InstagramFacade";
import { filhotes } from "@/content/banho-e-tosa";
import { filhotesVideos } from "@/content/instagram";
import { site } from "@/content/site";

/** Faixa escura "Especialistas em filhotes", com dois vídeos em fachada. */
export function PuppiesBand() {
  return (
    <Section id="filhotes" tone="ink" labelledBy="filhotes-titulo">
      <div className="grid items-center gap-12 lg:grid-cols-5 lg:gap-14">
        <div className="lg:col-span-2">
          <p className="mb-4 flex items-center gap-3 text-eyebrow font-bold uppercase text-teal">
            <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
            Especialidade Cristal Pet
          </p>
          <h2 id="filhotes-titulo" className="text-title font-medium">
            Especialistas em <Accent>filhotes</Accent> e na adaptação deles ao
            banho e tosa
          </h2>
          <p className="mt-5 text-lead text-cream/80">{filhotes.intro}</p>

          <ul className="mt-6 grid gap-3">
            {filhotes.highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-cream/90">
                <CheckIcon className="mt-1 shrink-0 text-xl text-teal" />
                {item}
              </li>
            ))}
          </ul>

          <WhatsAppButton
            variant="accent"
            message={site.whatsapp.messages.filhote}
            className="mt-8"
          >
            Agendar o primeiro banho
          </WhatsAppButton>
        </div>

        <Carousel
          label="Vídeos de filhotes"
          className="lg:col-span-3"
          slideClassName="w-[78%] sm:w-[calc((100%-1rem)/2)]"
        >
          {filhotesVideos.map((video) => (
            <InstagramFacade
              key={video.id}
              permalink={video.permalink}
              description={video.description}
            />
          ))}
        </Carousel>
      </div>
    </Section>
  );
}
