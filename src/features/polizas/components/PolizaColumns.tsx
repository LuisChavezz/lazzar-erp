import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { POLIZA_WRITE_PERMISSION_REASON } from "@/src/constants/financePermissions";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { BanIcon, CheckCircleIcon, DeleteIcon, ViewIcon } from "@/src/components/Icons";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  POLIZA_ESTATUS_CONFIG,
  POLIZA_TIPO_CONFIG,
} from "../constants/polizaStatus";
import {
  polizaEsEliminable,
  polizaTieneImportes,
} from "../schemas/poliza.schema";
import type { Poliza } from "../interfaces/poliza.interface";
import { usePolizaRowActionsContext } from "../hooks/usePolizaRowActions";

const columnHelper = createColumnHelper<Poliza>();

/**
 * Importe de la tabla, SIN símbolo de moneda.
 *
 * `Poliza` no declara moneda ni tiene desde dónde derivarla (ver el encabezado
 * de `poliza.interface.ts`): moneda `null`, el número con dos decimales y
 * separadores es-MX, que es lo que el dato realmente dice.
 */
const importe = (value: string): string => formatMoneyValue(value, null);

/**
 * Celda del folio: ES el menú de la fila (`FolioActionMenu`, modo folio) y
 * debajo va su estatus. "Ver detalle" es siempre la primera acción. Callbacks y
 * "en vuelo" llegan por contexto (`PolizaRowActionsProvider`), así una acción no
 * remonta las celdas.
 */
function PolizaFolioCell({ poliza }: { poliza: Poliza }) {
  const { onViewDetail, onContabilizar, onCancel, onDelete, busyIds, canWrite } =
    usePolizaRowActionsContext();
  const { id, estatus, cuadre_correcto, total_cargos, total_abonos } = poliza;
  // Una fila con una acción en vuelo no ofrece otra: el estatus que decide las
  // opciones está por cambiar.
  const busy = busyIds.includes(id);
  // Sin permiso de escritura las acciones se muestran deshabilitadas con su
  // motivo (convención de los flujos de Finanzas); el motivo del permiso manda
  // sobre los del cuadre.
  const permissionReason = canWrite ? undefined : POLIZA_WRITE_PERMISSION_REASON;

  const items: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(poliza) },
  ];

  // Contabilizar SOLO sobre borradores. El backend lo trata como no-op si ya
  // está contabilizada y lo rechaza si está cancelada.
  //
  // La opción se ofrece aunque la póliza NO pueda contabilizarse, deshabilitada
  // con el motivo en la etiqueta: quien abre el menú tiene que poder ver que la
  // acción existe y por qué no está disponible. Son DOS motivos: `cuadre_correcto`
  // da `true` con CERO movimientos (0 == 0), así que sin la comprobación de
  // importes una póliza vacía se contabilizaría —y ya no podría eliminarse—.
  if (estatus === "Borrador") {
    const motivoBloqueo = !polizaTieneImportes(total_cargos, total_abonos)
      ? "sin importes"
      : !cuadre_correcto
        ? "no cuadra"
        : null;

    items.push({
      label: motivoBloqueo ? `Contabilizar (${motivoBloqueo})` : "Contabilizar",
      icon: CheckCircleIcon,
      disabled: busy || !canWrite || motivoBloqueo !== null,
      description: permissionReason,
      onSelect: () => onContabilizar(poliza),
    });
  }

  // Cancelar sobre lo que aún puede cancelarse: un borrador (solo cambia de
  // estatus) o una contabilizada (genera su contrapóliza). Sobre una cancelada
  // es un no-op del backend.
  if (estatus !== "Cancelada") {
    items.push({
      label: "Cancelar póliza",
      icon: BanIcon,
      disabled: busy || !canWrite,
      description: permissionReason,
      onSelect: () => onCancel(poliza),
    });
  }

  // Eliminar SOLO sobre borradores capturados a mano (ver `polizaEsEliminable`).
  // A diferencia de Contabilizar, la opción se OCULTA en vez de deshabilitarse:
  // no hay nada que el usuario pueda corregir para volverla disponible.
  if (polizaEsEliminable(poliza)) {
    items.push({
      label: "Eliminar borrador",
      icon: DeleteIcon,
      disabled: busy || !canWrite,
      description: permissionReason,
      onSelect: () => onDelete(poliza),
    });
  }

  return (
    <FolioActionMenu
      // `folio` es nullable en el modelo: se cae al `#id`, que siempre existe.
      folio={poliza.folio || `#${id}`}
      items={items}
      status={<StatusBadge status={estatus} config={POLIZA_ESTATUS_CONFIG} />}
    />
  );
}

