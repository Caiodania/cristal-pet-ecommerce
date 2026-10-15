"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile (captcha gratuito e discreto). Só é carregado quando o
// servidor informa uma chave pública (TURNSTILE_SITE_KEY): sem chave, nada de
// terceiros entra na página. O servidor confere o token em /api/previews.

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("turnstile")), { once: true });
    if (!existing) {
      script.src = SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

type TurnstileProps = {
  siteKey: string;
  onToken: (token: string | undefined) => void;
  /** Muda para pedir um desafio novo (o token vale uma vez só). */
  resetKey: number;
};

export function Turnstile({ siteKey, onToken, resetKey }: TurnstileProps) {
  const host = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  });

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !host.current || !window.turnstile) return;
        widget.current = window.turnstile.render(host.current, {
          sitekey: siteKey,
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(undefined),
          "error-callback": () => callback.current(undefined),
          language: "pt-br",
        });
      })
      .catch(() => callback.current(undefined));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey > 0 && widget.current && window.turnstile) {
      callback.current(undefined);
      window.turnstile.reset(widget.current);
    }
  }, [resetKey]);

  return <div ref={host} />;
}
