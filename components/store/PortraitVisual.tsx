import { portraitCatalog } from "@/content/quadros";
import { cn } from "@/lib/cn";

/** Simulação de composição. A arte personalizada só aparece após a geração. */
export function PortraitVisual({ styleId = "realista", frameId = "natural", sizeId = "20x30", name, photoUrl, imageAlt = "Composição ilustrativa com a foto do pet", className }: {
  styleId?: string; frameId?: string; sizeId?: string; name?: string; photoUrl?: string; imageAlt?: string; className?: string;
}) {
  const frame = portraitCatalog.frames.find((item) => item.id === frameId);
  const size = portraitCatalog.sizes.find((item) => item.id === sizeId);
  const royal = styleId === "real";
  return (
    <div className={cn("flex aspect-[4/5] h-full w-full min-h-0 items-center justify-center bg-gradient-to-br from-silver-mist to-pearl p-5", className)}>
      <div className="relative h-full max-h-96 w-auto max-w-full border-[9px] bg-white p-3 shadow-lift" style={{ borderColor: frame?.swatch ?? "#bc956c", aspectRatio: `${size?.widthCm ?? 20}/${size?.heightCm ?? 30}` }}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={imageAlt} className="h-full w-full object-contain" />
        ) : (
          <svg viewBox="0 0 200 280" role="img" aria-label="Ilustração de um pet emoldurado" className="h-full w-full">
            <rect width="200" height="280" fill={royal ? "#1e3445" : styleId === "aquarela" ? "#edf2f0" : "#f4eee4"} />
            {styleId === "aquarela" && <g opacity=".45"><ellipse cx="65" cy="160" rx="60" ry="83" fill="#bacfd4" /><ellipse cx="140" cy="109" rx="48" ry="68" fill="#ded2b8" /></g>}
            <path d="M43 244Q35 163 100 164Q165 163 157 244Z" fill={royal ? "#774d49" : "#d4b18a"} />
            <path d="M57 84Q18 61 24 131Q29 166 61 153L73 98M143 84Q182 61 176 131Q171 166 139 153L127 98" fill="#a77954" />
            <ellipse cx="100" cy="128" rx="57" ry="66" fill="#dec09b" />
            <path d="M100 64Q86 88 86 134L69 158Q100 198 131 158L114 134Q114 88 100 64" fill="#f4e8d5" />
            <ellipse cx="74" cy="122" rx="6" ry="8" fill="#26333a" /><ellipse cx="126" cy="122" rx="6" ry="8" fill="#26333a" />
            <circle cx="76" cy="119" r="2" fill="white" /><circle cx="128" cy="119" r="2" fill="white" />
            <path d="M89 147Q100 139 111 147Q109 158 100 159Q91 158 89 147" fill="#26333a" />
            <path d="M100 159V167M87 168Q100 181 113 168" fill="none" stroke="#725747" strokeWidth="2.5" strokeLinecap="round" />
            {royal && <><path d="M64 61L60 33L82 43L100 21L118 43L140 33L136 61Z" fill="#d1b77a" /><path d="M57 192L100 222L143 192" fill="none" stroke="#d1b77a" strokeWidth="8" /></>}
            <text x="100" y="263" textAnchor="middle" fontFamily="Georgia,serif" fontSize="16" fill={royal ? "#f4e8d5" : "#384b55"}>{name || "Seu pet"}</text>
          </svg>
        )}
      </div>
    </div>
  );
}
