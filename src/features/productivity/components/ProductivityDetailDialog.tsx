"use client";

import { ProductivityIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import { InfoField, InfoGrid, SectionTitle, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatLocalDate } from "@/src/utils/formatDate";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { ESTADO_CONFIRMADO, ESTADO_PRODUCTIVIDAD_CFG } from "../constants/productivityChoices";
import { formatCumplimiento } from "../utils/compliance";
import type { ProductivityRow } from "./ProductivityColumns";
import { useUsers } from "@/src/features/users/hooks/useUsers";
import { resolveUserName } from "@/src/features/users/utils/resolveUserName";

const Muted = ({ children }: { children: React.ReactNode }) => (
  <span className="text-slate-400 dark:text-slate-500 italic font-normal">{children}</span>
);

const decimalOrMissing = (value: string | null) =>
  value === null ? <Muted>Sin capturar</Muted> : formatQuantityValue(value);

interface ProductivityDetailDialogProps {
  /**
   * El registro YA cargado por el listado, con sus nombres resueltos: sin fetch
   * propio, porque listado y detalle de `/hr/productividad/` comparten la
   * misma forma.
   */
  record: ProductivityRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de un registro de productividad: datos del registro, medición
 * (meta, resultado y cumplimiento calculado en cliente) y quién lo capturó.
 * Los nombres llegan con sus respaldos ("Empleado #N", "Departamento #N",
 * "Unidad #N") desde `ProductivityList`.
 */
export function ProductivityDetailDialog({ record, open, onOpenChange }: ProductivityDetailDialogProps) {
  // `/usuarios/` es lento: se pide aquí, no en el listado, y este diálogo solo
  // se monta al abrir un detalle. Falla o id ausente → "Usuario #N".
  const { data: users, isError: isUsersError } = useUsers();
  const usersById = users ? new Map(users.map((user) => [user.id, user])) : null;
  const creadoPorNombre = resolveUserName(record.creado_por, usersById, isUsersError);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="720px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <ProductivityIcon className="w-5 h-5 text-violet-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de productividad
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {record.empleado_nombre} · {formatLocalDate(record.fecha)}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Empleado">{record.empleado_nombre}</InfoField>
          <InfoField label="Departamento">{record.departamento_nombre}</InfoField>
          <InfoField label="Fecha">{formatLocalDate(record.fecha)}</InfoField>
          <InfoField label="Estado">
            <StatusBadge status={record.estado} config={ESTADO_PRODUCTIVIDAD_CFG} />
          </InfoField>
          <InfoField label="Descripción" className="col-span-2">
            <span className="whitespace-pre-line">{textOrDash(record.descripcion)}</span>
          </InfoField>
        </div>

        <div>
          <SectionTitle>Medición</SectionTitle>
          <div className="px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10">
            <InfoGrid>
              <InfoField label="Unidad de medida">{record.unidad_nombre}</InfoField>
              <InfoField label="Meta">
                <span className="tabular-nums">{decimalOrMissing(record.meta)}</span>
              </InfoField>
              <InfoField label="Resultado">
                <span className="tabular-nums">{decimalOrMissing(record.resultado)}</span>
              </InfoField>
              <InfoField label="Cumplimiento">
                <span className="tabular-nums">{formatCumplimiento(record.cumplimiento)}</span>
              </InfoField>
            </InfoGrid>
            {record.cumplimiento === null && (
              <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                El cumplimiento se calcula como resultado ÷ meta × 100 y requiere ambos valores
                con una meta distinta de cero.
              </p>
            )}
          </div>
        </div>

        <div>
          <SectionTitle>Trazabilidad</SectionTitle>
          <div className="px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 space-y-3">
            <InfoGrid>
              <InfoField label="Capturado por">
                {creadoPorNombre ?? "—"}
              </InfoField>
            </InfoGrid>
            {record.estado === ESTADO_CONFIRMADO && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Registro confirmado: es de solo lectura. Para corregirlo debe devolverse a
                borrador.
              </p>
            )}
          </div>
        </div>
      </div>
    </MainDialog>
  );
}
