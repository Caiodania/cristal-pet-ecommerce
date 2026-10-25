import type { Metadata } from "next";
import { NaoEncontrada } from "@/components/ui/NaoEncontrada";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NaoEncontrada />;
}
