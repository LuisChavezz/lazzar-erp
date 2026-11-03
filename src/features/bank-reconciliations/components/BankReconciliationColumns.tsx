import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { BanIcon, CheckCircleIcon } from "@/src/components/Icons";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { formatShortDate } from "@/src/utils/formatDate";
import { formatSaldo } from "@/src/features/bank-accounts/utils/bankAccountMoney";
import { CONCILIACION_ESTATUS_CONFIG } from "../constants/conciliacionEstatus";
import {
  centavosAMoneda,
  conciliacionCuadra,
  diferenciaEnCentavos,
} from "../schemas/bank-reconciliation.schema";
import type { ConciliacionBancaria } from "../interfaces/bank-reconciliation.interface";
import { useConciliacionRowActionsContext } from "../hooks/useConciliacionRowActions";
import { CONCILIACION_WRITE_PERMISSION_REASON } from "../utils/conciliacionPermissions";

const columnHelper = createColumnHelper<ConciliacionBancaria>();

/** Texto de la cuenta: su alias, o `Cuenta #N` si no tiene (`alias` es nullable). */
export const getCuentaLabel = (conciliacion: ConciliacionBancaria): string =>
  conciliacion.cuenta_bancaria_alias || `Cuenta #${conciliacion.cuenta_bancaria}`;

/**
 * Celda de la cuenta: la conciliación NO tiene folio, así que el nombre de su
 * cuenta ES el menú de la fila (`FolioActionMenu`, modo nombre), con "Ver
 * detalle" como primera acción y el estatus debajo. Callbacks y "en vuelo"
 * llegan por contexto (`ConciliacionRowActionsProvider`).
 */
function ConciliacionCuentaCell({ conciliacion }: { conciliacion: ConciliacionBancaria }) {
  const { onViewDetail, onCerrar, onCancelar, busyIds, writeAccess } =
    useConciliacionRowActionsContext();
  // Una fila con un cierre o una cancelación en vuelo no ofrece otra acción.
  const busy = busyIds.includes(conciliacion.id);
  // Sin el permiso de escritura (`E-FIN-FACTURAS`) las acciones se muestran
  // deshabilitadas con su motivo, convención de EC-713. El motivo del permiso
  // manda sobre el del cuadre. Mientras la sesión carga quedan deshabilitadas
  // SIN motivo: todavía no se sabe si falta el permiso.
  const canWrite = writeAccess === "allowed";
  const permissionReason =
    writeAccess === "denied" ? CONCILIACION_WRITE_PERMISSION_REASON : undefined;
  const items: ActionMenuItem[] = [];

  // Solo un `Borrador` se cierra.
  if (conciliacion.estatus === "Borrador") {
    const cuadra = conciliacionCuadra(
      conciliacion.saldo_estado_cuenta,
      conciliacion.saldo_libros,
    );
    items.push({
      label: !canWrite || cuadra ? "Cerrar conciliación" : "Cerrar conciliación (no cuadra)",
      icon: CheckCircleIcon,
      onSelect: () => onCerrar(conciliacion),
      // El backend rechaza el cierre descuadrado; la acción se ofrece
      // deshabilitada en vez de esconderla, para que se vea que existe y por qué
      // no está disponible todavía.
      disabled: busy || !canWrite || !cuadra,
      description: permissionReason,
    });
  }
  // Se cancela un `Borrador` o una `Cerrada`; cancelar una cerrada regresa sus
  // movimientos a `Pendiente` (nucleo-erp #827). `Cancelada` es terminal.
  if (conciliacion.estatus !== "Cancelada") {
    items.push({
      label: "Cancelar conciliación",
      icon: BanIcon,
      onSelect: () => onCancelar(conciliacion),
      disabled: busy || !canWrite,
      description: permissionReason,
    });
  }

  return (
    <FolioActionMenu
      name={getCuentaLabel(conciliacion)}
      detail={{ onSelect: () => onViewDetail(conciliacion) }}
      items={items}
      status={
        <StatusBadge status={conciliacion.estatus} config={CONCILIACION_ESTATUS_CONFIG} />
      }
    />
  );
}

