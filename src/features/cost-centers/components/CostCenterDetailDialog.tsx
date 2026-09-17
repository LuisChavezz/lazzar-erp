"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import {
  InfoField,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { CentrosCostoIcon } from "@/src/components/Icons";
import type { CostCenter } from "../interfaces/cost-center.interface";

interface CostCenterDetailDialogProps {
  /**
   * El centro ya cargado por el listado — SIN fetch propio. El listado y el
   * detalle comparten el mismo `CentroCostoSerializer` (el ViewSet declara un
   * único `serializer_class`, sin `get_serializer_class`), así que la fila trae
   * exactamente lo mismo que devolvería el retrieve.
   */
  centro: CostCenter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de solo lectura de un centro de costo.
 *
 * No hay tabla de renglones ni fechas: el modelo es plano y no expone
 * `created_at` ni `updated_at` (ver `CostCenter`).
 */
export function CostCenterDetailDialog({
  centro,
  open,
  onOpenChange,
}: CostCenterDetailDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="640px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <CentrosCostoIcon className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle del Centro de Costo
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {centro.codigo || `#${centro.id}`}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Código">
            <span className="font-mono">{textOrDash(centro.codigo)}</span>
          </InfoField>
          <InfoField label="Estatus">
            <StatusBadge
              status={centro.activo ? "activo" : "inactivo"}
              config={ACTIVO_INACTIVO_CFG}
            />
          </InfoField>
        </div>

        <div>
          <SectionTitle>Nombre</SectionTitle>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {textOrDash(centro.nombre)}
          </p>
        </div>

        <div>
          <SectionTitle>Descripción</SectionTitle>
          {/* `whitespace-pre-line`: el texto libre puede traer saltos de línea
              capturados en el `<textarea>`. */}
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
            {textOrDash(centro.descripcion)}
          </p>
        </div>

        {/* Qué significa el estatus para la captura de pólizas. */}
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
          {centro.activo
            ? "Este centro de costo está disponible: se ofrece al capturar una póliza, tanto en la cabecera como en cada movimiento."
            : "Centro de costo dado de baja: sigue en el catálogo y en las pólizas que ya lo usan, pero no se ofrece para capturar una nueva."}
        </p>
      </div>
    </MainDialog>
  );
}
