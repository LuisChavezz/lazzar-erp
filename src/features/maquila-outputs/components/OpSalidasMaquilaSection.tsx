"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/src/components/Button";
import { EmbarquesIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import { EmptyLines } from "@/src/components/DetailDialogPrimitives";
import { OrderChip, SheetSection } from "@/src/features/orders/components/OrderSheetPrimitives";
import { formatAmountNoCurrency, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import { hasPermission } from "@/src/utils/permissions";
import { SALIDA_MAQUILA_STATUS_CONFIG } from "../constants/salidaMaquilaStatus";
import { useSalidasMaquila } from "../hooks/useSalidasMaquila";
import { GenerarSalidaMaquilaDialog } from "./GenerarSalidaMaquilaDialog";
import { SalidaMaquilaDetailDialog } from "./SalidaMaquilaDetailDialog";

/**
 * Salidas a maquila de una OP, en su detalle: las que ya hay y "Generar SM".
 * No se genera sobre una OP cancelada (el backend la rechaza).
 */
export function OpSalidasMaquilaSection({ opId, opCancelada }: { opId: number; opCancelada: boolean }) {
  const { salidas, isLoading, isInitialError } = useSalidasMaquila({ op: opId });
  const { data: session } = useSession();
  const canWrite = hasPermission("C-PRODUCCION-OP", session?.user);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const yaEnviadas = salidas
    .filter((s) => s.estatus !== "CANCELADA")
    .reduce((acc, s) => acc + (Number(s.total_piezas) || 0), 0);
  const enMaquila = salidas.filter((s) => s.estatus === "ENVIADA").length;

  return (
    <SheetSection
      icon={<EmbarquesIcon className="w-5 h-5" />}
      title="Salidas a maquila"
      subtitle="Prendas de esta OP que salieron a confeccionarse con un maquilero."
      badges={
        salidas.length > 0 ? (
          <>
            <OrderChip>
              {salidas.length} {salidas.length === 1 ? "salida" : "salidas"}
            </OrderChip>
            {enMaquila > 0 && <OrderChip>{enMaquila} en maquila</OrderChip>}
          </>
        ) : undefined
      }
      action={
        canWrite && !opCancelada ? (
          <Button type="button" variant="primary" onClick={() => setCreating(true)} disabled={isLoading}>
            Generar SM
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <EmptyLines>Cargando salidas…</EmptyLines>
      ) : isInitialError ? (
        <EmptyLines>No se pudieron cargar las salidas a maquila.</EmptyLines>
      ) : salidas.length === 0 ? (
        <EmptyLines>Esta OP no tiene salidas a maquila.</EmptyLines>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
          {salidas.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setOpenId(s.id)}
                title="Ver detalle"
                className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
              >
                <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">{s.folio}</span>
                <StatusBadge status={s.estatus} config={SALIDA_MAQUILA_STATUS_CONFIG} />
                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 min-w-40">
                  {s.centro_confeccion_nombre}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Envío {formatShortCalendarDate(s.fecha_envio)}
                  {s.fecha_compromiso && <> · Compromiso {formatShortCalendarDate(s.fecha_compromiso)}</>}
                </span>
                <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
                  {formatQuantityValue(s.total_piezas)} pz
                </span>
                <span className="text-sm tabular-nums font-semibold text-slate-900 dark:text-white">
                  {formatAmountNoCurrency(s.total)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <GenerarSalidaMaquilaDialog
          opId={opId}
          yaEnviadas={yaEnviadas}
          open={creating}
          onClose={() => setCreating(false)}
        />
      )}
      <SalidaMaquilaDetailDialog id={openId} onClose={() => setOpenId(null)} canWrite={canWrite} />
    </SheetSection>
  );
}
