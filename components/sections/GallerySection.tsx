import { Accent, Section, SectionHeader } from "@/components/ui/Section";
import { LightboxGallery } from "@/components/ui/LightboxGallery";
import { petItems } from "@/content/gallery";

/** Galeria única de pets depois do atendimento, com lightbox. */
export function GallerySection({ tone = "sand" }: { tone?: "cream" | "sand" }) {
  return (
    <Section id="galeria" tone={tone} labelledBy="galeria-titulo">
      <SectionHeader
        eyebrow="Galeria"
        titleId="galeria-titulo"
        title={
          <>
            Pets que já passaram por aqui, <Accent>felizes da vida</Accent>
          </>
        }
        description="Toque em uma foto para ampliar."
      />
      <div className="mt-12">
        <LightboxGallery items={petItems} label="Galeria de pets atendidos" />
      </div>
    </Section>
  );
}
