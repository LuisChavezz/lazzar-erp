import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { BanIcon, CheckCircleIcon, ViewIcon } from "@/src/components/Icons";
import { formatShortDate } from "@/src/utils/formatDate";
import { formatSaldo } from "@/src/features/bank-accounts/utils/bankAccountMoney";
import { CONCILIACION_ESTATUS_CONFIG } from "../constants/conciliacionEstatus";
import {
  centavosAMoneda,
  conciliacionCuadra,
  diferenciaEnCentavos,
} from "../schemas/bank-reconciliation.schema";
import type { ConciliacionBancaria } from "../interfaces/bank-reconciliation.interface";

const columnHelper = createColumnHelper<ConciliacionBancaria>();

/**
 * Columnas del listado de conciliaciones bancarias.
 *
 * Las acciones solo INVOCAN callbacks: los diálogos (detalle y las
 * confirmaciones de cerrar y cancelar) viven en `BankReconciliationView`. Una
 * celda se desmonta al ordenar, filtrar o paginar, y ambas mutaciones cambian
 * el `estatus`, que es justo uno de los filtros de la tabla.
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
export const getColumns = (
  onViewDetail: (conciliacion: ConciliacionBancaria) => void,
  onCerrar: (conciliacion: ConciliacionBancaria) => void,
  onCancelar: (conciliacion: ConciliacionBancaria) => void,
  monedaDe: (cuentaBancariaId: number) => string | null,
) => {
  const columns = [
    // Accessor de FUNCIÓN colapsando el vacío a `""`: el filtro global de
    // TanStack decide si una columna participa mirando solo la primera fila, y
    // un `null` (`typeof null === "object"`) la sacaría de la búsqueda en
    // TODAS. `cuenta_bancaria_alias` es nullable.
    columnHelper.accessor((row) => row.cuenta_bancaria_alias ?? "", {
      id: "cuenta_bancaria_alias",
      header: "Cuenta",
      cell: (info) => (
        <button
          type="button"
          onClick={() => onViewDetail(info.row.original)}
          title="Ver detalle"
          className="font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {info.getValue() || `#${info.row.original.cuenta_bancaria}`}
        </button>
      ),
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
      header: () => <div className="text-right">Estado de cuenta</div>,
      cell: (info) => (
        <div className="text-right tabular-nums text-slate-600 dark:text-slate-300">
          {formatSaldo(info.getValue(), monedaDe(info.row.original.cuenta_bancaria))}
        </div>
      ),
    }),
    columnHelper.accessor("saldo_libros", {
      header: () => <div className="text-right">Libros</div>,
      cell: (info) => (
        <div className="text-right tabular-nums text-slate-600 dark:text-slate-300">
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
        header: () => <div className="text-right">Diferencia</div>,
        cell: (info) => {
          const conciliacion = info.row.original;
          const cuadra = conciliacionCuadra(
            conciliacion.saldo_estado_cuenta,
            conciliacion.saldo_libros,
          );
          return (
            <div
              className={`text-right tabular-nums font-medium ${
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
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: (info) => (
        <StatusBadge status={info.getValue()} config={CONCILIACION_ESTATUS_CONFIG} />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const conciliacion = row.original;
        const esBorrador = conciliacion.estatus === "Borrador";
        const cuadra = conciliacionCuadra(
          conciliacion.saldo_estado_cuenta,
          conciliacion.saldo_libros,
        );

        const menuItems: ActionMenuItem[] = [
          {
            label: "Ver detalle",
            icon: ViewIcon,
            onSelect: () => onViewDetail(conciliacion),
          },
        ];

        // Solo un `Borrador` se cierra o se cancela. `Cerrada` y `Cancelada` son
        // terminales y quedan de solo consulta — cancelar una cerrada no
        // revertiría los movimientos que ya marcó como `Conciliado`.
        if (esBorrador) {
          menuItems.push({
            label: "Cerrar conciliación",
            icon: CheckCircleIcon,
            onSelect: () => onCerrar(conciliacion),
            // El backend rechaza el cierre descuadrado; la acción se ofrece
            // deshabilitada en vez de esconderla, para que se vea que existe y
            // por qué no está disponible todavía.
            disabled: !cuadra,
          });
          menuItems.push({
            label: "Cancelar conciliación",
            icon: BanIcon,
            onSelect: () => onCancelar(conciliacion),
          });
        }

        return (
          <div className="flex justify-center">
            <ActionMenu items={menuItems} />
          </div>
        );
      },
    }),
  ] as ColumnDef<ConciliacionBancaria>[];

  return columns;
};
