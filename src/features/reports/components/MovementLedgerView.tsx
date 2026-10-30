"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { Button } from "@/src/components/Button";
import { DataTable } from "@/src/components/DataTable";
import { ArrowLeftIcon } from "@/src/components/Icons";
import { useMovementLedger } from "@/src/features/stock/hooks/useMovementLedger";
import {
  isResolvedMovementLedger,
  type MovementLedgerTarget,
  type MovementLedgerVariant,
} from "@/src/features/stock/interfaces/movement-ledger.interface";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { MovementLedgerFilters } from "./MovementLedgerFilters";
import { MovementLedgerOptionsDialog } from "./MovementLedgerOptionsDialog";
import { MovementLedgerSummary } from "./MovementLedgerSummary";
import { getMovementLedgerColumns } from "./MovementLedgerColumns";

interface MovementLedgerViewProps {
  /** Vuelve al menú de reportes. */
  onBack: () => void;
}

/** Campos de la barra de filtros que el backend puede rechazar con un 400. */
type MovementLedgerField = "q" | "fecha_inicio" | "fecha_final";

/** Mensaje del backend por campo, solo en un 400 (`{"campo": "mensaje"}`). */
const fieldErrorOf = (error: unknown, field: MovementLedgerField): string | undefined =>
  isAxiosError(error) && error.response?.status === 400
    ? drfFieldMessage(error, field)
    : undefined;

/**
 * Auxiliar de movimientos (kardex de una variante): búsqueda → (opciones) →
 * encabezado de la variante + totales + movimientos.
 *
 * La consulta va por `q` mientras la búsqueda no resuelve una variante. En
 * cuanto hay kardex, cambiar almacén o fechas lo vuelve a pedir por
 * `producto_variante` (la variante ya está elegida; repetir `q` podría
 * resolver otra si el catálogo cambió). Una búsqueda nueva vuelve a `q`.
 *
 * La tabla queda montada en cuanto hay una búsqueda (rango a medias, opciones,
 * carga, error o vacío): así conserva columnas visibles, búsqueda interna y
 * página. Sus filas y los totales solo se muestran con un kardex vigente de los
 * filtros elegidos.
 */
