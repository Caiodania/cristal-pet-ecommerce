import type { Metadata } from "next";

// Painel do dono: fora do Google e sem a vitrine ao redor.
export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-sand">{children}</div>;
}
