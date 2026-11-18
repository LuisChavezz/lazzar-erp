/**
 * Pantalla completa "No se pudo cerrar la sesión" (EC-851).
 *
 * La muestra `signOutToLogin` cuando la guarda de `signOutFallbackGuard` ya no
 * deja navegar. Se construye con el DOM directamente, no con React, a
 * propósito: la llama `v1_api` (fuera de React) y la página de abajo es justo
 * la que está recibiendo 401, así que no puede depender de que esa página,
 * sus providers o un error boundary sigan en pie. Solo necesita el CSS global
 * ya cargado (las clases de Tailwind de este archivo entran al build porque
 * Tailwind v4 escanea todo `src/`) y la clase `dark` que el layout raíz pone en
 * `<html>`.
 *
 * Tapa la página y la deja `inert` (sin foco ni clics) para que no se siga
 * usando una sesión que ya no sirve. Es idempotente: si ya está montada, no
 * monta otra.
 */
export const SIGN_OUT_FAILURE_SCREEN_ID = "erp-signout-failure";

export const SIGN_OUT_FAILURE_TITLE = "No se pudo cerrar la sesión";
export const SIGN_OUT_FAILURE_MESSAGE =
  "La sesión sigue abierta en este navegador. Revisa tu conexión y vuelve a intentarlo; si sigue pasando, avisa a soporte.";
export const SIGN_OUT_FAILURE_RETRY_LABEL = "Reintentar";

export const showSignOutFailureScreen = (onRetry: () => void) => {
  if (typeof document === "undefined" || !document.body) return;
  if (document.getElementById(SIGN_OUT_FAILURE_SCREEN_ID)) return;

  const titleId = `${SIGN_OUT_FAILURE_SCREEN_ID}-title`;
  const messageId = `${SIGN_OUT_FAILURE_SCREEN_ID}-message`;

  const screen = document.createElement("div");
  screen.id = SIGN_OUT_FAILURE_SCREEN_ID;
  screen.setAttribute("role", "alertdialog");
  screen.setAttribute("aria-modal", "true");
  screen.setAttribute("aria-labelledby", titleId);
  screen.setAttribute("aria-describedby", messageId);
  screen.className =
    "fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-50 px-4 dark:bg-zinc-950";

  const card = document.createElement("div");
  card.className =
    "w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900";

  const title = document.createElement("h1");
  title.id = titleId;
  title.className = "text-lg font-semibold text-slate-900 dark:text-white";
  title.textContent = SIGN_OUT_FAILURE_TITLE;

  const message = document.createElement("p");
  message.id = messageId;
  message.className = "mt-2 text-sm text-slate-600 dark:text-slate-400";
  message.textContent = SIGN_OUT_FAILURE_MESSAGE;

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className =
    "mt-6 cursor-pointer rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60";
  retry.textContent = SIGN_OUT_FAILURE_RETRY_LABEL;
  retry.addEventListener("click", () => {
    // Un solo intento por clic: la navegación ya está en curso.
    retry.disabled = true;
    onRetry();
  });

  card.append(title, message, retry);
  screen.append(card);

  for (const sibling of Array.from(document.body.children)) {
    sibling.setAttribute("inert", "");
  }
  document.body.append(screen);
  retry.focus();
};
