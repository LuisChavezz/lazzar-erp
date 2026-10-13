"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hashKey, useIsMutating, useQueryClient, type MutationKey } from "@tanstack/react-query";
import { quoteEditPath } from "../utils/quoteEditRouteAccess";

interface UseCreateAndOpenQuoteOptions {
  /**
   * `mutationKey` de la mutación que crea la cotización, ÚNICO por registro de
   * origen (`["recomprar-pedido", pedidoId]`). Es la identidad del candado: la
   * mutación que `create` dispara debe estar declarada con esta misma llave.
   */
  mutationKey: MutationKey;
  /**
   * Crea la cotización (el `mutateAsync` de esa mutación) y resuelve con su id.
   * Si falla debe RECHAZAR habiendo avisado ya al usuario (el toast vive en el
   * hook de la mutación).
   */
  create: () => Promise<number>;
}

/**
 * Creaciones que ya tuvieron éxito y están NAVEGANDO a su cotización, por hash
 * de `mutationKey`. Vive fuera de React —como la caché de mutaciones, que cubre
 * el tramo anterior— para que el candado no dependa de la instancia que lo
 * tomó: quien se monte mientras tanto también lo ve.
 */
const navigatingAfterCreate = new Set<string>();
const navigationListeners = new Set<() => void>();

const subscribeToNavigation = (listener: () => void) => {
  navigationListeners.add(listener);
  return () => {
    navigationListeners.delete(listener);
  };
};

const setNavigatingAfterCreate = (lockId: string, isNavigating: boolean) => {
  if (navigatingAfterCreate.has(lockId) === isNavigating) return;
  if (isNavigating) navigatingAfterCreate.add(lockId);
  else navigatingAfterCreate.delete(lockId);
  navigationListeners.forEach((listener) => listener());
};

/**
 * Margen para soltar el candado de una navegación cuyo dueño ya no está montado
 * para verla terminar. Lo normal es que se desmontó PORQUE la navegación
 * terminó; el margen cubre el caso raro de que se haya remontado a media
 * navegación.
 */
const ORPHAN_NAVIGATION_RELEASE_MS = 5000;

/**
 * Flujo de una acción que CREA una cotización y navega a editarla ("Recompra"
 * desde un pedido, "Cotizar" desde una oportunidad): confirmación, POST y
 * `router.push` a `/sales/quotes/{id}/edit`.
 *
 * Esos POST no son idempotentes —cada uno crea otra cotización—, así que el
 * doble envío se corta con un candado por REGISTRO DE ORIGEN (`mutationKey`),
 * que se consulta de forma SÍNCRONA al confirmar (`isPending` llega un render
 * tarde y un doble clic rápido lo rebasaría) y no vive en el componente: si
 * este se desmonta y se vuelve a montar con la creación en curso, la instancia
 * nueva lo encuentra tomado.
 *
 * - Mientras el POST está en vuelo, el candado ES la mutación pendiente en la
 *   caché de TanStack.
 * - Si la creación FALLA, la mutación deja de estar pendiente y el candado
 *   queda libre: el diálogo sigue abierto para reintentar o cancelar.
 * - Si tiene ÉXITO, sigue tomado (`navigatingAfterCreate`) hasta que la
 *   navegación termina. El diálogo se cierra con su animación, y durante ella
 *   su botón de confirmar sigue en pantalla: sin el candado, un clic ahí
 *   crearía una segunda cotización.
 *
 * La navegación va en una transición: `isNavigating` sigue en `true` hasta que
 * la ruta nueva se monta (y quien usa esto desaparece), y vuelve a `false` sola
 * si la navegación se abandona — entonces se suelta el candado y la acción se
 * puede volver a usar, sin estado que limpiar a mano.
 *
 * Devuelve las props del disparador y del `ConfirmDialog`; los textos son de
 * cada acción.
 */
export function useCreateAndOpenQuote({ mutationKey, create }: UseCreateAndOpenQuoteOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isNavigating, startNavigation] = useTransition();

  const lockId = hashKey(mutationKey);
  const isCreating = useIsMutating({ mutationKey, exact: true }) > 0;
  const isLockedByNavigation = useSyncExternalStore(
    subscribeToNavigation,
    () => navigatingAfterCreate.has(lockId),
    () => false,
  );

  // Esta instancia tomó el candado de navegación y es quien debe soltarlo.
  const ownedLockIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(false);

  // La navegación terminó sin desmontar esto (se abandonó): se suelta.
  useEffect(() => {
    if (isNavigating || ownedLockIdRef.current === null) return;
    setNavigatingAfterCreate(ownedLockIdRef.current, false);
    ownedLockIdRef.current = null;
  }, [isNavigating]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Ya no podrá ver el final de su navegación: se suelta con margen.
      const ownedLockId = ownedLockIdRef.current;
      if (ownedLockId !== null) {
        setTimeout(() => setNavigatingAfterCreate(ownedLockId, false), ORPHAN_NAVIGATION_RELEASE_MS);
      }
    };
  }, []);

  const handleConfirm = async () => {
    // Síncrono y contra la caché, no contra el estado de este render: `create`
    // deja la mutación pendiente en la misma llamada.
    const isLocked =
      queryClient.isMutating({ mutationKey, exact: true }) > 0 ||
      navigatingAfterCreate.has(lockId);
    if (isLocked) return;

    let quoteId: number;
    try {
      quoteId = await create();
    } catch {
      // Quien creó ya avisó con su toast, y la mutación ya no está pendiente.
      return;
    }

    setNavigatingAfterCreate(lockId, true);
    if (isMountedRef.current) {
      ownedLockIdRef.current = lockId;
    } else {
      // Se desmontó con el POST en vuelo: la navegación se hace igual, pero ya
      // no hay quien la vea terminar.
      setTimeout(() => setNavigatingAfterCreate(lockId, false), ORPHAN_NAVIGATION_RELEASE_MS);
    }
    setIsConfirmOpen(false);
    startNavigation(() => {
      router.push(quoteEditPath(quoteId));
    });
  };

  // Mientras se crea y mientras se navega: ni el disparador ni el diálogo (que
  // puede seguir a la vista, cerrándose) aceptan otra confirmación.
  const isBusy = isCreating || isNavigating || isLockedByNavigation;

  return {
    isCreating,
    openConfirm: () => setIsConfirmOpen(true),
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
