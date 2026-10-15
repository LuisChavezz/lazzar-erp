import { useState } from "react";
import toast from "react-hot-toast";
import {
  PRODUCTION_ORDER_STATUS_CODE,
  productionOrderStatusEntry,
} from "@/src/features/production-orders/constants/productionOrderStatus";
import type {
  ChangeProductionOrderStatusBody,
  ProductionOrderStatusOption,
} from "../interfaces/production-order-status.interface";
import { classifyChangeStatusError } from "./productionOrderStatusErrors";
import { useChangeProductionOrderStatus } from "./useChangeProductionOrderStatus";
import { useProductionOrderStatus } from "./useProductionOrderStatus";

/**
 * Diálogo de cambio de estatus abierto. Uno solo a la vez y siempre en el MISMO
 * `MainDialog`: pasar de "motivo" a "requisitos" (un 409 con `bloqueos`) solo
 * cambia el contenido, sin cerrar un `Dialog.Root` y abrir otro en el mismo
 * commit.
 */
export type ProductionOrderStatusDialogState =
  | { kind: "motivo"; destino: number; label: string }
  | { kind: "complete"; destino: number; label: string }
  | {
      kind: "blocked";
      destino: number;
      label: string;
      /** `msg` del 409; `null` si el diálogo se abrió desde la opción del menú. */
      message: string | null;
      bloqueos: string[];
      sePuedeForzar: boolean;
    };

/** Dónde pinta el diálogo (o el menú) cada error que no cambia de diálogo. */
export interface ChangeStatusErrorHandlers {
  onMessage: (message: string) => void;
  /** Sin él, un 400 `motivo` abre el diálogo de motivo de ese destino. */
  onMotivoError?: (message: string) => void;
  /** Al terminar el POST, bien o mal (p. ej. para soltar un candado de envío). */
  onSettled?: () => void;
}

/**
 * Destinos que piden motivo aunque la opción no lo marcara (`requiere_motivo`
 * es la fuente; esto es la red por si el backend lo omitiera).
 */
const MOTIVO_REQUIRED_STATUSES: readonly number[] = [
  PRODUCTION_ORDER_STATUS_CODE.STOPPED,
  PRODUCTION_ORDER_STATUS_CODE.CANCELLED,
];

const optionLabel = (option: ProductionOrderStatusOption) =>
  productionOrderStatusEntry(option.estatus_op, option.etiqueta).label;

/**
 * Estado del cambio de estatus de la página de detalle: el GET `estatus/`, la
 * mutación y QUÉ diálogo está abierto. Vive en la página y no en el menú ni en
 * el diálogo: cerrar el menú, un refetch del detalle o que la página pase a su
 * estado de error no desmontan un diálogo abierto, y los callbacks por llamada
 * de `mutate` siempre encuentran a su dueño montado.
 *
 * Al elegir una opción del menú:
 * - con requisitos pendientes (`permitido: false`): diálogo de requisitos;
 * - Completado: confirmación (no se deshace desde el sistema);
 * - Detenido / Cancelado (o cualquiera con `requiere_motivo`): diálogo con
 *   motivo obligatorio;
 * - cualquier otra: se aplica directo y sus errores van por toast.
 */
export const useProductionOrderStatusFlow = (opId: number) => {
  const status = useProductionOrderStatus(opId);
  const mutation = useChangeProductionOrderStatus(opId);
  const [dialog, setDialog] = useState<ProductionOrderStatusDialogState | null>(null);

  const submit = (
    body: ChangeProductionOrderStatusBody,
    label: string,
    handlers: ChangeStatusErrorHandlers,
  ) => {
    mutation.mutate(body, {
      onSettled: () => handlers.onSettled?.(),
      onSuccess: () => setDialog(null),
      onError: (error) => {
        const outcome = classifyChangeStatusError(error);
        switch (outcome.kind) {
          case "blocked":
            setDialog({
              kind: "blocked",
              destino: body.estatus_op,
              label,
              message: outcome.message,
              bloqueos: outcome.bloqueos,
              sePuedeForzar: outcome.sePuedeForzar,
            });
            return;
          case "invalid-transition":
            // El hook ya relee el estatus y el detalle.
            toast.error(outcome.message);
            setDialog(null);
            return;
          case "motivo":
            if (handlers.onMotivoError) {
              handlers.onMotivoError(outcome.message);
            } else {
              toast.error(outcome.message);
              setDialog({ kind: "motivo", destino: body.estatus_op, label });
            }
            return;
          case "message":
            handlers.onMessage(outcome.message);
        }
      },
    });
  };

  const select = (option: ProductionOrderStatusOption) => {
    const label = optionLabel(option);
    if (!option.permitido) {
      setDialog({
        kind: "blocked",
        destino: option.estatus_op,
        label,
        message: null,
        bloqueos: option.bloqueos,
        sePuedeForzar: option.se_puede_forzar,
      });
    } else if (option.estatus_op === PRODUCTION_ORDER_STATUS_CODE.COMPLETED) {
      setDialog({ kind: "complete", destino: option.estatus_op, label });
    } else if (option.requiere_motivo || MOTIVO_REQUIRED_STATUSES.includes(option.estatus_op)) {
      setDialog({ kind: "motivo", destino: option.estatus_op, label });
    } else {
      submit({ estatus_op: option.estatus_op }, label, {
        onMessage: (message) => toast.error(message),
      });
    }
  };

  const closeDialog = () => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!mutation.isPending) setDialog(null);
  };

  return {
    /** Destinos posibles; vacío si la OP es terminal, el GET falló o dio 404. */
    options: status.data?.opciones ?? [],
    folio: status.data?.folio_op ?? "",
    isPending: mutation.isPending,
    dialog,
    select,
    submit,
    closeDialog,
  };
};

export type ProductionOrderStatusFlow = ReturnType<typeof useProductionOrderStatusFlow>;
