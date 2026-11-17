"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { useRouteAccess } from "@/src/hooks/useRouteAccess";

type AccessibleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  /** Destino como texto: su ruta (sin query ni hash) es la que se evalúa. */
  href: string;
  /** Clase del texto que se pinta en lugar del enlace sin acceso. */
  fallbackClassName?: string;
  children: ReactNode;
};

/**
 * `next/link` que solo enlaza si el usuario puede abrir el destino
 * (`useRouteAccess`, la misma regla que el proxy). Sin acceso pinta el mismo
 * contenido como texto, sin enlace: el documento sigue a la vista, pero no se
 * ofrece una ruta que acabaría en "sin acceso" (EC-895).
 *
 * Mientras la sesión carga o se recupera el acceso está PENDIENTE: el texto se
 * pinta atenuado y marcado `aria-busy`, ni como enlace ni como "sin acceso".
 */
export function AccessibleLink({ href, fallbackClassName, children, ...linkProps }: AccessibleLinkProps) {
  const { isPending, canOpen } = useRouteAccess();
  if (isPending) {
    return (
      <span className={`${fallbackClassName ?? ""} animate-pulse`.trim()} aria-busy="true">
        {children}
      </span>
    );
  }
  if (!canOpen(href.split(/[?#]/)[0])) {
    return <span className={fallbackClassName}>{children}</span>;
  }
  return (
    <Link href={href} {...linkProps}>
      {children}
    </Link>
  );
}
