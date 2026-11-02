"use client";

import { useSession } from "next-auth/react";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { CxcIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { useBackendToday } from "@/src/hooks/useBackendToday";
import { CXC_ESTATUS_CONFIG } from "../constants/cxcEstatus";
import { useCuentaPorCobrarDetail } from "../hooks/useCuentaPorCobrarDetail";
import {
  diasVencido,
  formatFolioCxc,
  isCuentaVencida,
} from "../utils/accounts-receivable.utils";
import { AccountsReceivableFacturaSection } from "./AccountsReceivableFacturaSection";
import { AccountsReceivablePolizasSection } from "./AccountsReceivablePolizasSection";
import { AccountsReceivableCobrosSection } from "./AccountsReceivableCobrosSection";
import {
  InfoTile,
  InfoTileGrid,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { DialogHeader } from "@/src/components/DialogHeader";

interface AccountsReceivableDetailDialogProps {
  /** ID de la cuenta a consultar. `0` mantiene la consulta deshabilitada. */
  cuentaId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * HOY ("YYYY-MM-DD", el día del backend) de quien lo monta, para que el
   * detalle y la lista no difieran. Sin él (p. ej. desde Facturación) el
   * diálogo lo calcula con `useBackendToday`.
   */
  today?: string;
}

/**
 * Ruta de la pantalla de Cobros. La sección "Cobros" solo se monta si el
 * usuario puede entrar ahí (`canAccessRoute`, la misma regla del proxy): así
 * sigue a `routePermissions` si cambia, y sin acceso no se piden los cobros.
 */
const COBROS_PATH = "/finance/collections";

export function AccountsReceivableDetailDialog({ today, ...props }: AccountsReceivableDetailDialogProps) {
  return today === undefined ? (
    <DetailDialogWithOwnToday {...props} />
  ) : (
    <DetailDialogContent {...props} today={today} />
  );
}

/** Entrada sin `today` (Facturación): lo calcula una sola vez aquí. */
function DetailDialogWithOwnToday(props: Omit<AccountsReceivableDetailDialogProps, "today">) {
  const today = useBackendToday();
  return <DetailDialogContent {...props} today={today} />;
}

function DetailDialogContent({
  cuentaId,
  open,
  onOpenChange,
  today,
}: Omit<AccountsReceivableDetailDialogProps, "today"> & { today: string }) {
  const { data: cuenta, isNotFound, isInitialError, error } = useCuentaPorCobrarDetail(cuentaId);
  const isAwaiting = !cuenta && !isNotFound && !isInitialError;
  const { data: session } = useSession();
  const canViewCobros = canAccessRoute(COBROS_PATH, session?.user);

  // El folio de CxC se deriva del `id` (el backend no expone folio propio), así
  // que el encabezado puede mostrarlo desde el primer frame, sin esperar al GET.
  const folio = formatFolioCxc(cuentaId);

  // MISMA definición única de "vencida" que la tabla, los KPIs, la antigüedad y
  // la alerta (`isCuentaVencida`, derivada por fecha): el backend no tiene un
  // estatus "Vencida" y una cuenta vencida sigue llegando como
  // `Pendiente`/`Parcial`. Así el detalle no contradice a la fila.
  const estaVencida = cuenta ? isCuentaVencida(cuenta, today) : false;
  const diasDeAtraso = cuenta ? diasVencido(cuenta.fecha_vencimiento, today) : 0;
  const money = (value: string) =>
    formatCurrency(safeParseAmount(value), cuenta?.moneda_codigo ?? null);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton={true}
      title={
        <DialogHeader
          title="Detalle de Cuenta por Cobrar"
          subtitle={folio}
          statusColor="sky"
          icon={CxcIcon}
        />
      }
    >
      {/* ── Estado: cargando ──────────────────────────────────────────────── */}
      {isAwaiting && (
        <Loader title="Cargando detalle de la cuenta por cobrar..." className="py-16" />
      )}

      {/* ── Estado: no disponible (404 definitivo: inexistente o de otra empresa) ── */}
      {isNotFound && (
        <ErrorState
          title="Cuenta por cobrar no disponible"
          message="La cuenta no existe o no tienes acceso a ella."
        />
      )}

      {/* ── Estado: error de carga inicial ────────────────────────────────── */}
      {isInitialError && (
        <ErrorState
          title="Error al cargar el detalle de la cuenta por cobrar"
          message={extractErrorMessage(error, "Ocurrió un problema al consultar el servidor. Intenta de nuevo.")}
        />
      )}

      {/* ── Estado: datos cargados (un refetch fallido los conserva) ──────── */}
      {cuenta && (
        <div className="space-y-5">
          {/* Aviso de vencimiento: derivado de `isCuentaVencida`, NO del
              `estatus` crudo, así que concuerda siempre con la fila, el KPI
              "Vencido" y la antigüedad. */}
          {estaVencida && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm">
              <p className="text-red-700 dark:text-red-400">
                Cuenta vencida hace {diasDeAtraso} {diasDeAtraso === 1 ? "día" : "días"}
                , con un saldo de{" "}
                <span className="font-semibold tabular-nums">
                  {money(cuenta.saldo)}
                </span>
                .
              </p>
            </div>
          )}

          {/* Encabezado: lo que se busca primero al abrir la cuenta. El badge
              refleja el `estatus` CRUDO del backend y el resaltado de vencido se
              deriva aparte: pueden no coincidir (p. ej. "Parcial" + vencida) y
              es correcto, son dos cosas distintas. */}
          <InfoTileGrid>
            <InfoTile label="Estatus">
              <StatusBadge status={cuenta.estatus} config={CXC_ESTATUS_CONFIG} />
            </InfoTile>
            <InfoTile label="Cliente">{textOrDash(cuenta.cliente_nombre)}</InfoTile>
            <InfoTile label="Saldo">
              <span className="tabular-nums">{money(cuenta.saldo)}</span>
            </InfoTile>
            <InfoTile label="Total">
              <span className="tabular-nums">{money(cuenta.total)}</span>
            </InfoTile>
            {/* `total_pagado` lo calcula el BACKEND (`total − saldo`). Se
                muestra tal cual: recalcularlo aquí duplicaría una regla del
                servidor que podría divergir sin que nos enteremos. */}
            <InfoTile label="Total pagado">
              <span className="tabular-nums">{money(cuenta.total_pagado)}</span>
            </InfoTile>
            <InfoTile label="Moneda">{textOrDash(cuenta.moneda_codigo)}</InfoTile>
            <InfoTile label="Fecha de emisión">
              {formatShortDate(cuenta.fecha_emision, { timeZone: "UTC" })}
            </InfoTile>
            <InfoTile label="Vencimiento">
              <span className={estaVencida ? "text-red-600 dark:text-red-400" : undefined}>
                {formatShortDate(cuenta.fecha_vencimiento, { timeZone: "UTC" })}
              </span>
            </InfoTile>
            {/* Fecha-calendario `YYYY-MM-DD` (un `DateField`), igual que
                `fecha_emision`/`fecha_vencimiento`: sin `timeZone: "UTC"` se
                pintaba en la zona local y en México salía un día antes. */}
            <InfoTile label="Último pago">
              {formatShortDate(cuenta.fecha_ultimo_pago, { timeZone: "UTC" })}
            </InfoTile>
            <InfoTile label="Referencia">
              <span className="font-mono">{textOrDash(cuenta.referencia)}</span>
            </InfoTile>
          </InfoTileGrid>

          {cuenta.observaciones && (
            <div>
              <SectionTitle>Observaciones</SectionTitle>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
                {cuenta.observaciones}
              </p>
            </div>
          )}

          {/* Cobros aplicados a la cuenta (solo lectura), solo con el permiso de Cobros */}
          {canViewCobros && <AccountsReceivableCobrosSection cuentaId={cuenta.id} />}

          {/* Factura */}
          <AccountsReceivableFacturaSection
            factura={cuenta.factura}
            monedaCodigo={cuenta.moneda_codigo}
          />

          {/* Pólizas contables */}
          <AccountsReceivablePolizasSection
            polizas={cuenta.polizas}
            monedaCodigo={cuenta.moneda_codigo}
          />
        </div>
      )}
    </MainDialog>
  );
}
