'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { FilterIcon } from './Icons';
import { FormInput } from './FormInput';
import { DataTableModeContext } from './DataTableModeContext';
import { formatLocalDate, isCompleteDateEntry } from '@/src/utils/formatDate';

interface ColumnHeaderDateRangeFilterProps {
  /** Qué fecha se filtra, para el tooltip/aria-label del ícono y el menú. */
  label: string;
  /** Clave del filtro de servidor con el inicio del rango (`"fecha_desde"`). */
  fromKey: string;
  /** Clave del filtro de servidor con el final del rango (`"fecha_hasta"`). */
  toKey: string;
  /** Ver `ColumnHeaderFilter`: `"end"` abre el menú hacia la izquierda. */
  menuAlign?: 'start' | 'end';
}

const RANGE_ERROR = 'La fecha inicial no puede ser posterior a la final.';
const INCOMPLETE_ERROR = 'Completa la fecha o déjala vacía.';

/** Texto del rango activo para el tooltip y el `aria-label`. */
const describeRange = (from: string | undefined, to: string | undefined) => {
  if (from && to) return `${formatLocalDate(from)} – ${formatLocalDate(to)}`;
  if (from) return `desde ${formatLocalDate(from)}`;
  if (to) return `hasta ${formatLocalDate(to)}`;
  return undefined;
};

/**
 * Filtro de RANGO de fechas en un encabezado de columna, SOLO para el modo
 * servidor de `DataTable`: dos fechas libres ("Desde" y "Hasta", ambas
 * opcionales e inclusivas) que se aplican juntas a dos filtros de la lista
 * (`fromKey`/`toKey`, los nombres del endpoint). Mismo ícono y mismo resaltado
 * de columna que `ColumnHeaderFilter`.
 *
 * Las fechas se editan en un borrador y se aplican con "Aplicar" (o Enter), en
 * UNA sola escritura (`filters.onChangeMany`): aplicar cada extremo por
 * separado pasaría por un rango intermedio que la lista puede rechazar. Un
 * rango invertido o una fecha a medias no se aplica: se avisa en el menú. La
 * lista vuelve a comprobarlo (`dateRanges` de `defineServerTable`), así que un
 * rango invertido tampoco llega al backend por la URL.
 *
 * No se pinta fuera del modo servidor ni sin `onChangeMany`: filtrar por rango
 * en memoria solo vería la página actual.
 */
export function ColumnHeaderDateRangeFilter({
  label,
  fromKey,
  toKey,
  menuAlign = 'start',
}: ColumnHeaderDateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const tableMode = useContext(DataTableModeContext);
  const serverFilters = tableMode.mode === 'server' ? tableMode.filters : undefined;
  const activeFrom = serverFilters?.values[fromKey];
  const activeTo = serverFilters?.values[toKey];
  const activeLabel = describeRange(activeFrom, activeTo);
  const isActive = activeLabel !== undefined;

  const close = () => {
    setIsOpen(false);
    setError(null);
  };

  const open = () => {
    // Cada apertura parte de lo aplicado, no de un borrador abandonado.
    setDraftFrom(activeFrom ?? '');
    setDraftTo(activeTo ?? '');
    setError(null);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setError(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) fromInputRef.current?.focus();
  }, [isOpen]);

  // Mientras está abierto, el `<th>` deja de ser arrastrable: Firefox no deja
  // editar un campo dentro de un ancestro `draggable` (ver `ColumnHeaderFilter`).
  useEffect(() => {
    if (!isOpen) return;
    const draggableAncestor = containerRef.current?.closest<HTMLElement>('[draggable="true"]');
    if (!draggableAncestor) return;
    draggableAncestor.draggable = false;
    return () => {
      draggableAncestor.draggable = true;
    };
  }, [isOpen]);

  if (serverFilters?.onChangeMany === undefined) return null;
  const applyFilters = serverFilters.onChangeMany;

  /** "" (sin ese extremo) o una fecha completa, sin segmentos a medias. */
  const isUsable = (value: string, input: HTMLInputElement | null) =>
    (value === '' && !input?.validity.badInput) || isCompleteDateEntry(value);

  const apply = () => {
    if (!isUsable(draftFrom, fromInputRef.current) || !isUsable(draftTo, toInputRef.current)) {
      setError(INCOMPLETE_ERROR);
      return;
    }
    if (draftFrom && draftTo && draftFrom > draftTo) {
      setError(RANGE_ERROR);
      return;
    }
    applyFilters({ [fromKey]: draftFrom || undefined, [toKey]: draftTo || undefined });
    close();
  };

  const clear = () => {
    applyFilters({ [fromKey]: undefined, [toKey]: undefined });
    close();
  };

  const menuAlignCls = menuAlign === 'end' ? 'right-0' : 'left-0';
  // El aviso de rango invertido aparece al teclear, sin esperar a "Aplicar".
  const isDraftInverted =
    isCompleteDateEntry(draftFrom) && isCompleteDateEntry(draftTo) && draftFrom > draftTo;
  const liveError = error ?? (isDraftInverted ? RANGE_ERROR : null);

  return (
    <div
      className="relative"
      ref={containerRef}
      // El `<th>` ordena con Enter/Espacio: sin esto, teclear en el menú
      // reordenaría la columna.
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) close();
          else open();
        }}
        onMouseDown={(event) => event.stopPropagation()}
        className={`inline-flex items-center justify-center rounded p-0.5 transition-colors cursor-pointer ${
          isActive
            ? 'text-white bg-sky-500 dark:bg-sky-500'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
        aria-label={
          activeLabel ? `Filtrar por ${label} (filtro activo: ${activeLabel})` : `Filtrar por ${label}`
        }
        // Lo lee el `<th>` de `DataTable` para resaltar la columna filtrada.
        data-filter-active={isActive ? '' : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={activeLabel ? `Filtro activo: ${activeLabel}` : `Filtrar por ${label}`}
      >
        <FilterIcon className="w-3 h-3" />
      </button>
      {isOpen && (
        <div
          role="dialog"
          aria-label={`Filtrar por ${label}`}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onDragStart={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={`absolute ${menuAlignCls} top-full mt-1 w-64 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-zinc-900 shadow-xl z-30 normal-case font-normal tracking-normal p-3`}
        >
          <form
            className="space-y-3"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              apply();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                close();
              }
            }}
          >
            <FormInput
              ref={fromInputRef}
              label="Desde"
              type="date"
              name={`${fromKey}-filter`}
              value={draftFrom}
              onChange={(event) => {
                setDraftFrom(event.target.value);
                setError(null);
              }}
            />
            <FormInput
              ref={toInputRef}
              label="Hasta"
              type="date"
              name={`${toKey}-filter`}
              value={draftTo}
              onChange={(event) => {
                setDraftTo(event.target.value);
                setError(null);
              }}
            />
            {liveError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {liveError}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={clear} disabled={!isActive}>
                Limpiar
              </Button>
              <Button type="submit" variant="primary" disabled={isDraftInverted}>
                Aplicar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
