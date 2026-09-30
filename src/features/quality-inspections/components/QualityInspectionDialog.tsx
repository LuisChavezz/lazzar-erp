"use client";

import { useIsMutating } from "@tanstack/react-query";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import { InfoField, InfoGrid, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { ShieldCheckIcon } from "@/src/components/Icons";
import { useReceiptDetail } from "@/src/features/receipts/hooks/useReceiptDetail";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatLocalDate } from "@/src/utils/formatDate";
import { useReceptionLineVariants } from "../hooks/useReceptionLineVariants";
import { CREATE_QUALITY_INSPECTION_MUTATION_KEY } from "../hooks/useCreateQualityInspection";
import { QUALITY_TIPO_ORIGEN_CFG } from "../constants/qualityResultado";
import { QualityInspectionForm } from "./QualityInspectionForm";
import type {
  QualityInspector,
  QualityPendingReception,
} from "../interfaces/quality-inspection.interface";
import type { ReceptionLineVariant } from "../hooks/useReceptionLineVariants";

interface QualityInspectionDialogProps {
  /** Recepción a inspeccionar. `null` = diálogo cerrado (sin consultas). */
  reception: QualityPendingReception | null;
  inspectores: QualityInspector[];
  canSubmit: boolean;
  onClose: () => void;
}

/**
 * Inspección de Calidad de una recepción.
 *
 * Los renglones y sus cantidades salen del onboarding de Calidad (la fila del
 * listado): son exactamente los que el POST exige. Al abrirse, el diálogo pide
 * además el detalle de la recepción (GET /compras/recepciones/{id}/) solo para
 * lo que el onboarding no trae: el nombre del almacén y, en OP, la variante de
 * cada renglón. Ambos se cruzan por el PK de `RecepcionDetalle`, que es el `id`
 * del renglón en los dos endpoints (y el `recepcion_detalle` del POST).
 */
export function QualityInspectionDialog({
  reception,
  inspectores,
  canSubmit,
  onClose,
}: QualityInspectionDialogProps) {
  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = useReceiptDetail(reception?.id ?? null);

  const isOp = reception?.tipo_origen === "OP";
  const variantIdByLine = new Map(
    (detail?.detalles ?? []).map((line) => [line.id, line.producto_variante]),
  );
  const variants = useReceptionLineVariants(isOp ? [...variantIdByLine.values()] : []);

  // `recepcion_detalle` → estado de su variante (solo OP). Un renglón SIN
  // variante (`producto_variante` null) no lleva entrada: no hay talla ni color
  // que mostrar y no es un error. Solo un renglón que no aparece en el detalle
  // (cruce roto) se marca como error.
  const lineVariants = new Map<number, ReceptionLineVariant>();
  if (isOp && reception && detail) {
    for (const line of reception.detalle) {
      if (!variantIdByLine.has(line.id)) {
        lineVariants.set(line.id, { isLoading: false, isError: true, variant: undefined });
        continue;
      }
      const variantId = variantIdByLine.get(line.id);
      const state = variantId ? variants.get(variantId) : undefined;
      if (state) lineVariants.set(line.id, state);
    }
  }

  // Mientras el POST está en curso el diálogo NO se cierra por ninguna vía
  // (Escape y la X pasan por `onOpenChange`; el clic fuera ya lo bloquea
  // `MainDialog`, y "Cancelar" queda deshabilitado por el `fieldset`): cerrarlo
  // haría creer que se canceló una operación que sí mueve inventario.
  const isSubmitting = useIsMutating({ mutationKey: CREATE_QUALITY_INSPECTION_MUTATION_KEY }) > 0;

  return (
    <MainDialog
      open={reception !== null}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
      maxWidth="880px"
      showCloseButton={false}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <ShieldCheckIcon className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Inspección de Calidad
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {reception?.folio ?? ""}
            </p>
          </div>
        </div>
      }
    >
      {reception && (
        <div className="space-y-5 mt-2">
          <InfoGrid>
            <InfoField label="Tipo de origen">
              <StatusBadge status={reception.tipo_origen} config={QUALITY_TIPO_ORIGEN_CFG} />
            </InfoField>
            <InfoField label="Proveedor">{textOrDash(reception.proveedor_nombre)}</InfoField>
            <InfoField label="Fecha de recepción">
              {formatLocalDate(reception.fecha_recepcion)}
            </InfoField>
            <InfoField label="Almacén">
              {detail ? detail.almacen_nombre : isLoading ? "Cargando…" : "—"}
            </InfoField>
          </InfoGrid>

          <p className="text-xs text-slate-500 dark:text-slate-400 rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
            Al registrar, lo aprobado entra a existencias del almacén y la recepción queda
            cerrada. Se inspeccionan todos los renglones en un solo envío y no se puede repetir.
          </p>

          {isLoading && <Loader title="Cargando detalle de la recepción..." className="py-10" />}

          {isError && (
            <div className="space-y-3">
              <ErrorState
                title="Error al cargar el detalle de la recepción"
                message={extractErrorMessage(error, "No se pudo cargar la información.")}
              />
              <div className="flex justify-center">
                <Button variant="secondary" onClick={() => void refetch()}>
                  Reintentar
                </Button>
              </div>
            </div>
          )}

          {detail && (
            <QualityInspectionForm
              // Un formulario por recepción: al cambiar de fila se reinicia.
              key={reception.id}
              reception={reception}
              inspectores={inspectores}
              lineVariants={lineVariants}
              canSubmit={canSubmit}
              onSuccess={onClose}
              onStale={onClose}
              onCancel={onClose}
            />
          )}
        </div>
      )}
    </MainDialog>
  );
}
