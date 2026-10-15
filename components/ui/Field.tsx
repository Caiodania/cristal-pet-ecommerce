"use client";

import { useId } from "react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-soft border border-field bg-white px-4 text-base text-ink " +
  "placeholder:text-ink-soft/70 aria-[invalid=true]:border-danger aria-[invalid=true]:border-2";

type BaseProps = {
  label: string;
  /** Texto de ajuda, ligado ao campo por aria-describedby. */
  hint?: string;
  /** Mensagem de erro: aparece abaixo do campo e é anunciada. */
  error?: string;
  optional?: boolean;
};

function Wrapper({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: BaseProps & { id: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {label}
        {optional && <span className="font-normal text-ink-soft"> (opcional)</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

/** Campo de texto com rótulo, ajuda e erro ligados corretamente (acessível). */
export function TextField({
  label,
  hint,
  error,
  optional,
  className,
  ...rest
}: BaseProps & Omit<ComponentProps<"input">, "id"> & { id?: string }) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} optional={optional}>
      <input
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "min-h-12", className)}
      />
    </Wrapper>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  className,
  ...rest
}: BaseProps & Omit<ComponentProps<"textarea">, "id"> & { id?: string }) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "min-h-24 py-3", className)}
      />
    </Wrapper>
  );
}

/** Caixa de seleção com o texto (que pode ter link) clicável. */
export function CheckboxField({
  label,
  error,
  className,
  ...rest
}: { label: React.ReactNode; error?: string } & Omit<ComponentProps<"input">, "id" | "type">) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <div className="flex items-start gap-3">
        <input
          {...rest}
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("mt-0.5 size-6 shrink-0 accent-[var(--color-teal-deep)]", className)}
        />
        <label htmlFor={id} className="text-ink-soft">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
