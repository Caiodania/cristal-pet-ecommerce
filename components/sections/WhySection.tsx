import Image from "next/image";
import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { CertificatesGallery } from "@/components/ui/CertificatesGallery";
import { certificados, diferenciais, numeros } from "@/content/banho-e-tosa";

/** "Por que a Cristal Pet": diferenciais, prêmios e números (já com o valor final no HTML). */
export function WhySection() {
  return (
    <Section id="diferenciais" tone="cream" labelledBy="diferenciais-titulo">
      <SectionHeader
        eyebrow="Por que a Cristal Pet"
        titleId="diferenciais-titulo"
        title={
          <>
            Cuidado <Accent>sem estresse</Accent>, do começo ao fim
          </>
        }
        description="Um método pensado para o bem-estar do seu pet, com a comodidade de receber tudo em casa."
      />

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {diferenciais.map((item) => (
          <Card as="li" key={item.title} className="reveal flex flex-col items-center text-center">
            <Image
              src={item.icon.src}
              alt={item.icon.alt}
              width={item.icon.width}
              height={item.icon.height}
              className="size-24"
            />
            <h3 className="mt-4 font-display text-xl font-medium">{item.title}</h3>
            <p className="mt-3 text-ink-soft">{item.description}</p>
          </Card>
        ))}
      </ul>

      <div className="mt-14 grid items-center gap-8 rounded-card border border-line bg-teal-mist p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h3 className="font-display text-2xl font-medium">
            Qualidade no atendimento reconhecida
          </h3>
          <p className="mt-3 text-ink-soft">
            Certificados IPOPE Pesquisas de Qualidade no Atendimento: categoria
            Pet Shop em 2024 e categoria Pet Móvel em 2025.
          </p>
        </div>
        <CertificatesGallery certificates={certificados} />
      </div>

      <ul className="mt-14 grid gap-5 sm:grid-cols-3">
        {numeros.map((item) => (
          <Card as="li" key={item.id} className="reveal text-center">
            <Image
              src={item.icon.src}
              alt={item.icon.alt}
              width={item.icon.width}
              height={item.icon.height}
              className="mx-auto size-14"
            />
            <p className="mt-3 font-display text-5xl font-medium text-teal-deep">
              {item.value}
            </p>
            <p className="mt-1 font-semibold text-ink-soft">{item.label}</p>
          </Card>
        ))}
      </ul>
    </Section>
  );
}
