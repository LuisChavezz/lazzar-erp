import { LAST_RESORT_ERROR_CLASSES as classes } from "@/src/styles/lastResortErrorClasses";

/**
 * Pantalla completa "No se pudo cerrar la sesión" (EC-851).
 *
 * La muestra `signOutToLogin` cuando la guarda de `signOutLoopGuard` ya no
 * deja navegar. Se construye con el DOM directamente, no con React, a
 * propósito: la llama `v1_api` (fuera de React) y la página de abajo es justo
 * la que está recibiendo 401, así que no puede depender de que esa página,
 * sus providers o un error boundary sigan en pie. Solo necesita el CSS global
 * ya cargado (las clases de Tailwind de este archivo entran al build porque
 * Tailwind v4 escanea todo `src/`) y la clase `dark` que el layout raíz pone en
 * `<html>`.
 *
 * Usa las mismas clases que `src/app/global-error.tsx`
 * (`lastResortErrorClasses`).
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

/**
 * Tiempo (ms) que "Reintentar" queda desactivado tras el clic. Si para entonces
 * la página sigue aquí, la navegación no ocurrió (p. ej. el usuario canceló un
 * aviso `beforeunload`, como el de `RfidLabelCreateDialog`) y el botón vuelve a
 * servir; si la página se fue, el temporizador muere con ella.
 */
export const SIGN_OUT_FAILURE_RETRY_REENABLE_MS = 3_000;

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
  screen.className = `fixed inset-0 z-[2147483647] ${classes.screen}`;

  const card = document.createElement("div");
  card.className = classes.card;

  const title = document.createElement("h1");
  title.id = titleId;
  title.className = classes.title;
  title.textContent = SIGN_OUT_FAILURE_TITLE;

  const message = document.createElement("p");
  message.id = messageId;
  message.className = classes.message;
  message.textContent = SIGN_OUT_FAILURE_MESSAGE;

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = classes.primaryButton;
  retry.textContent = SIGN_OUT_FAILURE_RETRY_LABEL;
  retry.addEventListener("click", () => {
    // Evita el doble clic mientras la navegación arranca.
    retry.disabled = true;
    setTimeout(() => {
      retry.disabled = false;
    }, SIGN_OUT_FAILURE_RETRY_REENABLE_MS);
    onRetry();
  });

  const actions = document.createElement("div");
  actions.className = classes.actions;
  actions.append(retry);

  card.append(title, message, actions);
  screen.append(card);

  for (const sibling of Array.from(document.body.children)) {
    sibling.setAttribute("inert", "");
  }
  document.body.append(screen);
  retry.focus();
};