/**
 * Columnas del listado de pólizas. No reciben nada: callbacks y "en vuelo"
 * llegan al menú por `PolizaRowActionsProvider`.
 *
 * Los diálogos de detalle, contabilización, cancelación y borrado se montan en
 * `PolizaList`, no aquí: una celda se desmonta al ordenar, filtrar o paginar —las
 * mutaciones cambian el `estatus`, que es uno de los filtros, y el borrado quita
 * la fila—.
 */
export const getColumns = () => {
  const columns = [
    // `folio`, `fecha` y `concepto` son NULLABLE, y las tres se definen con un
    // accessor de función que colapsa el nulo a `""` —en vez de
    // `accessor("campo")`— por la trampa que documenta `DataTable.tsx`: el
    // `getColumnCanGlobalFilter` por defecto de TanStack decide si una columna
    // participa en la búsqueda mirando SOLO `flatRows[0]`, y como
    // `typeof null === "object"` una primera fila con el campo nulo sacaba la
    // columna de la búsqueda EN TODAS las filas. El `id` explícito conserva la
    // visibilidad y el orden de columna que la tabla persiste.
    columnHelper.accessor((row) => row.folio ?? "", {
      id: "folio",
      header: "Folio",
      size: 170,
      cell: (info) => <PolizaFolioCell poliza={info.row.original} />,
    }),
    columnHelper.accessor((row) => row.fecha ?? "", {
      id: "fecha",
      header: "Fecha",
      cell: (info) => {
        const value = info.getValue();
        return (
          // `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD" — sin esto un
          // navegador al oeste de Greenwich pinta el día anterior. Convención de
          // finanzas (CxC/CxP/pólizas). El campo es nullable en el modelo.
          <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">
            {value ? formatShortDate(value, { timeZone: "UTC" }) : "—"}
          </span>
        );
      },
    }),
    columnHelper.accessor("tipo", {
      header: "Tipo",
      cell: (info) => (
        <StatusBadge status={info.getValue()} config={POLIZA_TIPO_CONFIG} />
      ),
    }),
    columnHelper.accessor((row) => row.concepto ?? "", {
      id: "concepto",
      header: "Concepto",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("total_cargos", {
      header: "Cargos",
      meta: { align: "right" },
      cell: (info) => (
        <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
          {importe(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor("total_abonos", {
      header: "Abonos",
      meta: { align: "right" },
      cell: (info) => (
        <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
          {importe(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor("cuadre_correcto", {
      header: "Cuadre",
      cell: (info) =>
        // Lo calcula el BACKEND con la misma regla (y la misma tolerancia de un
        // centavo) que aplica al contabilizar, así que este indicador predice
        // exactamente si la acción va a pasar. No se recalcula aquí sumando las
        // líneas: sería una segunda definición que podría desincronizarse.
        info.getValue() ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Cuadra
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            No cuadra
          </span>
        ),
    }),
  ] as ColumnDef<Poliza>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * - El folio filtra por `estatus` (su badge), con ficha "Estatus: …": el
 *   catálogo completo y, al final, cada valor desconocido de las filas, crudo.
 * - El tipo, del catálogo completo (`POLIZA_TIPO_CONFIG`, la misma lista del
 *   alta).
 * - La fecha filtra por mes; es nullable, así que las filas sin fecha tienen su
 *   opción al final.
 * - El cuadre, "Cuadra / No cuadra" (el mismo `cuadre_correcto` que decide si
 *   se puede contabilizar).
 * Concepto e importes no llevan filtro: son valores libres, los cubren la
 * búsqueda y el orden.
 */
export const POLIZA_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<Poliza>>> = {
  folio: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus,
    options: optionsFromConfig(POLIZA_ESTATUS_CONFIG),
  },
  fecha: { type: "month", get: (r) => r.fecha, emptyLabel: "Sin fecha" },
  tipo: {
    type: "options",
    get: (r) => r.tipo,
    options: optionsFromConfig(POLIZA_TIPO_CONFIG),
  },
  cuadre_correcto: { type: "boolean", get: (r) => r.cuadre_correcto, yes: "Cuadra", no: "No cuadra" },
};