export function MovementLedgerView({ onBack }: MovementLedgerViewProps) {
  const [target, setTarget] = useState<MovementLedgerTarget | null>(null);
  const [searchedText, setSearchedText] = useState("");
  // Variante que resolvió la búsqueda por `q` vigente. Se recuerda aparte de
  // la consulta porque esta puede quedar sin datos (rango a medias) antes del
  // siguiente cambio de filtro, que debe ir ya por `producto_variante`.
  const [resolvedVariantId, setResolvedVariantId] = useState<number | null>(null);
  const [almacenId, setAlmacenId] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string | null>(null);
  const [fechaFinal, setFechaFinal] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // El backend exige las dos fechas juntas: con una sola no se consulta.
  const rangeComplete = (fechaInicio === null) === (fechaFinal === null);

  const { ledger, isLoading, isFetching, isPlaceholderData, isInitialError, error, refetch } =
    useMovementLedger(
      target && rangeComplete
        ? {
            ...target,
            almacen: almacenId ?? undefined,
            fecha_inicio: fechaInicio ?? undefined,
            fecha_final: fechaFinal ?? undefined,
          }
        : null,
    );

  // Ni totales ni filas de un contexto que no es el elegido: con rango a
  // medias no hay consulta, y tras un error inicial lo que quede en `ledger`
  // sería de otros filtros.
  const current = rangeComplete && !isInitialError ? ledger : undefined;
  const resolved = current && isResolvedMovementLedger(current) ? current : undefined;
  const options = current && !isResolvedMovementLedger(current) ? current.opciones : undefined;
  const hasOptions = options !== undefined && options.length > 0;

  // Ajuste de estado durante el render (no en un efecto): en cuanto la
  // búsqueda por `q` resuelve una variante, se recuerda su id.
  const searchResolvedId =
    target?.q !== undefined && resolved ? resolved.variante.producto_variante_id : null;
  if (searchResolvedId !== null && searchResolvedId !== resolvedVariantId) {
    setResolvedVariantId(searchResolvedId);
  }

  // Fija la variante ya resuelta antes de cambiar un filtro, para que la
  // siguiente consulta vaya por `producto_variante` y no repita la búsqueda.
  const pinResolvedVariant = () => {
    if (target?.q !== undefined && resolvedVariantId !== null) {
      setTarget({ producto_variante: resolvedVariantId });
    }
  };

  const handleSearch = (q: string) => {
    setTarget({ q });
    setSearchedText(q);
    setResolvedVariantId(null);
    setOptionsOpen(true);
  };

  const handleChooseOption = (option: MovementLedgerVariant) => {
    setTarget({ producto_variante: option.producto_variante_id });
  };

  const handleAlmacenChange = (id: number | null) => {
    pinResolvedVariant();
    setAlmacenId(id);
  };

  const handleDateRangeChange = (inicio: string | null, final: string | null) => {
    pinResolvedVariant();
    setFechaInicio(inicio);
    setFechaFinal(final);
  };

  const isNotFound = isInitialError && isNotFoundError(error);
  const fieldErrors = {
    q: fieldErrorOf(error, "q"),
    fecha_inicio: fieldErrorOf(error, "fecha_inicio"),
    fecha_final: fieldErrorOf(error, "fecha_final"),
  };
  const hasFieldError = Object.values(fieldErrors).some(Boolean);
  const errorMessage = isNotFound
    ? "La variante ya no está disponible o no pertenece a tu empresa. Búscala de nuevo."
    : hasFieldError
      ? "Revisa los filtros marcados."
      : extractErrorMessage(error, "No se pudo generar el auxiliar.");

  const emptyMessage = !rangeComplete
    ? "Completa el rango de fechas para ver los movimientos."
    : hasOptions
      ? "Elige una variante para ver sus movimientos."
      : options !== undefined
        ? `Sin resultados para "${searchedText}".`
        : "La variante no tiene movimientos con estos filtros.";

  return (
    <div className="w-full space-y-8">
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit items-center gap-2 cursor-pointer rounded-full bg-slate-50 px-4 py-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-sky-500 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Volver a reportes</span>
        </button>
        <p className="text-slate-500 dark:text-slate-400">
          Auxiliar de movimientos (kardex) de un SKU. Busca por SKU, SKU de
          producción o descripción; el almacén y el rango de fechas son
          opcionales.
        </p>
      </div>

      <MovementLedgerFilters
        initialSearch={searchedText}
        almacenId={almacenId}
        fechaInicio={fechaInicio}
        fechaFinal={fechaFinal}
        searchError={fieldErrors.q}
        fechaInicioError={fieldErrors.fecha_inicio}
        fechaFinalError={fieldErrors.fecha_final}
        onSearch={handleSearch}
        onAlmacenChange={handleAlmacenChange}
        onDateRangeChange={handleDateRangeChange}
      />

      {target === null ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Busca un SKU para ver su auxiliar de movimientos.
        </p>
      ) : (
        <div className="space-y-6">
          {!rangeComplete && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Completa las dos fechas del rango, o deja ambas vacías para ver todo el historial.
            </p>
          )}

          {hasOptions && (
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black p-6">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {`"${searchedText}" coincide con ${options.length} variantes. Elige una para ver su auxiliar.`}
              </p>
              <Button variant="primary" onClick={() => setOptionsOpen(true)}>
                Elegir variante
              </Button>
              <MovementLedgerOptionsDialog
                open={optionsOpen}
                onOpenChange={setOptionsOpen}
                query={searchedText}
                options={options}
                onConfirm={handleChooseOption}
              />
            </div>
          )}

          {/* Al cambiar almacén o fechas se sigue viendo el kardex anterior de
              la misma variante, atenuado, hasta que llega el nuevo. */}
          {resolved && (
            <div
              className={
                isPlaceholderData
                  ? "blur-sm pointer-events-none select-none transition-[filter] duration-200"
                  : "transition-[filter] duration-200"
              }
            >
              <MovementLedgerSummary variante={resolved.variante} resumen={resolved.resumen} />
            </div>
          )}

          {/* `DataTable` queda montado (alterna solo su cuerpo). Filas en el
              orden del backend: ninguna columna ordena. */}
          <DataTable
            columns={getMovementLedgerColumns()}
            data={resolved?.results ?? []}
            searchPlaceholder="Buscar en los movimientos..."
            emptyMessage={emptyMessage}
            isLoadingOverlay={isPlaceholderData}
            loadingTitle="Actualizando auxiliar"
            loadingMessage="Cargando los movimientos con los filtros elegidos."
            // Con rango a medias la consulta está deshabilitada: `refetch()` la
            // dispararía igual, sin parámetros.
            onRefetch={rangeComplete ? () => refetch() : undefined}
            isRefetching={isFetching}
            isLoading={rangeComplete && isLoading}
            isError={rangeComplete && isInitialError}
            errorTitle={isNotFound ? "Variante no disponible" : "Error al generar el auxiliar"}
            errorMessage={errorMessage}
            loadingAriaLabel="Generando auxiliar de movimientos"
            defaultPageSize={50}
          />
        </div>
      )}
    </div>
  );
}
