"use client";

import { useMemo, useState } from "react";
import {
  buildLineCeilings,
  reconcileCheckedLines,
  reconcileLineQuantities,
  sanitizeIntegerInput,
  seedLineSelection,
  type WorkOrderLineRow,
} from "@/src/utils/workOrderLineQuantities";

interface UseWorkOrderLineSelectionParams {
  /** Líneas del pedido elegido, tal cual están HOY en el onboarding. */
  rows: readonly WorkOrderLineRow[];
  /** Saldo de lo programado (`getWorkOrderSaldo(...).disponible`); `null` no topa. */
  disponible: number | null;
  /** El pedido: la siembra ocurre una vez por cada valor distinto. */
  seedKey: number;
  /** Se llama tras cada cambio del usuario (marcar, desmarcar, teclear). */
  onUserChange?: () => void;
}

/**
 * Estado de captura del Paso 2 de las altas de OR y OCM: qué líneas del pedido
 * entran en la orden y con cuántas piezas. Las reglas viven en
 * `workOrderLineQuantities`; este hook solo las aplica sobre el estado de
 * React. Extraído de `useReflectiveStep2Form` (EC-967) sin cambiar su
 * comportamiento.
 *
 * ── Siembra ─────────────────────────────────────────────────────────────────
 * UNA VEZ por pedido (guardado en estado), no en cada llegada de datos: un
 * refetch posterior —el que dispara el 400 de exceso— no debe volver a marcar
 * lo que el usuario ya había desmarcado. Ajustar los valores a los saldos
 * nuevos es trabajo de la reconciliación.
 *
 * ── Reconciliación ──────────────────────────────────────────────────────────
 * Re-clampa lo capturado a los techos ACTUALES y desmarca lo que se quedó sin
 * techo, de modo que lo MOSTRADO nunca diverge de lo que se enviaría.
 *
 * Las tres colecciones (`ceilings`, `checkedIds`, `quantities`) van indexadas
 * por `pedido_detalle_talla_id` NUMÉRICO para cruzarlas sin `String(id)`.
 */
export function useWorkOrderLineSelection({
  rows,
  disponible,
  seedKey,
  onUserChange,
}: UseWorkOrderLineSelectionParams) {
  /**
   * `useMemo` aquí SÍ está justificado (pese a la regla del React Compiler en
   * CLAUDE.md): la identidad de este objeto es lo que dispara la reconciliación
   * de abajo — un `Map` nuevo en cada render reconciliaría sin parar.
   */
  const ceilings = useMemo(() => buildLineCeilings(rows, disponible), [rows, disponible]);

  let availableRowsCount = 0;
  for (const ceiling of ceilings.values()) {
    if (ceiling > 0) availableRowsCount += 1;
  }

  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set());
  const [quantities, setQuantities] = useState<Map<number, string>>(() => new Map());
  /** Pedido ya sembrado y techos ya reconciliados (ver los ajustes de abajo). */
  const [seededKey, setSeededKey] = useState<number | null>(null);
  const [reconciledCeilings, setReconciledCeilings] = useState(ceilings);

  // Ajustes en RENDER, no en un efecto (`react-hooks/set-state-in-effect`).
  // La siembra ya respeta los techos actuales, así que deja los techos como
  // reconciliados; cualquier cambio posterior de techos (un refetch) reconcilia.
  if (seededKey !== seedKey && rows.length > 0) {
    const seed = seedLineSelection(rows, disponible);
    setSeededKey(seedKey);
    setReconciledCeilings(ceilings);
    setCheckedIds(seed.checkedIds);
    setQuantities(seed.quantities);
  } else if (reconciledCeilings !== ceilings) {
    setReconciledCeilings(ceilings);
    setQuantities((prev) => reconcileLineQuantities(prev, ceilings));
    setCheckedIds((prev) => reconcileCheckedLines(prev, ceilings));
  }

  const toggleLine = (pedidoDetalleTallaId: number) => {
    const ceiling = ceilings.get(pedidoDetalleTallaId) ?? 0;
    if (ceiling <= 0) return;

    const wasChecked = checkedIds.has(pedidoDetalleTallaId);
    const next = new Set(checkedIds);
    if (wasChecked) next.delete(pedidoDetalleTallaId);
    else next.add(pedidoDetalleTallaId);
    setCheckedIds(next);

    setQuantities((current) => {
      const updated = new Map(current);
      if (wasChecked) {
        // Al DESMARCAR se borra la cantidad: una fila que NO viaja en
        // `detalles_override` no debe pintar piezas.
        updated.delete(pedidoDetalleTallaId);
      } else if (!updated.get(pedidoDetalleTallaId)) {
        // Al re-marcar se repone el techo: una casilla marcada con el input en
        // blanco solo sirve para bloquear el envío más tarde.
        updated.set(pedidoDetalleTallaId, String(ceiling));
      }
      return updated;
    });
    onUserChange?.();
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setCheckedIds(new Set());
      setQuantities(new Map());
      onUserChange?.();
      return;
    }
    const nextChecked = new Set<number>();
    const nextQuantities = new Map(quantities);
    for (const row of rows) {
      const ceiling = ceilings.get(row.pedido_detalle_talla_id) ?? 0;
      if (ceiling <= 0) continue;
      nextChecked.add(row.pedido_detalle_talla_id);
      if (!nextQuantities.get(row.pedido_detalle_talla_id)) {
        nextQuantities.set(row.pedido_detalle_talla_id, String(ceiling));
      }
    }
    setCheckedIds(nextChecked);
    setQuantities(nextQuantities);
    onUserChange?.();
  };

  const setQuantity = (pedidoDetalleTallaId: number, value: string) => {
    setQuantities((prev) =>
      new Map(prev).set(pedidoDetalleTallaId, sanitizeIntegerInput(value)),
    );
    onUserChange?.();
  };

  return {
    ceilings,
    availableRowsCount,
    selectedCount: checkedIds.size,
    checkedIds,
    quantities,
    toggleLine,
    toggleAll,
    setQuantity,
  };
}
