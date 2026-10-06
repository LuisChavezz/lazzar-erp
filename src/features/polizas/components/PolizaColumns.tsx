import { ColumnDef, createColumnHelper, FilterFn } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import {
  BanIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DeleteIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { safeParseAmount } from "@/src/utils/formatCurrency";
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

const columnHelper = createColumnHelper<Poliza>();

const ESTATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...Object.entries(POLIZA_ESTATUS_CONFIG).map(([estatus, cfg]) => ({
    value: estatus,
    label: cfg.label ?? estatus,
    dotClassName: cfg.dot,
  })),
];

const estatusFilterFn: FilterFn<Poliza> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return row.original.estatus === filterValue;
};

const TIPO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...Object.entries(POLIZA_TIPO_CONFIG).map(([tipo, cfg]) => ({
    value: tipo,
    label: cfg.label ?? tipo,
    dotClassName: cfg.dot,
  })),
];

const tipoFilterFn: FilterFn<Poliza> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return row.original.tipo === filterValue;
};

/**
 * Importe de la tabla, SIN símbolo de moneda.
 *
 * `Poliza` no declara moneda ni tiene desde dónde derivarla (ver el encabezado
 * de `poliza.interface.ts`), así que `formatMoneyValue` pintaría su MXN por
 * defecto y afirmaría una divisa que el documento no tiene. Se muestra el número
 * con dos decimales y separadores es-MX, que es lo que el dato realmente dice.
 */
const importe = (value: string): string =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeParseAmount(value));

/**
 * Columnas del listado de pólizas.
 *
 * Las acciones solo INVOCAN callbacks: los diálogos de detalle, contabilización,
 * cancelación y borrado se montan en `PolizaList`, no aquí. Una celda se desmonta
 * al ordenar, filtrar o paginar —las mutaciones cambian el `estatus`, que es uno
 * de los filtros, y el borrado quita la fila—, así que un diálogo montado en la
 * celda desaparecería a media interacción.
 */
export const getColumns = (
  onViewDetail: (id: number) => void,
  onContabilizar: (id: number) => void,
  onCancel: (id: number) => void,
  onDelete: (id: number) => void,
) => {
  const columns = [
    // `folio`, `fecha` y `concepto` son NULLABLE, y las tres se definen con un
    // accessor de función que colapsa el nulo a `""` —en vez de
    // `accessor("campo")`— por la trampa que documenta `DataTable.tsx`: el
    // `getColumnCanGlobalFilter` por defecto de TanStack decide si una columna
    // participa en la búsqueda mirando SOLO `flatRows[0]`, y como
    // `typeof null === "object"` una primera fila con el campo nulo sacaba la
    // columna de la búsqueda EN TODAS las filas. Con el buscador prometiendo
    // "Buscar por folio o concepto...", bastaba una póliza sin concepto arriba
    // para que buscar por concepto no devolviera nada. El `id` explícito
    // conserva la visibilidad y el orden de columna que la tabla persiste.
    // Caso canónico del proyecto: `CorteMangaOrderColumns.tsx`.
    columnHelper.accessor((row) => row.folio ?? "", {
      id: "folio",
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Folio</span>
          <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
        </div>
      ),
      filterFn: estatusFilterFn,
      cell: (info) => {
        const { id, estatus, cuadre_correcto, total_cargos, total_abonos } =
          info.row.original;
        const menuItems: ActionMenuItem[] = [
          {
            label: "Ver detalle",
            icon: ViewIcon,
            onSelect: () => onViewDetail(id),
          },
        ];

        // Contabilizar SOLO sobre borradores. El backend lo trata como no-op si
        // ya está contabilizada y lo rechaza si está cancelada, así que ofrecerlo
        // en esos estados solo produciría un clic sin efecto o un error.
        //
        // La opción se ofrece aunque la póliza NO pueda contabilizarse, y se
        // deshabilita con el motivo en la etiqueta: quien abre el menú tiene que
        // poder ver que la acción existe y por qué no está disponible. Ocultarla
        // dejaría la columna "No cuadra" sin explicación de qué hacer.
        //
        // Son DOS motivos, no uno. `cuadre_correcto` da `true` con CERO
        // movimientos (0 == 0), así que sin la comprobación de importes una
        // póliza vacía se contabilizaría —cerrando como asiento un documento sin
        // un solo renglón, y ya sin poder eliminarse—. Es la misma regla que el
        // formulario aplica con `hayImportes`; aquí se evalúa sobre los totales
        // que calcula el servidor.
        if (estatus === "Borrador") {
          const motivoBloqueo = !polizaTieneImportes(total_cargos, total_abonos)
            ? "sin importes"
            : !cuadre_correcto
              ? "no cuadra"
              : null;

          menuItems.push({
            label: motivoBloqueo
              ? `Contabilizar (${motivoBloqueo})`
              : "Contabilizar",
            icon: CheckCircleIcon,
            disabled: motivoBloqueo !== null,
            onSelect: () => onContabilizar(id),
          });
        }

        // Cancelar sobre lo que aún puede cancelarse. El backend acepta cancelar
        // tanto un borrador como una póliza ya contabilizada; solo es no-op sobre
        // una ya cancelada.
        if (estatus !== "Cancelada") {
          menuItems.push({
            label: "Cancelar póliza",
            icon: BanIcon,
            onSelect: () => onCancel(id),
          });
        }

        // Eliminar SOLO sobre borradores capturados a mano (ver
        // `polizaEsEliminable`): nunca sobre una contabilizada o cancelada, ni
        // sobre el asiento automático que genera el backend al registrar una CxC.
        // A diferencia de Contabilizar, la opción se OCULTA en vez de
        // deshabilitarse, igual que en notas de crédito: no hay nada que el
        // usuario pueda corregir para volverla disponible.
        if (polizaEsEliminable(info.row.original)) {
          menuItems.push({
            label: "Eliminar borrador",
            icon: DeleteIcon,
            onSelect: () => onDelete(id),
          });
        }

        // El formulario exige folio, pero el listado también trae las pólizas
        // que generó el backend y las creadas por otras vías: `folio` es
        // nullable en el modelo. Se cae al `#id`, que siempre existe.
        const folio = info.getValue() || `#${id}`;
        const statusCfg = POLIZA_ESTATUS_CONFIG[estatus];
        return (
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusCfg?.dot ?? "bg-slate-400"}`}
              title={statusCfg?.label ?? estatus}
              aria-hidden="true"
            />
            <span className="sr-only">{statusCfg?.label ?? estatus}</span>
            <ActionMenu
              items={menuItems}
              ariaLabel={`Acciones de la póliza ${folio}`}
              align="start"
              trigger={
                <button type="button" title="Ver acciones" className="group inline-flex items-center gap-1 cursor-pointer">
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                    {folio}
                  </span>
                  <ChevronRightIcon
                    className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
                    aria-hidden="true"
                  />
                </button>
              }
            />
          </div>
        );
      },
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
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Tipo</span>
          <ColumnHeaderFilter column={column} options={TIPO_FILTER_OPTIONS} label="tipo" />
        </div>
      ),
      filterFn: tipoFilterFn,
      cell: (info) => {
        const tipo = info.getValue();
        const cfg = POLIZA_TIPO_CONFIG[tipo];
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg?.dot ?? "bg-slate-400"}`} title={cfg?.label ?? tipo} aria-hidden="true" />
            <span className="text-slate-600 dark:text-slate-300">{cfg?.label ?? tipo}</span>
          </div>
        );
      },
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
