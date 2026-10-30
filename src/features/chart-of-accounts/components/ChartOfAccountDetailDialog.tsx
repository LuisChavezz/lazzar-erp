"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { InfoTile, InfoTileGrid, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { PlanCuentasIcon } from "@/src/components/Icons";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { CUENTA_CONTABLE_TIPO_CONFIG } from "../constants/chartOfAccountTipo";
import type { CuentaContable } from "../interfaces/chart-of-account.interface";

interface ChartOfAccountDetailDialogProps {
  /**
   * La cuenta ya cargada por el listado — SIN fetch propio. El listado y el
   * detalle comparten el mismo `CuentaContableSerializer` (el ViewSet declara un
   * único `serializer_class`, sin `get_serializer_class`), así que la fila trae
   * exactamente lo mismo que devolvería el retrieve.
   */
  cuenta: CuentaContable;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de solo lectura de una cuenta contable.
 *
 * LIMITACIÓN: `cuenta_padre` es un id y el serializer no expone el código ni el
 * nombre del padre. Se muestra como `#id` en vez de hacer una consulta extra o
 * cruzar contra el catálogo — esta fase no captura ni recorre la jerarquía.
 */
export function ChartOfAccountDetailDialog({
  cuenta,
  open,
  onOpenChange,
}: ChartOfAccountDetailDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth={DIALOG_WIDTH_FORM}
      showCloseButton={true}
      title={
        <DialogHeader
          title="Detalle de la Cuenta Contable"
          subtitle={cuenta.codigo || `#${cuenta.id}`}
          statusColor="indigo"
          icon={PlanCuentasIcon}
        />
      }
    >
      <div className="space-y-5">
        {/* Encabezado: lo que se busca primero al abrir el registro. */}
        <InfoTileGrid>
          <InfoTile label="Nombre">{textOrDash(cuenta.nombre)}</InfoTile>
          <InfoTile label="Código">
            <span className="font-mono">{textOrDash(cuenta.codigo)}</span>
          </InfoTile>
          <InfoTile label="Tipo">
            <StatusBadge status={cuenta.tipo} config={CUENTA_CONTABLE_TIPO_CONFIG} />
          </InfoTile>
          <InfoTile label="Estatus">
            <StatusBadge
              status={cuenta.activo ? "activo" : "inactivo"}
              config={ACTIVO_INACTIVO_CFG}
            />
          </InfoTile>
          <InfoTile label="Nivel">
            <span className="tabular-nums">{cuenta.nivel}</span>
          </InfoTile>
          <InfoTile label="Cuenta padre">
            {cuenta.cuenta_padre === null ? "—" : `#${cuenta.cuenta_padre}`}
          </InfoTile>
          <InfoTile label="Movimientos">
            {cuenta.acepta_movimientos ? "Acepta" : "Agrupación"}
          </InfoTile>
        </InfoTileGrid>

        {/* Qué significa `acepta_movimientos` para la captura de pólizas. */}
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
          {cuenta.acepta_movimientos
            ? "Esta cuenta admite asientos directos: se ofrece en el selector de movimientos de una póliza mientras esté activa."
            : "Cuenta de agrupación: solo suma a sus cuentas hijas y no se ofrece para capturar un cargo o un abono."}
        </p>
      </div>
    </MainDialog>
  );
}