/**
 * Columnas del listado de conciliaciones bancarias. Callbacks y "en vuelo"
 * llegan al menú por `ConciliacionRowActionsProvider`, así una acción no remonta
 * las celdas.
 *
 * Los diálogos (detalle y las confirmaciones de cerrar y cancelar) viven en
 * `BankReconciliationView`: una celda se desmonta al ordenar, filtrar o paginar,
 * y ambas mutaciones cambian el `estatus`, que es justo uno de los filtros.
 *
 * NO hay acción de eliminar: el backend la acepta sobre un borrador, pero
 * retirar una conciliación es cancelarla —queda el rastro del periodo que se
 * intentó cuadrar— y no destruirla.
 *
 * @param monedaDe Código ISO de la moneda de una cuenta. La fila NO lo trae
 *   (solo el id y el alias de la cuenta), y cada cuenta bancaria tiene su
 *   propia moneda: formatear con el MXN por defecto mentiría sobre una cuenta
 *   en dólares.
 */
export const getColumns = (monedaDe: (cuentaBancariaId: number) => string | null) => {
  const columns = [
    // Mismo texto en la celda, la búsqueda y el orden (con su `Cuenta #N`).
    columnHelper.accessor((row) => getCuentaLabel(row), {
      id: "cuenta_bancaria_alias",
      header: "Cuenta",
      cell: (info) => <ConciliacionCuentaCell conciliacion={info.row.original} />,
    }),
    // El periodo se arma de dos campos, así que la columna es de función y su
    // valor ya es el texto que se busca y se ordena.
    //
    // `timeZone: "UTC"`: las fechas llegan como "YYYY-MM-DD", que `new Date`
    // interpreta como medianoche UTC, y un navegador al oeste de Greenwich
    // pintaría el día anterior ("2026-01-01" → "31 dic 2025"). Mismo trato que
    // el resto de finanzas.
    columnHelper.accessor(
      (row) =>
        `${
          row.fecha_inicio ? formatShortDate(row.fecha_inicio, { timeZone: "UTC" }) : "—"
        } → ${
          row.fecha_final ? formatShortDate(row.fecha_final, { timeZone: "UTC" }) : "—"
        }`,
      {
        id: "periodo",
        header: "Periodo",
        cell: (info) => (
          <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
            {info.getValue()}
          </span>
        ),
      },
    ),
    columnHelper.accessor("saldo_estado_cuenta", {
      header: "Estado de cuenta",
      meta: { align: "right" },
      cell: (info) => (
        <div className="tabular-nums text-slate-600 dark:text-slate-300">
          {formatSaldo(info.getValue(), monedaDe(info.row.original.cuenta_bancaria))}
        </div>
      ),
    }),
    columnHelper.accessor("saldo_libros", {
      header: "Libros",
      meta: { align: "right" },
      cell: (info) => (
        <div className="tabular-nums text-slate-600 dark:text-slate-300">
          {formatSaldo(info.getValue(), monedaDe(info.row.original.cuenta_bancaria))}
        </div>
      ),
    }),
    // La diferencia se RECALCULA en centavos enteros a partir de los dos saldos
    // en vez de leer el `diferencia` del serializer: así la cifra y el veredicto
    // de cuadre salen del mismo cálculo, con la misma tolerancia que aplicará el
    // backend al cerrar.
    columnHelper.accessor(
      (row) => centavosAMoneda(diferenciaEnCentavos(row.saldo_estado_cuenta, row.saldo_libros)),
      {
        id: "diferencia",
        header: "Diferencia",
        meta: { align: "right" },
        cell: (info) => {
          const conciliacion = info.row.original;
          const cuadra = conciliacionCuadra(
            conciliacion.saldo_estado_cuenta,
            conciliacion.saldo_libros,
          );
          return (
            <div
              className={`tabular-nums font-medium ${
                cuadra
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
              title={cuadra ? "El periodo cuadra" : "El periodo no cuadra"}
            >
              {formatSaldo(info.getValue(), monedaDe(conciliacion.cuenta_bancaria))}
            </div>
          );
        },
      },
    ),
  ] as ColumnDef<ConciliacionBancaria>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * La cuenta filtra por `estatus` (su badge), con ficha "Estatus: …": el
 * catálogo completo y, al final, cada valor desconocido de las filas, crudo.
 * Cuenta y periodo NO van aquí: los resuelve el servidor con los controles de
 * arriba de la tabla (la cuenta es obligatoria y el periodo es un solapamiento).
 */
export const CONCILIACION_HEADER_FILTERS: Partial<
  Record<string, HeaderFilterSpec<ConciliacionBancaria>>
> = {
  cuenta_bancaria_alias: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus,
    options: optionsFromConfig(CONCILIACION_ESTATUS_CONFIG),
  },
};
