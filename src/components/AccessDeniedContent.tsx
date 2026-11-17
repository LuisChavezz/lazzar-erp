"use client";

import Link from "next/link";
import { useRouteAccess } from "@/src/hooks/useRouteAccess";
import { getFirstHomeCardEntry } from "@/src/utils/homeCardHref";
import { Button } from "./Button";
import { LockIcon } from "./Icons";

/**
 * Página "sin acceso" (EC-895): a donde el proxy manda a quien abre una ruta
 * sin su permiso. Explica qué pasó y ofrece salir a la primera tarjeta de Home
 * que puede abrir (`getFirstHomeCardEntry`: mismo orden, misma regla y mismo
 * destino que Home) o al inicio.
 *
 * El botón del módulo espera a la sesión: mientras carga (o se recupera) no se
 * sabe a cuál puede entrar, así que solo se ofrece el inicio.
 */
export function AccessDeniedContent() {
  const { isPending, user } = useRouteAccess();
  const firstModule = isPending ? null : getFirstHomeCardEntry(user);

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-6 py-10 text-center shadow-sm dark:shadow-none">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <LockIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          No tienes acceso a esta página
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Tu usuario no tiene el permiso necesario para abrir la página que intentaste ver. Si lo
          necesitas, pide a tu administrador que te lo asigne.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {firstModule && (
            <Button asChild variant="primary">
              <Link href={firstModule.href}>Ir a {firstModule.title}</Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
