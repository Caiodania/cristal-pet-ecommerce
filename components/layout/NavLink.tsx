"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type NavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  /** Classes extras quando a página atual é a do link. */
  activeClassName?: string;
};

/**
 * Link de navegação que marca a página atual com aria-current. Links com
 * âncora (/#faq) nunca ficam "ativos": apontam para uma seção, não para a rota.
 */
export function NavLink({
  href,
  children,
  className,
  activeClassName,
}: NavLinkProps) {
  const pathname = usePathname();
  const current = !href.includes("#") && pathname === href;

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(className, current && activeClassName)}
    >
      {children}
    </Link>
  );
}
