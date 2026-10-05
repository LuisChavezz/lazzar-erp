import type { RefObject } from "react";

/**
 * Ref callback para un botón que se desmonta como consecuencia de pulsarlo
 * ("Reintentar" al pasar a `loading`, "Marcar todas" al quedar sin no leídas).
 * Si el foco seguía en él —o ya había caído a `<body>`, como pasa cuando el
 * botón se deshabilita mientras vuela la mutación— lo lleva a `target` en vez
 * de dejarlo en `<body>`.
 *
 * Usa la limpieza de ref de React 19: corre en el commit que elimina el botón,
 * ANTES de quitarlo del DOM, así que `activeElement` todavía es fiable. El
 * enfoque se difiere a una microtarea para que ocurra ya sin el botón, y se
 * descarta si el botón sigue en el DOM o si `target` también se desmontó (la
 * superficie entera se cerró).
 * Dentro del modal se adelanta al `FocusScope` de Radix, que solo actúa si el
 * foco está en `<body>`.
 */
export const refocusOnUnmount =
  (target: RefObject<HTMLElement | null>) => (node: HTMLElement | null) => {
    if (!node) return;
    return () => {
      const active = document.activeElement;
      if (active !== node && active !== null && active !== document.body) {
        return;
      }
      queueMicrotask(() => {
        // La limpieza también corre cuando solo cambia la identidad del ref
        // callback en un re-render: si el botón sigue en el DOM, no hay nada
        // que reubicar.
        if (node.isConnected) return;
        const element = target.current;
        if (element?.isConnected) element.focus();
      });
    };
  };
