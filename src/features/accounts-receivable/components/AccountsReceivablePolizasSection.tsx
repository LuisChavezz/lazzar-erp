"use client";

import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import type {
  CuentaPorCobrarPoliza,
  CuentaPorCobrarPolizaDetalle,
} from "../interfaces/accounts-receivable-detail.interface";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "./AccountsReceivableDetailPrimitives";

interface AccountsReceivablePolizasSectionProps {
  polizas: CuentaPorCobrarPoliza[];
  /** Código de moneda de la cuenta (p. ej. "MXN"), para formatear sus importes. */
  monedaCodigo: string;
}

/**
 * Movimientos de UNA póliza, ordenados por `orden` (el backend lo expone justo
 * para fijar el orden de los asientos, que en contabilidad no es cosmético: el
 * cargo antecede a su abono). Se ordena sobre una COPIA — `sort` muta en sitio y
 * el arreglo viene de la caché de TanStack Query, que es de solo lectura.
 */
const PolizaDetallesTable = ({
  detalles,
  monedaCodigo,
}: {
  detalles: CuentaPorCobrarPolizaDetalle[];
  monedaCodigo: string;
}) => {
  if (detalles.length === 0) {
    return <EmptyLines>Esta póliza no tiene movimientos registrados.</EmptyLines>;
  }

  const ordenados = [...detalles].sort((a, b) => a.orden - b.orden);

  return (
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Cuenta contable</th>
          <th className="px-3 py-2 font-medium">Centro de costo</th>
          <th className="px-3 py-2 font-medium text-right">Cargo</th>
          <th className="px-3 py-2 font-medium text-right">Abono</th>
          <th className="px-3 py-2 font-medium">Referencia / Observaciones</th>
        </>
      }
    >
      {ordenados.map((detalle) => {
        // `cargo` y `abono` se muestran TAL CUAL los devuelve el backend (solo
        // formateados): en un asiento uno de los dos va en cero, y atenuar el
        // lado en cero es estilo — el importe exacto se sigue mostrando.
        // `safeParseAmount` (la misma coerción que usa `formatCurrency` más abajo
        // para el texto) y NO `Number()` crudo: un `cargo`/`abono` faltante o no
        // numérico debe leerse como cero en AMBOS lados (estilo y texto) — con
        // `Number()`, ese caso da `NaN`, `NaN === 0` es `false`, y la celda se
        // atenúa como "sin valor" mientras el texto sigue mostrando "$0.00", una
        // contradicción visual entre el estilo y el texto de la misma celda.
        const sinCargo = safeParseAmount(detalle.cargo) === 0;
        const sinAbono = safeParseAmount(detalle.abono) === 0;
        const observaciones = textOrDash(detalle.observaciones);

        return (
          <tr
            key={detalle.id}
            className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors align-top"
          >
            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {textOrDash(detalle.cuenta_contable_codigo)}
              </span>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              {textOrDash(detalle.cuenta_contable_nombre)}
            </td>
            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
              {textOrDash(detalle.centro_costo_nombre)}
            </td>
            <td
              className={`px-3 py-2 text-right tabular-nums ${
                sinCargo
                  ? "text-slate-300 dark:text-slate-600"
                  : "font-semibold text-slate-800 dark:text-white"
              }`}
            >
              {formatCurrency(safeParseAmount(detalle.cargo), { currency: monedaCodigo })}
            </td>
            <td
              className={`px-3 py-2 text-right tabular-nums ${
                sinAbono
                  ? "text-slate-300 dark:text-slate-600"
                  : "font-semibold text-slate-800 dark:text-white"
              }`}
            >
              {formatCurrency(safeParseAmount(detalle.abono), { currency: monedaCodigo })}
            </td>
            {/* Referencia y observaciones se colapsan en una columna: son los dos
                textos largos del renglón y por separado desbordan el diálogo. El
                texto íntegro queda en `title` (tooltip nativo) al truncarse. */}
            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
              <div className="max-w-56">
                <p className="font-mono text-xs truncate" title={detalle.referencia || undefined}>
                  {textOrDash(detalle.referencia)}
                </p>
                {observaciones !== "—" && (
                  <p
                    className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5"
                    title={detalle.observaciones}
                  >
                    {observaciones}
                  </p>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </LineItemsTable>
  );
};

/** Tarjeta de una póliza: su encabezado propio + sus movimientos. */
const PolizaCard = ({
  poliza,
  monedaCodigo,
}: {
  poliza: CuentaPorCobrarPoliza;
  monedaCodigo: string;
}) => (
  <div className="rounded-xl border border-slate-100 dark:border-white/10 p-3">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-1 pb-3 text-xs">
      <InfoField label="Folio">
        <span className="font-mono">{textOrDash(poliza.folio)}</span>
      </InfoField>
      <InfoField label="Tipo">{textOrDash(poliza.tipo)}</InfoField>
      <InfoField label="Fecha">
        <span className="tabular-nums">
          {formatShortDate(poliza.fecha, { timeZone: "UTC" })}
        </span>
      </InfoField>
      <InfoField label="Estatus">{textOrDash(poliza.estatus)}</InfoField>
      {/* `total_cargos` y `total_abonos` los calcula el backend y se muestran tal
          cual: en una póliza cuadrada deben coincidir, pero comprobarlo aquí
          sería duplicar una regla contable del servidor. */}
      <InfoField label="Total cargos">
        <span className="tabular-nums">
          {formatCurrency(safeParseAmount(poliza.total_cargos), { currency: monedaCodigo })}
        </span>
      </InfoField>
      <InfoField label="Total abonos">
        <span className="tabular-nums">
          {formatCurrency(safeParseAmount(poliza.total_abonos), { currency: monedaCodigo })}
        </span>
      </InfoField>
      <InfoField label="Concepto" className="col-span-2 sm:col-span-3">
        {textOrDash(poliza.concepto)}
      </InfoField>
    </div>

    <PolizaDetallesTable detalles={poliza.detalles ?? []} monedaCodigo={monedaCodigo} />
  </div>
);

/**
 * Sección "Pólizas" del detalle de CxC: las pólizas contables asociadas, cada
 * una con sus movimientos. Los dos niveles pueden venir vacíos —ninguna póliza,
 * o una póliza sin movimientos— y cada uno tiene su propio estado vacío.
 */
export const AccountsReceivablePolizasSection = ({
  polizas,
  monedaCodigo,
}: AccountsReceivablePolizasSectionProps) => {
  const lista = polizas ?? [];

  return (
    <div>
      <SectionTitle>Pólizas contables</SectionTitle>

      {lista.length === 0 ? (
        <EmptyLines>Esta cuenta no tiene pólizas asociadas.</EmptyLines>
      ) : (
        <div className="space-y-3">
          {lista.map((poliza) => (
            <PolizaCard key={poliza.id} poliza={poliza} monedaCodigo={monedaCodigo} />
          ))}
        </div>
      )}
    </div>
  );
};
