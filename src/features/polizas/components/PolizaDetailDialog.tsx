"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { ContabilidadIcon } from "@/src/components/Icons";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  POLIZA_ESTATUS_CONFIG,
  POLIZA_TIPO_CONFIG,
} from "../constants/polizaStatus";
import type { Branch } from "@/src/features/branches/interfaces/branch.interface";
import type { Poliza } from "../interfaces/poliza.interface";
import type { CentroCosto, CuentaContable } from "../interfaces/catalogos.interface";

interface PolizaDetailDialogProps {
  /**
   * La póliza ya cargada por el listado — SIN fetch propio de la cabecera ni de
   * los movimientos: `GET /finanzas/polizas/` y el retrieve comparten el mismo
   * `PolizaSerializer`, y `poliza_detalles` viene anidado en ambos, igual que
   * `total_cargos`, `total_abonos` y `cuadre_correcto`. Patrón de "sin consulta
   * extra" (ver `CreditNoteDetailDialog`, `ShippingDetailDialog`).
   */
  poliza: Poliza;
  /**
   * Catálogos ya cargados por el listado, para poner NOMBRE a los ids que el
   * serializer no resuelve: `PolizaSerializer` no expone
   * `cuenta_contable_codigo`/`_nombre`, `centro_costo_nombre` ni
   * `sucursal_nombre` (a diferencia del detalle de CxC, que sí trae los dos
   * primeros). Llegan por props —no por hooks propios— para no duplicar las
   * consultas que la vista ya hizo.
   *
   * Mientras un catálogo no ha llegado (o si el id no está en él) se muestra el
   * id en crudo: es un estado momentáneo y el número sigue identificando la fila.
   */
  cuentasContables: CuentaContable[];
  centrosCosto: CentroCosto[];
  branches: Branch[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Importe SIN símbolo de moneda: `Poliza` no declara ninguna y no hay de dónde
 * derivarla (ver el encabezado de `poliza.interface.ts`).
 */
const importe = (value: string): string =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeParseAmount(value));

export function PolizaDetailDialog({
  poliza,
  cuentasContables,
  centrosCosto,
  branches,
  open,
  onOpenChange,
}: PolizaDetailDialogProps) {
  /**
   * Nombre de una cuenta contable. Devuelve `null` cuando el catálogo todavía no
   * llegó o cuando el id no está en él —lo segundo es esperable: el catálogo se
   * pide filtrado a `acepta_movimientos=true`, y una póliza vieja puede apuntar a
   * una cuenta que ya no acepta movimientos, o el propio campo puede venir nulo
   * (`on_delete=SET_NULL`)—. La tabla cae entonces al id, que sí existe.
   */
  const cuentaDe = (id: number | null) =>
    id === null ? undefined : cuentasContables.find((c) => c.id === id);

  const centroDe = (id: number | null) =>
    id === null ? undefined : centrosCosto.find((c) => c.id === id);

  const nombreCentro = (id: number | null): string => {
    if (id === null) return "—";
    const centro = centroDe(id);
    return centro ? `${centro.codigo} - ${centro.nombre}` : `#${id}`;
  };

  const nombreSucursal = (): string => {
    const branch = branches.find((b) => b.id === poliza.sucursal);
    return branch ? `${branch.codigo} - ${branch.nombre}` : `#${poliza.sucursal}`;
  };

  // Los movimientos se ordenan por `orden` sobre una COPIA: `sort` muta en sitio
  // y el arreglo viene de la caché de TanStack Query, que es de solo lectura. El
  // orden no es cosmético en contabilidad (el cargo antecede a su abono) y es lo
  // que `AccountsReceivablePolizasSection` ya usa. `orden` es nullable: los nulos
  // se mandan al final en vez de colapsar en 0 y adelantarse a todo.
  const movimientos = [...poliza.poliza_detalles].sort(
    (a, b) => (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER),
  );

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="960px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <ContabilidadIcon className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de la Póliza
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {poliza.folio || `#${poliza.id}`}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Cabecera: sale del renglón que el listado ya cargó. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Fecha contable">
            {/* `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD". La fija el
                backend (`auto_now_add`) y es nullable en el modelo. */}
            {poliza.fecha
              ? formatShortDate(poliza.fecha, { timeZone: "UTC" })
              : "—"}
          </InfoField>
          <InfoField label="Tipo">
            <StatusBadge status={poliza.tipo} config={POLIZA_TIPO_CONFIG} />
          </InfoField>
          <InfoField label="Estatus">
            <StatusBadge status={poliza.estatus} config={POLIZA_ESTATUS_CONFIG} />
          </InfoField>
          <InfoField label="Sucursal">{nombreSucursal()}</InfoField>
          <InfoField label="Centro de costo">
            {nombreCentro(poliza.centro_costo)}
          </InfoField>
          <InfoField label="Consecutivo">
            {/* Solo lo asigna el backend cuando ÉL genera la póliza; una póliza
                capturada a mano lo deja nulo. */}
            {poliza.folio_consecutivo !== null ? (
              <span className="tabular-nums">{poliza.folio_consecutivo}</span>
            ) : (
              "—"
            )}
          </InfoField>
          <InfoField label="Total cargos">
            <span className="tabular-nums font-semibold">
              {importe(poliza.total_cargos)}
            </span>
          </InfoField>
          <InfoField label="Total abonos">
            <span className="tabular-nums font-semibold">
              {importe(poliza.total_abonos)}
            </span>
          </InfoField>
          <InfoField label="Cuadre">
            {poliza.cuadre_correcto ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Cuadra
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                No cuadra
              </span>
            )}
          </InfoField>
          <InfoField label="Concepto" className="col-span-2 sm:col-span-3">
            {textOrDash(poliza.concepto)}
          </InfoField>
        </div>

