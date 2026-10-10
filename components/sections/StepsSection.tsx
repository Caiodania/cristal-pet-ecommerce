import Image from "next/image";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import type { Img } from "@/content/images";
import type { ReactNode } from "react";

export type Step = {
  number: string;
  title: string;
  description: string;
  image?: Img;
};

type StepsSectionProps = {
  id?: string;
  tone?: "cream" | "sand";
  eyebrow: string;
  title: ReactNode;
  description?: string;
  steps: Step[];
};

/** "Como funciona": passos numerados em cards, com imagem quando houver. */
export function StepsSection({
  id = "como-funciona",
  tone = "sand",
  eyebrow,
  title,
  description,
  steps,
}: StepsSectionProps) {
  const columns = steps.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";

  return (
    <Section id={id} tone={tone} labelledBy={`${id}-titulo`}>
      <SectionHeader
        eyebrow={eyebrow}
        titleId={`${id}-titulo`}
        title={title}
        description={description}
      />
      <ol className={`mt-12 grid gap-6 sm:grid-cols-2 ${columns}`}>
        {steps.map((step) => (
          <Card as="li" key={step.number} padded={false} className="reveal flex flex-col">
            {step.image && (
              <Image
                src={step.image.src}
                alt={step.image.alt}
                width={step.image.width}
                height={step.image.height}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="aspect-square w-full object-cover"
              />
            )}
            <div className="p-6">
              <p className="text-eyebrow font-bold uppercase text-teal-deep">
                Passo {step.number}
              </p>
              <h3 className="mt-2 font-display text-xl font-medium">{step.title}</h3>
              <p className="mt-3 text-ink-soft">{step.description}</p>
            </div>
          </Card>
        ))}
      </ol>
    </Section>
  );
}
