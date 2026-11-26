"use client";

import { WorkOrderLinesTable } from "@/src/components/WorkOrderLinesTable";
import { reflectiveLineProductoNombre } from "../hooks/useReflectiveStep2Form";
import type { ReflectiveOnboardingDetalle } from "../interfaces/reflective-order.interface";
import {
  ReflectiveConfigCountBadge,
  ReflectiveLineConfigPopover,
} from "./ReflectiveLineConfigPopover";

interface ReflectiveOrderLinesTableProps {
  rows: ReflectiveOnboardingDetalle[];
  /** Techo por línea (`min(pendiente, disponible)`), por id. */
  ceilings: Map<number, number>;
  checkedIds: Set<number>;
  /** Cantidad capturada por id. Una línea desmarcada NO tiene entrada. */
  quantities: Map<number, string>;
  availableRowsCount: number;
  selectedCount: number;
  onToggleLine: (pedidoDetalleTallaId: number) => void;
  onToggleAll: (checked: boolean) => void;
  onQuantityChange: (pedidoDetalleTallaId: number, value: string) => void;
}

/**
 * Tabla de prendas del Paso 2 de reflejante: la `WorkOrderLinesTable`
 * compartida con el alta de OCM, más una segunda fila por línea con el
 * disparador del popover de configuración (`ReflectiveLineConfigPopover`) y el
 * distintivo de conteo cuando la línea lleva varios reflejantes. Cada elemento
 * de `reflejante_config` es un reflejante (material + posición); el arreglo trae
 * de uno a tres, y P-00027 mezcla dos materiales en la misma prenda.
 *
 * El disparador es UNO por fila aunque el config sea UNIFORME entre las líneas
 * del pedido: va colapsado en un trigger compacto y mantiene la fila
 * autoexplicativa. La cardinalidad NO cambia: varios reflejantes son una sola
 * línea. Sin config no hay nada que abrir: no se pinta ni el botón ni un popover
 * vacío.
 */
export function ReflectiveOrderLinesTable(props: ReflectiveOrderLinesTableProps) {
  return (
    <WorkOrderLinesTable
      {...props}
      title="Prendas a reflejar"
      quantityVerb="reflejar"
      inputIdPrefix="reflective-line"
      renderRowFooter={(row) => {
        // Los reflejantes de la línea, del onboarding (lectura en vivo del
        // pedido). Puede venir `null`/vacío: la fila cae a mostrar solo
        // cantidades, sin popover.
        const configs = row.reflejante_config ?? [];
        if (configs.length === 0) return null;
        return (
          <>
            <ReflectiveLineConfigPopover
              configs={configs}
              productoNombre={reflectiveLineProductoNombre(row)}
              // Talla y color distinguen filas que comparten producto; sin ellos
              // el nombre accesible sería idéntico en todas.
              tallaNombre={row.talla_nombre}
              colorNombre={row.color_nombre}
            />
            <ReflectiveConfigCountBadge configs={configs} />
          </>
        );
      }}
    />
  );
}
