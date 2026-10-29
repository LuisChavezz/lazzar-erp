"use client";

import { ProductivityIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  InfoField,
  InfoGrid,
  InfoTile,
  InfoTileGrid,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
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
      maxWidth={DIALOG_WIDTH_FORM}
      showCloseButton={true}
      title={
        <DialogHeader
          title="Detalle de productividad"
          subtitle={`${record.empleado_nombre} · ${formatLocalDate(record.fecha)}`}
          statusColor="violet"
          icon={ProductivityIcon}
        />
      }
    >
      <div className="space-y-5">
        {/* Encabezado: lo que se busca primero al abrir el registro. */}
        <InfoTileGrid>
          <InfoTile label="Empleado">{record.empleado_nombre}</InfoTile>
          <InfoTile label="Departamento">{record.departamento_nombre}</InfoTile>
          <InfoTile label="Fecha">{formatLocalDate(record.fecha)}</InfoTile>
          <InfoTile label="Estado">
            <StatusBadge status={record.estado} config={ESTADO_PRODUCTIVIDAD_CFG} />
          </InfoTile>
        </InfoTileGrid>

        <div className="text-xs px-1">
          <InfoField label="Descripción">
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
