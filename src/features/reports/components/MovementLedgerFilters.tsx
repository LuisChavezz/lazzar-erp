"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/src/components/Button";
import { FormInput } from "@/src/components/FormInput";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { DateParamInput } from "@/src/components/DateParamInput";
import { SearchIcon } from "@/src/components/Icons";
import { WarehouseFilter } from "@/src/features/stock/components/WarehouseFilter";

interface MovementLedgerFiltersProps {
  /** Texto con que arranca la búsqueda (la última buscada). */
  initialSearch: string;
  almacenId: number | null;
  fechaInicio: string | null;
  fechaFinal: string | null;
  /** Mensaje del backend para `q` (400). */
  searchError?: string;
  /** Mensaje del backend para `almacen` (400). */
  almacenError?: string;
  /** Mensaje del backend para `fecha_inicio` / `fecha_final` (400). */
  fechaInicioError?: string;
  fechaFinalError?: string;
  /** Se invoca al enviar la búsqueda con el texto ya recortado (nunca vacío). */
  onSearch: (q: string) => void;
  onAlmacenChange: (almacenId: number | null) => void;
  onDateRangeChange: (fechaInicio: string | null, fechaFinal: string | null) => void;
}

/**
 * Barra de filtros del Auxiliar de movimientos. Controlada salvo el texto de
 * búsqueda, que solo se aplica al enviarlo (Enter o "Buscar"): cada consulta
 * con `q` puede cambiar la variante, así que no se busca mientras se teclea.
 * Almacén y fechas son opcionales; el rango va completo o vacío (eso lo exige
 * el contenedor, que no consulta con una sola fecha).
 */
export function MovementLedgerFilters({
  initialSearch,
  almacenId,
  fechaInicio,
  fechaFinal,
  searchError,
  almacenError,
  fechaInicioError,
  fechaFinalError,
  onSearch,
  onAlmacenChange,
  onDateRangeChange,
}: MovementLedgerFiltersProps) {
  const [draft, setDraft] = useState(initialSearch);
  const [emptySearch, setEmptySearch] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = draft.trim();
    if (!q) {
      setEmptySearch(true);
      return;
    }
    setEmptySearch(false);
    onSearch(q);
  };

  // Misma validación que el reporte de movimientos: un rango invertido no se
  // propaga (los `min`/`max` nativos solo cubren el calendario, no lo tecleado).
  const emitDateRange = (inicio: string | null, final: string | null) => {
    if (inicio && final && inicio > final) {
      setRangeError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setRangeError(null);
    onDateRangeChange(inicio, final);
  };

  const searchMessage = emptySearch ? "Escribe un SKU o una descripción." : searchError;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-start gap-4">
        <form onSubmit={handleSubmit} className="flex items-start gap-2 w-full sm:w-96" role="search">
          <div className="flex-1">
            <FormInput
              label="SKU o descripción"
              type="search"
              className={COMPACT_FIELD_CLS}
              placeholder="SKU, SKU de producción o descripción"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (emptySearch) setEmptySearch(false);
              }}
              error={searchMessage ? { message: searchMessage } : undefined}
            />
          </div>
          {/* Alineado con el input (la etiqueta ocupa la primera línea). */}
          <Button
            type="submit"
            variant="primary"
            className="mt-[22px]"
            leftIcon={<SearchIcon className="w-4 h-4 shrink-0" />}
          >
            Buscar
          </Button>
        </form>

        {/* Almacén OPCIONAL: sin selección, todos los almacenes. */}
        <WarehouseFilter
          value={almacenId}
          onChange={onAlmacenChange}
          allowClear
          error={almacenError}
          className={COMPACT_FIELD_CLS}
        />

        {/* Solo se propagan días completos con año plausible (ver
            `DateParamInput`): teclear el año no consulta con cada dígito. Vaciar
            un campo se confirma al salir de él. */}
        <div className="w-44">
          <DateParamInput
            label="Desde"
            name="fecha_inicio"
            className={COMPACT_FIELD_CLS}
            value={fechaInicio ?? ""}
            max={fechaFinal ?? undefined}
            onCommit={(value) => emitDateRange(value || null, fechaFinal)}
            error={fechaInicioError ? { message: fechaInicioError } : undefined}
          />
        </div>

        <div className="w-44">
          <DateParamInput
            label="Hasta"
            name="fecha_final"
            className={COMPACT_FIELD_CLS}
            value={fechaFinal ?? ""}
            min={fechaInicio ?? undefined}
            onCommit={(value) => emitDateRange(fechaInicio, value || null)}
            error={fechaFinalError ? { message: fechaFinalError } : undefined}
          />
        </div>
      </div>

      {rangeError && (
        <p className="ml-1 text-xs font-medium text-red-600 dark:text-red-400">{rangeError}</p>
      )}
    </div>
  );
}
