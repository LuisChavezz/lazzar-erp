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
  InfoField,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";

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

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <CxcIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Cuenta por Cobrar
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {folio}
            </p>
          </div>
        </div>
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
                  {formatCurrency(safeParseAmount(cuenta.saldo), { currency: cuenta.moneda_codigo })}
                </span>
                .
              </p>
            </div>
          )}

          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
            {/* El badge refleja el `estatus` CRUDO del backend; el resaltado de
                vencido de abajo se deriva aparte. Pueden no coincidir (p. ej.
                "Parcial" + vencida) y es correcto: son dos cosas distintas. */}
            <InfoField label="Estatus">
              <StatusBadge status={cuenta.estatus} config={CXC_ESTATUS_CONFIG} />
            </InfoField>
            <InfoField label="Cliente">{textOrDash(cuenta.cliente_nombre)}</InfoField>
            <InfoField label="Moneda">{textOrDash(cuenta.moneda_codigo)}</InfoField>
            <InfoField label="Fecha de emisión">
              <span className="tabular-nums">
                {formatShortDate(cuenta.fecha_emision, { timeZone: "UTC" })}
              </span>
            </InfoField>
            <InfoField label="Fecha de vencimiento">
              <span
                className={`tabular-nums ${
                  estaVencida ? "text-red-600 dark:text-red-400 font-semibold" : ""
                }`}
              >
                {formatShortDate(cuenta.fecha_vencimiento, { timeZone: "UTC" })}
              </span>
            </InfoField>
            <InfoField label="Referencia">
              <span className="font-mono">{textOrDash(cuenta.referencia)}</span>
            </InfoField>
            <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
              {textOrDash(cuenta.observaciones)}
            </InfoField>
          </div>

          {/* Desglose financiero */}
          <div>
            <SectionTitle>Desglose financiero</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 text-xs">
              <InfoField label="Total">
                <span className="tabular-nums">
                  {formatCurrency(safeParseAmount(cuenta.total), { currency: cuenta.moneda_codigo })}
                </span>
              </InfoField>
              {/* `total_pagado` lo calcula el BACKEND (`total − saldo`). Se
                  muestra tal cual: recalcularlo aquí duplicaría una regla del
                  servidor que podría divergir sin que nos enteremos. */}
              <InfoField label="Total pagado">
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatCurrency(safeParseAmount(cuenta.total_pagado), { currency: cuenta.moneda_codigo })}
                </span>
              </InfoField>
              <InfoField label="Saldo">
                <span className="tabular-nums font-semibold text-slate-800 dark:text-white">
                  {formatCurrency(safeParseAmount(cuenta.saldo), { currency: cuenta.moneda_codigo })}
                </span>
              </InfoField>
              <InfoField label="Último pago">
                <span className="tabular-nums">
                  {/* Fecha-calendario `YYYY-MM-DD` (un `DateField`), igual que
                      `fecha_emision`/`fecha_vencimiento`: sin `timeZone: "UTC"`
                      se pintaba en la zona local y en México salía un día antes. */}
                  {formatShortDate(cuenta.fecha_ultimo_pago, { timeZone: "UTC" })}
                </span>
              </InfoField>
            </div>
          </div>

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
