import Image from "next/image";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { CheckIcon } from "@/components/ui/icons";
import { sobre } from "@/content/banho-e-tosa";
import { images } from "@/content/images";
import { site } from "@/content/site";

/** Nossa história (âncora #sobre): origem, missão, visão e valores. */
export function AboutSection({ tone = "sand" }: { tone?: "cream" | "sand" }) {
  const years = new Date().getFullYear() - site.foundedYear;

  return (
    <Section id="sobre" tone={tone} labelledBy="sobre-titulo">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Image
          src={images.sobre.corgi.src}
          alt={images.sobre.corgi.alt}
          width={images.sobre.corgi.width}
          height={images.sobre.corgi.height}
          sizes="(max-width: 1024px) 90vw, 520px"
          className="mx-auto h-auto w-full max-w-md"
        />
        <div>
          <SectionHeader
            align="start"
            eyebrow="Nossa história"
            titleId="sobre-titulo"
            title={
              <>
                {years} anos de <Accent>paixão</Accent> e cuidado pet
              </>
            }
          />
          <div className="mt-6 grid gap-4 text-lead text-ink-soft">
            {sobre.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-14 grid gap-5 lg:grid-cols-3">
        {sobre.pillars.map((pillar) => (
          <Card as="li" key={pillar.title} className="text-center">
            <Image
              src={pillar.icon.src}
              alt={pillar.icon.alt}
              width={pillar.icon.width}
              height={pillar.icon.height}
              className="mx-auto size-20"
            />
            <h3 className="mt-4 font-display text-xl font-medium">{pillar.title}</h3>
            <p className="mt-3 text-ink-soft">{pillar.body}</p>
          </Card>
        ))}
        <Card as="li" className="text-center">
          <Image
            src={images.sobre.valores.src}
            alt={images.sobre.valores.alt}
            width={images.sobre.valores.width}
            height={images.sobre.valores.height}
            className="mx-auto size-20"
          />
          <h3 className="mt-4 font-display text-xl font-medium">Valores</h3>
          <ul className="mt-3 grid gap-2 text-left text-ink-soft">
            {sobre.values.map((value) => (
              <li key={value} className="flex items-start gap-2">
                <CheckIcon className="mt-1 shrink-0 text-teal-deep" />
                {value}
              </li>
            ))}
          </ul>
        </Card>
      </ul>
    </Section>
  );
}
