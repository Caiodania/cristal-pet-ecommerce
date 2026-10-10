import Image from "next/image";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Carousel } from "@/components/ui/Carousel";
import { vanItems } from "@/content/gallery";

/**
 * "A unidade móvel": carrossel com as fotos reais do interior da van.
 * TODO-FOTO: faltam fotos do lado de fora da van.
 */
export function MobileUnit({ tone = "cream" }: { tone?: "cream" | "sand" }) {
  return (
    <Section id="unidade-movel" tone={tone} labelledBy="unidade-titulo">
      <SectionHeader
        eyebrow="A unidade móvel"
        titleId="unidade-titulo"
        title={
          <>
            Uma pet shop <Accent>sobre rodas</Accent>
          </>
        }
        description="Van totalmente equipada, com água aquecida, bancada de tosa, secador profissional e caixa de secagem. Ela vai até a porta da sua casa."
      />

      <Carousel
        label="Fotos da unidade móvel"
        className="mt-12"
        slideClassName="w-[72%] sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"
      >
        {vanItems.map((photo) => (
          <Card key={photo.thumb.src} padded={false}>
            <Image
              src={photo.thumb.src}
              alt={photo.alt}
              width={photo.thumb.width}
              height={photo.thumb.height}
              sizes="(max-width: 640px) 72vw, (max-width: 1024px) 40vw, 30vw"
              className="aspect-[3/4] w-full object-cover"
            />
          </Card>
        ))}
      </Carousel>
    </Section>
  );
}
