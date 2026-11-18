/**
 * Clases de la pantalla de error "de último recurso": la que se muestra
 * cuando la app ya no puede pintar su propia interfaz. La usan
 * `src/app/global-error.tsx` (React, reemplaza el layout raíz) y
 * `signOutFailureScreen.ts` (DOM directo, EC-851), para que las dos se vean
 * igual y un cambio de estilo se haga en un solo lugar.
 *
 * Son cadenas literales completas para que Tailwind v4 las encuentre al
 * escanear `src/`; no se arman por partes.
 */
export const LAST_RESORT_ERROR_CLASSES = {
  screen: "flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-zinc-950",
  card: "w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900",
  title: "text-lg font-semibold text-slate-900 dark:text-white",
  message: "mt-2 text-sm text-slate-600 dark:text-slate-400",
  actions: "mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center",
  primaryButton:
    "cursor-pointer rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60",
  secondaryButton:
    "cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5",
} as const;
