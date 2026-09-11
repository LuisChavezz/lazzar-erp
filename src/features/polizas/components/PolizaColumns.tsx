import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  BanIcon,
  CheckCircleIcon,
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
      header: "Folio",
      cell: (info) => (
        // Mismo criterio que el folio en el resto de las tablas: el identificador
        // principal abre el detalle, con la misma llamada que la acción del menú.
        <button
          type="button"
          onClick={() => onViewDetail(info.row.original.id)}
          title="Ver detalle"
          className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {/* El formulario exige folio, pero el listado también trae las pólizas
              que generó el backend y las creadas por otras vías: `folio` es
              nullable en el modelo. Se cae al `#id`, que siempre existe. */}
          {info.getValue() || `#${info.row.original.id}`}
        </button>
      ),
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
      header: () => <div className="text-right">Cargos</div>,
      cell: (info) => (
        <div className="text-right tabular-nums font-semibold text-slate-800 dark:text-white">
          {importe(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor("total_abonos", {
      header: () => <div className="text-right">Abonos</div>,
      cell: (info) => (
        <div className="text-right tabular-nums font-semibold text-slate-800 dark:text-white">
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
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: (info) => (
        <StatusBadge status={info.getValue()} config={POLIZA_ESTATUS_CONFIG} />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const { id, estatus, cuadre_correcto, total_cargos, total_abonos } =
          row.original;
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
        if (polizaEsEliminable(row.original)) {
          menuItems.push({
            label: "Eliminar borrador",
            icon: DeleteIcon,
            onSelect: () => onDelete(id),
          });
        }

        return (
          <div className="flex justify-center">
            <ActionMenu items={menuItems} />
          </div>
        );
      },
    }),
  ] as ColumnDef<Poliza>[];

  return columns;
};
