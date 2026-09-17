"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { InfoField, SectionTitle, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { PlanCuentasIcon } from "@/src/components/Icons";
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
      maxWidth="640px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <PlanCuentasIcon className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de la Cuenta Contable
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {cuenta.codigo || `#${cuenta.id}`}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Código">
            <span className="font-mono">{textOrDash(cuenta.codigo)}</span>
          </InfoField>
          <InfoField label="Tipo">
            <StatusBadge status={cuenta.tipo} config={CUENTA_CONTABLE_TIPO_CONFIG} />
          </InfoField>
          <InfoField label="Estatus">
            <StatusBadge
              status={cuenta.activo ? "activo" : "inactivo"}
              config={ACTIVO_INACTIVO_CFG}
            />
          </InfoField>
          <InfoField label="Nivel">
            <span className="tabular-nums">{cuenta.nivel}</span>
          </InfoField>
          <InfoField label="Cuenta padre">
            {cuenta.cuenta_padre === null ? "—" : `#${cuenta.cuenta_padre}`}
          </InfoField>
          <InfoField label="Movimientos">
            {cuenta.acepta_movimientos ? "Acepta" : "Agrupación"}
          </InfoField>
        </div>

        <div>
          <SectionTitle>Nombre</SectionTitle>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {textOrDash(cuenta.nombre)}
          </p>
        </div>

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
