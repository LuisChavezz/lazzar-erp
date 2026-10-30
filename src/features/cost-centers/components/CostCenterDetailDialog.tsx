"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import {
  InfoTile,
  InfoTileGrid,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { CentrosCostoIcon } from "@/src/components/Icons";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
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
      maxWidth={DIALOG_WIDTH_FORM}
      showCloseButton={true}
      title={
        <DialogHeader
          title="Detalle del Centro de Costo"
          subtitle={centro.codigo || `#${centro.id}`}
          statusColor="indigo"
          icon={CentrosCostoIcon}
        />
      }
    >
      <div className="space-y-5">
        {/* Encabezado: lo que se busca primero al abrir el registro. */}
        <InfoTileGrid>
          <InfoTile label="Nombre">{textOrDash(centro.nombre)}</InfoTile>
          <InfoTile label="Código">
            <span className="font-mono">{textOrDash(centro.codigo)}</span>
          </InfoTile>
          <InfoTile label="Estatus">
            <StatusBadge
              status={centro.activo ? "activo" : "inactivo"}
              config={ACTIVO_INACTIVO_CFG}
            />
          </InfoTile>
        </InfoTileGrid>

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
