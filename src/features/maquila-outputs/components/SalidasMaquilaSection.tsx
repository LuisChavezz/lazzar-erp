"use client";

import { SalidaMaquilaPiezas } from "./SalidaMaquilaPiezas";
import { useState, type ReactNode } from "react";
import { Button } from "@/src/components/Button";
import { EmbarquesIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import { EmptyLines } from "@/src/components/DetailDialogPrimitives";
import { OrderChip, SheetSection } from "@/src/features/orders/components/OrderSheetPrimitives";
import { formatAmountNoCurrency, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import { SALIDA_MAQUILA_STATUS_CONFIG } from "../constants/salidaMaquilaStatus";
import { SALIDA_MAQUILA_ORIGENES, salidaMaquilaFolio } from "../constants/salidaMaquilaOrigen";
import { useSalidaMaquilaAccess } from "../hooks/useSalidaMaquilaAccess";
import { useSalidasMaquila } from "../hooks/useSalidasMaquila";
import type { SalidaMaquilaOrigen } from "../interfaces/salida-maquila.interface";
import { SalidaMaquilaDetailDialog } from "./SalidaMaquilaDetailDialog";

/** Lo que el diálogo de alta recibe de la sección. */
export interface GenerarSalidaMaquilaSlotProps {
  /** Piezas de esta orden en SM no canceladas. */
  yaEnviadas: number;
  open: boolean;
  onClose: () => void;
}

/**
 * Salidas a maquila de una orden (OP, OB u OR, EC-911), en su detalle: las que
 * ya hay y "Generar SM". No se genera sobre una orden cancelada (el backend la
 * rechaza). "Generar SM" exige `C-PRODUCCION-OP` y `R-PRODUCCION-COSTOS`;
 * cancelar, solo el primero. Mismos permisos en los tres orígenes.
 *
 * El diálogo de alta lo pone quien monta la sección (`renderGenerarDialog`):
 * la OP pide su retrieve al abrirlo; OB y OR pasan los renglones que su página
 * ya cargó.
 *
 * Leer SM exige `R-PRODUCCION-OP`, la regla de la ruta del listado: sin él (un
 * rol con OB/OR pero sin OP) la sección no se monta ni pide las SM. En la OP
 * siempre pasa, porque su ruta exige el mismo código. Mientras la sesión carga
 * no se pinta, así que dentro ningún permiso está pendiente.
 */
export function SalidasMaquilaSection(props: SalidasMaquilaSectionProps) {
  const access = useSalidaMaquilaAccess();
  return access.canRead ? <SalidasMaquilaSectionContent {...props} access={access} /> : null;
}

interface SalidasMaquilaSectionProps {
  origen: SalidaMaquilaOrigen;
  ordenId: number;
  cancelada: boolean;
  renderGenerarDialog: (props: GenerarSalidaMaquilaSlotProps) => ReactNode;
}

function SalidasMaquilaSectionContent({
  origen,
  ordenId,
  cancelada,
  renderGenerarDialog,
  access,
}: SalidasMaquilaSectionProps & { access: ReturnType<typeof useSalidaMaquilaAccess> }) {
  const { salidas, isLoading, isInitialError } = useSalidasMaquila({
    [SALIDA_MAQUILA_ORIGENES[origen].campo]: ordenId,
  });
  const { canWrite, canGenerate } = access;
  const canSeeAmounts = access.amounts === "allowed";
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
      subtitle={`Prendas de esta ${origen} que salieron a confeccionarse con un maquilero.`}
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
        canGenerate && !cancelada ? (
          // Sin la lista no se sabe cuánto ya salió: el tope del diálogo sería falso.
          <Button
            type="button"
            variant="primary"
            onClick={() => setCreating(true)}
            disabled={isLoading || isInitialError}
            title={isInitialError ? "No se pudieron cargar las salidas de esta orden" : undefined}
          >
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
        <EmptyLines>Esta {origen} no tiene salidas a maquila.</EmptyLines>
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
                <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                  {salidaMaquilaFolio(s)}
                </span>
                <StatusBadge status={s.estatus} config={SALIDA_MAQUILA_STATUS_CONFIG} />
                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 min-w-40">
                  {s.centro_confeccion_nombre}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Envío {formatShortCalendarDate(s.fecha_envio)}
                  {s.fecha_compromiso && <> · Compromiso {formatShortCalendarDate(s.fecha_compromiso)}</>}
                </span>
                <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
                  {formatQuantityValue(s.total_piezas)} pz{" "}
                  <SalidaMaquilaPiezas recibidas={s.piezas_recibidas} faltantes={s.piezas_faltantes} estatus={s.estatus} />
                </span>
                {canSeeAmounts && (
                  <span className="text-sm tabular-nums font-semibold text-slate-900 dark:text-white">
                    {formatAmountNoCurrency(s.total)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && renderGenerarDialog({ yaEnviadas, open: creating, onClose: () => setCreating(false) })}
      <SalidaMaquilaDetailDialog
        id={openId}
        onClose={() => setOpenId(null)}
        canWrite={canWrite}
        canSeeAmounts={canSeeAmounts}
      />
    </SheetSection>
  );
}
