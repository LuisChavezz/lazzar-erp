"use client";

import { useState } from "react";
import { FormSelect } from "@/src/components/FormSelect";
import { ItemPickerButton } from "@/src/components/ItemPickerButton";
import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import { useProductionOrderCatalog } from "@/src/features/production-orders/hooks/useProductionOrderCatalog";
import { useMaquileros } from "@/src/features/suppliers/hooks/useMaquileros";
import type {
  SalidasMaquilaFilterKey,
  SalidasMaquilaFilterValues,
} from "../constants/salidasMaquilaTable";
import { useOpParaSalidaMaquila } from "../hooks/useOpParaSalidaMaquila";
import { SALIDA_MAQUILA_ORIGEN_VALUES, SALIDA_MAQUILA_ORIGENES } from "../constants/salidaMaquilaOrigen";
import type { SalidaMaquilaOrigen } from "../interfaces/salida-maquila.interface";

const OPTION_CLS = "text-slate-900 dark:text-white bg-white dark:bg-zinc-900";

interface SalidasMaquilaFiltersProps {
  filters: SalidasMaquilaFilterValues;
  setFilter: <K extends SalidasMaquilaFilterKey>(key: K, value: SalidasMaquilaFilterValues[K] | undefined) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  /** Folio de la OP filtrada tal como lo traen las SM cargadas (`op_folio`). */
  opFolioFromRows: string | null;
  /** ¿Ya respondió el listado filtrado? Sin filas, el folio se pide aparte. */
  rowsLoaded: boolean;
}

/**
 * Filtros del listado de SM por OP y por maquilero. Son del SERVIDOR (`op`,
 * `centro_confeccion`): cada cambio reescribe la URL y la lista se vuelve a
 * pedir. Las opciones salen de los catálogos (OP y maquileros), nunca de las
 * SM cargadas, y un id de la URL que el catálogo no trae se sigue mostrando
 * por su id en vez de aparentar "Todas".
 *
 * El nombre de la OP elegida sale de las SM filtradas (`op_folio`); si el
 * filtro no devolvió ninguna, del retrieve de esa OP (una sola, la misma
 * consulta que "Generar SM"). El catálogo completo solo se pide con el
 * selector abierto.
 *
 * El origen (OP/OB/OR) también filtra en el servidor (`?origen=`). Una OP y el
 * origen OB u OR se excluyen (no hay SM que cumpla los dos): elegir OB u OR
 * quita la OP, y con ese origen el selector de OP se desactiva.
 */