        {/* Qué significa el estatus, que es lo que el usuario necesita saber al
            abrir el documento. Cancelar una póliza NO revierte importes: la
            póliza ES el asiento, no hay saldo que devolver. */}
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
          {poliza.estatus === "Contabilizada"
            ? "Esta póliza está contabilizada: su asiento forma parte de la contabilidad y ya no puede eliminarse, solo cancelarse."
            : poliza.estatus === "Borrador"
              ? "Este borrador todavía no forma parte de la contabilidad. Para contabilizarlo, los cargos deben igualar a los abonos."
              : "Esta póliza está cancelada. La cancelación es un cambio de estatus: no revierte ningún importe, porque la póliza es el asiento en sí."}
        </p>

        {/* Los importes no llevan símbolo: la póliza no declara moneda ni tiene
            desde dónde derivarla. Se dice, en vez de dejar números pelones sin
            explicación. */}
        <p className="text-xs text-slate-400 dark:text-slate-500 px-1">
          Importes sin símbolo: el documento de póliza no registra moneda.
        </p>

        {/* ── Movimientos ─────────────────────────────────────────────── */}
        <div>
          <SectionTitle>Movimientos</SectionTitle>
          {movimientos.length === 0 ? (
            <EmptyLines>Esta póliza no tiene movimientos registrados.</EmptyLines>
          ) : (
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-medium">Cuenta contable</th>
                  <th className="px-3 py-2 font-medium">Centro de costo</th>
                  <th className="px-3 py-2 font-medium text-right">Cargo</th>
                  <th className="px-3 py-2 font-medium text-right">Abono</th>
                  <th className="px-3 py-2 font-medium">
                    Referencia / Observaciones
                  </th>
                </>
              }
            >
              {movimientos.map((mov) => {
                const cuenta = cuentaDe(mov.cuenta_contable);
                // `safeParseAmount` (la misma coerción del formateo) y NO
                // `Number()` crudo: un importe no numérico debe leerse como cero
                // en el ESTILO igual que en el TEXTO — con `Number()` daría `NaN`,
                // la celda no se atenuaría y el texto seguiría mostrando "0.00".
                const sinCargo = safeParseAmount(mov.cargo) === 0;
                const sinAbono = safeParseAmount(mov.abono) === 0;
                const observaciones = textOrDash(mov.observaciones);

                return (
                  <tr
                    key={mov.id}
                    className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors align-top"
                  >
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      {cuenta ? (
                        <>
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {cuenta.codigo}
                          </span>
                          <span className="mx-1.5 text-slate-300 dark:text-slate-600">
                            ·
                          </span>
                          {cuenta.nombre}
                        </>
                      ) : (
                        <span className="font-mono text-xs">
                          {mov.cuenta_contable === null
                            ? "—"
                            : `Cuenta #${mov.cuenta_contable}`}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {nombreCentro(mov.centro_costo)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        sinCargo
                          ? "text-slate-300 dark:text-slate-600"
                          : "font-semibold text-slate-800 dark:text-white"
                      }`}
                    >
                      {importe(mov.cargo)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        sinAbono
                          ? "text-slate-300 dark:text-slate-600"
                          : "font-semibold text-slate-800 dark:text-white"
                      }`}
                    >
                      {importe(mov.abono)}
                    </td>
                    {/* Referencia y observaciones se colapsan en una columna: son
                        los dos textos largos del renglón y por separado desbordan
                        el diálogo. El texto íntegro queda en `title`. */}
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      <div className="max-w-56">
                        <p
                          className="font-mono text-xs truncate"
                          title={mov.referencia || undefined}
                        >
                          {textOrDash(mov.referencia)}
                        </p>
                        {observaciones !== "—" && (
                          <p
                            className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5"
                            title={mov.observaciones ?? undefined}
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
          )}
        </div>
      </div>
    </MainDialog>
  );
}
