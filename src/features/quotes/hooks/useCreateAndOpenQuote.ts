"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { quoteEditPath } from "../utils/quoteEditRouteAccess";

interface UseCreateAndOpenQuoteOptions {
  /**
   * Crea la cotización y resuelve con su id. Si falla debe RECHAZAR habiendo
   * avisado ya al usuario (el toast vive en el hook de la mutación): aquí el
   * error solo libera el candado.
   */
  create: () => Promise<number>;
  /** `isPending` de esa mutación. */
  isCreating: boolean;
}

/**
 * Flujo de una acción que CREA una cotización y navega a editarla ("Recompra"
 * desde un pedido, "Cotizar" desde una oportunidad): confirmación, POST y
 * `router.push` a `/sales/quotes/{id}/edit`.
 *
 * Esos POST no son idempotentes —cada uno crea otra cotización—, así que el
 * doble envío se corta con un candado SÍNCRONO (`isPending` llega un render
 * tarde y un doble clic rápido lo rebasaría):
 *
 * - se toma al confirmar;
 * - si la creación FALLA, se suelta: el diálogo queda abierto para reintentar
 *   o cancelar;
 * - si tiene ÉXITO, sigue tomado hasta que la navegación termina. El diálogo
 *   se cierra con su animación, y durante ella su botón de confirmar sigue en
 *   pantalla: sin el candado, un clic ahí crearía una segunda cotización.
 *
 * La navegación va en una transición: `isNavigating` sigue en `true` hasta que
 * la ruta nueva se monta (y quien usa esto desaparece), y vuelve a `false` sola
 * si la navegación se abandona — entonces se suelta el candado y la acción se
 * puede volver a usar, sin estado que limpiar a mano.
 *
 * Devuelve las props del disparador y del `ConfirmDialog`; los textos son de
 * cada acción.
 */
export function useCreateAndOpenQuote({ create, isCreating }: UseCreateAndOpenQuoteOptions) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const lockRef = useRef(false);
  const [isNavigating, startNavigation] = useTransition();
  // ¿El candado sigue tomado por una creación exitosa que está navegando?
  const isLockedByNavigationRef = useRef(false);

  // La navegación terminó sin desmontar esto (se abandonó): se suelta.
  useEffect(() => {
    if (isNavigating || !isLockedByNavigationRef.current) return;
    isLockedByNavigationRef.current = false;
    lockRef.current = false;
  }, [isNavigating]);

  const handleConfirm = async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    let quoteId: number;
    try {
      quoteId = await create();
    } catch {
      // Quien creó ya avisó con su toast.
      lockRef.current = false;
      return;
    }
    isLockedByNavigationRef.current = true;
    setIsConfirmOpen(false);
    startNavigation(() => {
      router.push(quoteEditPath(quoteId));
    });
  };

  // Mientras se crea y mientras se navega: ni el disparador ni el diálogo (que
  // puede seguir a la vista, cerrándose) aceptan otra confirmación.
  const isBusy = isCreating || isNavigating;

  return {
    isCreating,
    triggerProps: {
      onClick: () => setIsConfirmOpen(true),
      disabled: isBusy,
    },
    confirmDialogProps: {
      open: isConfirmOpen,
      onOpenChange: setIsConfirmOpen,
      closeOnConfirm: false,
      busy: isBusy,
      onConfirm: handleConfirm,
    },
  };
}