export function SalidasMaquilaFilters({
  filters,
  setFilter,
  hasActiveFilters,
  onClearFilters,
  opFolioFromRows,
  rowsLoaded,
}: SalidasMaquilaFiltersProps) {
  const [isOpPickerOpen, setIsOpPickerOpen] = useState(false);
  const { maquileros, isLoading: isMaquilerosLoading } = useMaquileros();
  const opCatalog = useProductionOrderCatalog({ enabled: isOpPickerOpen });
  const ops = opCatalog.productionOrders;
  const catalogFolio =
    filters.op !== undefined ? ops.find((op) => op.op_id === filters.op)?.folio_op : undefined;
  const needsOpRetrieve =
    filters.op !== undefined && rowsLoaded && !opFolioFromRows && catalogFolio === undefined;
  const opRetrieve = useOpParaSalidaMaquila(filters.op ?? 0, needsOpRetrieve);
  const retrievedFolio = needsOpRetrieve ? opRetrieve.data?.folio_op : undefined;

  const knownFolio = opFolioFromRows ?? catalogFolio ?? retrievedFolio;
  const isResolvingFolio = !rowsLoaded || (needsOpRetrieve && opRetrieve.isLoading);
  const selectedOpLabel =
    filters.op === undefined
      ? null
      : (knownFolio ?? (isResolvingFolio ? "Cargando OP..." : `OP #${filters.op}`));

  const opNoAplica = filters.origen !== undefined && filters.origen !== "OP";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <FormSelect
        label="Origen"
        value={filters.origen ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          const origen = (SALIDA_MAQUILA_ORIGEN_VALUES as readonly string[]).includes(value)
            ? (value as SalidaMaquilaOrigen)
            : undefined;
          if (origen !== undefined && origen !== "OP") setFilter("op", undefined);
          setFilter("origen", origen);
        }}
      >
        <option value="" className={OPTION_CLS}>
          Todos los orígenes
        </option>
        {SALIDA_MAQUILA_ORIGEN_VALUES.map((origen) => (
          <option key={origen} value={origen} className={OPTION_CLS}>
            {SALIDA_MAQUILA_ORIGENES[origen].etiqueta}
          </option>
        ))}
      </FormSelect>

      <div>
        <ItemPickerButton
          label="Orden de producción"
          placeholder={opNoAplica ? "Solo con origen OP" : "Todas las OP"}
          selectedLabel={selectedOpLabel}
          disabled={opNoAplica && filters.op === undefined}
          onClick={() => setIsOpPickerOpen(true)}
        />
        {opNoAplica && filters.op !== undefined && (
          <p className="ml-1 mt-1 text-xs text-amber-700 dark:text-amber-300">
            Una OP no tiene salidas de origen {filters.origen}: quita la OP o el origen.
          </p>
        )}
        {filters.op !== undefined && (
          <button
            type="button"
            onClick={() => setFilter("op", undefined)}
            className="ml-1 mt-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
          >
            Todas las OP
          </button>
        )}
      </div>

      <FormSelect
        label="Maquilero"
        value={filters.centro_confeccion !== undefined ? String(filters.centro_confeccion) : ""}
        disabled={isMaquilerosLoading}
        onChange={(event) => {
          const id = Number(event.target.value);
          setFilter("centro_confeccion", Number.isInteger(id) && id > 0 ? id : undefined);
        }}
      >
        <option value="" className={OPTION_CLS}>
          Todos los maquileros
        </option>
        {/* Un maquilero de la URL que el catálogo no trae (ya no es maquilero)
            se conserva como opción para que el select no aparente "Todos". */}
        {filters.centro_confeccion !== undefined &&
          !maquileros.some((m) => m.id === filters.centro_confeccion) && (
            <option value={String(filters.centro_confeccion)} className={OPTION_CLS}>
              Maquilero #{filters.centro_confeccion}
            </option>
          )}
        {maquileros.map((m) => (
          <option key={m.id} value={String(m.id)} className={OPTION_CLS}>
            {m.nombre}
          </option>
        ))}
      </FormSelect>

      <div className="flex items-end">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mb-3 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <MainDialog
        open={isOpPickerOpen}
        onOpenChange={setIsOpPickerOpen}
        title=""
        maxWidth="560px"
        showCloseButton={false}
      >
        {/* Se monta solo abierto: la selección tentativa arranca en la vigente. */}
        {isOpPickerOpen && (
          <SingleSelectPickerDialogContent
            title="Filtrar por orden de producción"
            subtitle="Órdenes de producción de tus sucursales"
            items={ops}
            isLoading={opCatalog.isLoading}
            isError={opCatalog.isInitialError}
            errorMessage="No se pudo cargar el catálogo de órdenes de producción."
            searchPlaceholder="Buscar por folio de OP o de pedido..."
            filterPredicate={(op, term) =>
              op.folio_op.toLowerCase().includes(term) || (op.pedido_folio ?? "").toLowerCase().includes(term)
            }
            getKey={(op) => op.op_id}
            selectedKey={filters.op ?? null}
            pinSelected
            emptyMessage="No hay órdenes de producción."
            noResultsMessage="No se encontraron órdenes de producción"
            renderContent={(op) => (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{op.folio_op}</p>
                {op.pedido_folio && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Pedido {op.pedido_folio}</p>
                )}
              </div>
            )}
            onConfirm={(op) => {
              setFilter("op", op.op_id);
              setIsOpPickerOpen(false);
            }}
            onCancel={() => setIsOpPickerOpen(false)}
          />
        )}
      </MainDialog>
    </div>
  );
}
