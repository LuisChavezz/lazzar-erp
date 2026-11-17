"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { canAccessRoute } from "@/src/utils/routeAccess";

type AccessibleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  /** Destino como texto: su ruta (sin query ni hash) es la que se evalúa. */
  href: string;
  /** Clase del texto que se pinta en lugar del enlace sin acceso. */
  fallbackClassName?: string;
  children: ReactNode;
};

/**
 * `next/link` que solo enlaza si el usuario puede abrir el destino
 * (`canAccessRoute`, la misma regla que el proxy). Sin acceso pinta el mismo
 * contenido como texto, sin enlace: el documento sigue a la vista, pero no se
 * ofrece una ruta que acabaría en "sin acceso" (EC-895). Mientras la sesión
 * carga también es texto.
 */
export function AccessibleLink({ href, fallbackClassName, children, ...linkProps }: AccessibleLinkProps) {
  const { data: session } = useSession();
  const pathname = href.split(/[?#]/)[0];
  if (!canAccessRoute(pathname, session?.user)) {
    return <span className={fallbackClassName}>{children}</span>;
  }
  return (
    <Link href={href} {...linkProps}>
      {children}
    </Link>
  );
}
