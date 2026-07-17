"use client";

import { CxcIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { CXC_ESTATUS_CONFIG } from "../constants/cxcEstatus";
import { useCuentaPorCobrarDetail } from "../hooks/useCuentaPorCobrarDetail";
import {
  diasVencido,
  formatFolioCxc,
  isCuentaVencida,
  startOfTodayUTC,
} from "../utils/accounts-receivable.utils";
import { AccountsReceivableFacturaSection } from "./AccountsReceivableFacturaSection";
import { AccountsReceivablePolizasSection } from "./AccountsReceivablePolizasSection";
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
}

export function AccountsReceivableDetailDialog({
  cuentaId,
  open,
  onOpenChange,
}: AccountsReceivableDetailDialogProps) {
  const { data: cuenta, isLoading, isError, error } = useCuentaPorCobrarDetail(cuentaId);

  // El folio de CxC se deriva del `id` (el backend no expone folio propio), así
  // que el encabezado puede mostrarlo desde el primer frame, sin esperar al GET.
  const folio = formatFolioCxc(cuentaId);

  // MISMA definición única de "vencida" que la tabla, los KPIs, la antigüedad y
  // la alerta (`isCuentaVencida`, derivada por fecha). Reutilizarla —en vez de
  // leer `estatus === "Vencida"`— es lo que impide que el detalle contradiga a
  // la fila de la que se abrió: una cuenta vencida puede seguir llegando como
  // `Pendiente`/`Parcial`, porque `estatus` es un enum de una sola dimensión.
  const today = startOfTodayUTC();
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
      {isLoading && (
        <Loader title="Cargando detalle de la cuenta por cobrar..." className="py-16" />
      )}

      {/* ── Estado: error ─────────────────────────────────────────────────── */}
      {isError && (
        <ErrorState
          title="Error al cargar el detalle de la cuenta por cobrar"
          message={(error as Error)?.message}
        />
      )}

      {/* ── Estado: datos cargados ────────────────────────────────────────── */}
      {!isLoading && !isError && cuenta && (
        <div className="space-y-5">
          {/* Aviso de vencimiento: derivado de `isCuentaVencida`, NO del
              `estatus` crudo, así que concuerda siempre con la fila, el KPI
              "Vencido" y la antigüedad. */}
          {estaVencida && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm">
              <p className="text-red-700 dark:text-red-400">
                Cuenta vencida{" "}
                {diasDeAtraso === 0
                  ? "hoy"
                  : `hace ${diasDeAtraso} ${diasDeAtraso === 1 ? "día" : "días"}`}
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
            {/* El backend puede devolver `observaciones: null` en el detalle;
                `useCuentaPorCobrarDetail` ya lo normalizó a "" (ver su `select`),
                así que aquí solo queda el caso de cadena vacía, que `textOrDash`
                cubre igual. */}
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
                  {/* A diferencia de `fecha_emision`/`fecha_vencimiento` (fechas
                      calendario `YYYY-MM-DD`), `fecha_ultimo_pago` es un TIMESTAMP
                      real con hora — `timeZone: "UTC"` aquí desplazaría el día
                      mostrado según la hora local del pago y del usuario (ver el
                      contrato de `timeZone` en `formatShortDate`). Se omite a
                      propósito para que el día se lea en la zona horaria local. */}
                  {formatShortDate(cuenta.fecha_ultimo_pago)}
                </span>
              </InfoField>
            </div>
          </div>

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
