"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, VisuallyHidden } from "@radix-ui/themes";
import { LoadingSpinnerIcon, SearchIcon } from "@/src/components/Icons";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { QuoteDetailByIdDialog } from "@/src/features/quotes/components/QuoteDetailByIdDialog";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { useGlobalSearchModal } from "../hooks/useGlobalSearchModal";
import {
  SEARCH_MIN_NAME_LENGTH,
  SEARCH_MIN_QUERY_LENGTH,
  getSearchApertura,
  getSearchEntityIcon,
} from "../constants/globalSearch";
import type { GlobalSearchResult } from "../interfaces/global-search.interface";

/** id de la fila activa, para `aria-activedescendant` del combobox. */
const optionId = (index: number) => `global-search-option-${index}`;

/**
 * Paleta de búsqueda global (estilo command palette).
 *
 * Se abre desde el botón de búsqueda del header —único punto de entrada, no hay
 * atajo de teclado—; el estado lo lleva `GlobalSearchProvider`, que la monta una
 * sola vez en el layout de (Main) para que esté disponible desde cualquier ruta.
 *
 * Se usa `Dialog` de Radix Themes DIRECTO y no `MainDialog`: ese envoltorio
 * fuerza un título visible, un pie con botón rojo "Cerrar" y bloquea el cierre
 * al hacer clic fuera —tres cosas que una paleta no quiere—.
 *
 * Los resultados llegan YA agrupados y YA filtrados por permiso: el frontend no
 * vuelve a filtrar nada, solo itera `grupos` (de longitud variable) en el orden
 * en que vienen. La navegación por teclado corre sobre un índice PLANO calculado
 * al aplanar los grupos, de modo que ↑/↓ cruzan de un grupo al siguiente sin
 * saltos y con vuelta circular.
 */
export function GlobalSearchPalette() {
  const { isOpen, close } = useGlobalSearchModal();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  /** Cotización cuyo diálogo está abierto. `null` mantiene su consulta apagada. */
  const [quoteId, setQuoteId] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /** Cotización elegida a la espera de que la paleta termine de cerrarse. */
  const pendingQuoteRef = useRef<number | null>(null);
  /**
   * Última posición REAL del puntero. Al desplazarse la lista con el teclado, el
   * navegador vuelve a emitir eventos de ratón sobre la fila que queda bajo un
   * cursor inmóvil; se comparan las coordenadas para distinguir ese eco de un
   * movimiento de verdad y no dejar que el ratón robe la selección.
   */
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  const {
    data,
    groups,
    debouncedQuery,
    isQueryEnabled,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGlobalSearch(query);

  // Longitudes mínimas: manda el servidor; las constantes solo cubren el hueco
  // hasta que llega la primera respuesta.
  const minLength = data?.longitud_minima ?? SEARCH_MIN_QUERY_LENGTH;
  const minNameLength = data?.longitud_minima_nombre ?? SEARCH_MIN_NAME_LENGTH;

  // ── Índice plano sobre todos los grupos ─────────────────────────────────────
  // Las filas se numeran en el MISMO orden en que se pintan, así el índice de
  // teclado y el orden visual no pueden divergir. Se deriva sin mutar nada
  // durante el render —el offset de un grupo es la suma de los anteriores—: un
  // contador mutable compartido entre el `map` y el total dependería de cómo el
  // React Compiler memoriza la reasignación de una variable externa.
  const flatResults = groups.flatMap((group) => group.resultados);
  const totalResults = flatResults.length;
  const groupStarts = groups.map((_, groupIndex) =>
    groups
      .slice(0, groupIndex)
      .reduce((count, previous) => count + previous.resultados.length, 0),
  );

  // El índice se acota al render actual: los resultados pueden encoger entre una
  // respuesta y la siguiente mientras el usuario sigue tecleando.
  const safeIndex = totalResults === 0 ? -1 : Math.min(activeIndex, totalResults - 1);

  // Cada búsqueda nueva vuelve a resaltar la primera fila, para que Enter abra
  // el mejor resultado sin tener que pulsar ↓ antes. Se ajusta DURANTE el render
  // —el patrón que React documenta para "resetear estado cuando cambia una
  // entrada"— y no desde un efecto, que provocaría un render en cascada.
  const [indexedQuery, setIndexedQuery] = useState(debouncedQuery);
  if (indexedQuery !== debouncedQuery) {
    setIndexedQuery(debouncedQuery);
    setActiveIndex(0);
  }

  // La fila activa se mantiene visible al navegar con el teclado. Este efecto sí
  // lo es de verdad: sincroniza el scroll del DOM, no estado de React.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: "nearest" });
  }, [safeIndex]);

  /**
   * Cierra la paleta y la deja lista para la próxima apertura. El reseteo vive
   * aquí —en el manejador— y no en un efecto sobre `isOpen`: el estado se limpia
   * en el mismo gesto que cierra, sin un render extra.
   */
  const cerrarYLimpiar = () => {
    close();
    setQuery("");
    setActiveIndex(0);
  };

  // ── Apertura del resultado ──────────────────────────────────────────────────
  const handleSelect = (result: GlobalSearchResult) => {
    const apertura = getSearchApertura(result.tipo);
    // Entidad que el backend ya devuelve pero el frontend aún no sabe abrir: no
    // se navega a ninguna parte ni se cierra la paleta.
    if (!apertura) return;

    cerrarYLimpiar();

    switch (apertura) {
      case "ruta-pedido":
        // `?from=home` es una llave declarada en `BACK_TARGETS` del detalle de
        // pedido y apunta al Home, el único destino que no exige permiso de
        // módulo. Desde la búsqueda no hay un listado de origen al que volver
        // —se puede abrir desde cualquier ruta—, así que cualquier otra llave
        // arriesgaría un "Volver" que el proxy rebotaría.
        router.push(`/orders/${result.id}?from=home`);
        break;
      case "ruta-cliente":
        router.push(`/sales/customers/${result.id}`);
        break;
      case "dialogo-cotizacion":
        // La cotización no tiene ruta de detalle: se abre el mismo diálogo
        // self-fetching que usa el pedido 360°. Solo se ANOTA aquí; lo abre
        // `onCloseAutoFocus`, cuando la paleta ya se desmontó de verdad.
        pendingQuoteRef.current = result.id;
        break;
    }
  };

  // ── Navegación por teclado ──────────────────────────────────────────────────
  // Escape lo maneja Radix (cierra el diálogo), no hace falta interceptarlo.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (totalResults === 0) return;

    // Las flechas usan la forma funcional —y acotan `prev` ellas mismas— para no
    // perder pulsaciones: con el teclado repitiendo, dos `keydown` pueden
    // procesarse en el mismo lote y un valor calculado en el render anterior
    // haría que la segunda escribiera el mismo índice que la primera.
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => {
          const current = Math.min(prev, totalResults - 1);
          return current < totalResults - 1 ? current + 1 : 0;
        });
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => {
          const current = Math.min(prev, totalResults - 1);
          return current > 0 ? current - 1 : totalResults - 1;
        });
        break;
      case "Enter": {
        event.preventDefault();
        const activeResult = flatResults[safeIndex];
        if (activeResult) handleSelect(activeResult);
        break;
      }
    }
  };

  /**
   * El ratón activa una fila solo cuando el puntero se MUEVE de verdad. Se usa
   * `mousemove` y no `mouseenter` porque el eco que dispara el navegador tras
   * desplazar la lista llega con las mismas coordenadas: comparándolas, la
   * navegación por teclado no pierde el resaltado bajo un cursor inmóvil.
   */
  const handleRowPointerMove = (event: React.MouseEvent, index: number) => {
    const { clientX, clientY } = event;
    const last = pointerRef.current;
    if (last && last.x === clientX && last.y === clientY) return;
    pointerRef.current = { x: clientX, y: clientY };
    setActiveIndex(index);
  };

  return (
    <>
      <Dialog.Root
        open={isOpen}
        onOpenChange={(next) => {
          if (!next) cerrarYLimpiar();
        }}
      >
        <Dialog.Content
          maxWidth="640px"
          className="p-0! overflow-hidden bg-white! dark:bg-zinc-900! dark:text-white!"
          onOpenAutoFocus={(event) => {
            // El foco va al input y no al primer elemento enfocable que Radix
            // encuentre: en una paleta se escribe de inmediato.
            event.preventDefault();
            // Al reabrir se descarta cualquier cotización que quedara anotada:
            // si el usuario vuelve a la paleta en vez de dejarla cerrarse,
            // cambió de idea, y abrir el detalle después dejaría dos diálogos.
            pendingQuoteRef.current = null;
            inputRef.current?.focus();
          }}
          onCloseAutoFocus={() => {
            // Radix lanza esto al DESMONTAR el contenido, ya terminada la
            // animación de salida: es el punto exacto en que la paleta ha
            // dejado de existir y se puede montar el detalle de la cotización
            // sin que los dos diálogos solapen su bloqueo del `body`. Se
            // secuencia sobre el evento real en vez de adivinar una espera.
            const pending = pendingQuoteRef.current;
            if (pending === null) return;
            pendingQuoteRef.current = null;
            setQuoteId(pending);
          }}
        >
          <VisuallyHidden>
            <Dialog.Title>Búsqueda global</Dialog.Title>
            <Dialog.Description>
              Busca en todo el sistema y abre el detalle del resultado.
            </Dialog.Description>
          </VisuallyHidden>

          {/* ── Campo de búsqueda ── */}
          <div className="flex items-center gap-3 border-b border-slate-200/70 px-4 dark:border-white/10">
            <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar en el sistema..."
              aria-label="Buscar en el sistema"
              autoComplete="off"
              role="combobox"
              // La zona de resultados existe SIEMPRE mientras la paleta está
              // abierta —pinta la pista, el error, el vacío o las filas—, así
              // que el popup siempre está desplegado y `aria-controls` siempre
              // resuelve. Atarlo a `totalResults > 0` anunciaba "contraído"
              // con un popup visible y dejaba el IDREF colgando.
              aria-expanded
              aria-controls="global-search-results"
              aria-activedescendant={safeIndex >= 0 ? optionId(safeIndex) : undefined}
              className="h-14 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
            {/* `isFetching` y no `isLoading`: con `keepPreviousData` la lista
                anterior sigue en pantalla mientras llega la nueva, y este
                indicador es lo único que delata que hay una petición en vuelo. */}
            {isFetching && (
              <LoadingSpinnerIcon
                className="h-4 w-4 shrink-0 animate-spin text-slate-400"
                aria-hidden="true"
              />
            )}
          </div>

          {/* ── Resultados ── */}
          {/* Contenedor SIEMPRE presente: es el popup al que apunta el
              `aria-controls` del combobox, pinte lo que pinte dentro. */}
          <div
            ref={listRef}
            id="global-search-results"
            className="max-h-[min(60vh,26rem)] overflow-y-auto p-2"
          >
            {!isQueryEnabled ? (
              <p className="px-3 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                Escribe al menos {minLength} caracteres para buscar.
              </p>
            ) : isError ? (
              <p className="m-1 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {extractErrorMessage(error, "No se pudo buscar. Intenta de nuevo.")}
              </p>
            ) : isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
                <LoadingSpinnerIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
                Buscando...
              </div>
            ) : totalResults === 0 ? (
              <p className="px-3 py-10 text-center text-sm italic text-slate-400 dark:text-slate-500">
                Sin resultados para &ldquo;{debouncedQuery}&rdquo;.
              </p>
            ) : (
              // El `listbox` solo existe cuando hay opciones: los estados de
              // arriba (pista, error, vacío) son texto, no opciones, y colgarlos
              // de un listbox los dejaría fuera del lector de pantalla.
              <div role="listbox" aria-label="Resultados de la búsqueda">
                {/* Se itera lo que llegue: `grupos` solo trae las entidades que
                    el usuario puede ver, así que su longitud es variable. */}
                {groups.map((group, groupIndex) => (
                  <section
                    key={group.tipo}
                    role="group"
                    aria-labelledby={`global-search-group-${group.tipo}`}
                    className="mb-1 last:mb-0"
                  >
                    <h3
                      id={`global-search-group-${group.tipo}`}
                      className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
                    >
                      {group.etiqueta}
                    </h3>

                    {group.resultados.map((result, rowIndex) => {
                      const index = groupStarts[groupIndex] + rowIndex;
                      const Icon = getSearchEntityIcon(result.tipo);
                      const isActive = index === safeIndex;
                      const canOpen = getSearchApertura(result.tipo) !== null;

                      return (
                        <button
                          key={`${result.tipo}-${result.id}`}
                          id={optionId(index)}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          aria-disabled={!canOpen}
                          tabIndex={-1}
                          data-active={isActive}
                          onMouseMove={(event) => handleRowPointerMove(event, index)}
                          onClick={() => handleSelect(result)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                            canOpen ? "cursor-pointer" : "cursor-default opacity-60"
                          } ${isActive ? "bg-sky-50 dark:bg-sky-500/10" : ""}`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive
                                ? "text-sky-600 dark:text-sky-400"
                                : "text-slate-400"
                            }`}
                            aria-hidden="true"
                          />

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-100">
                              {result.titulo}
                            </span>
                            {result.subtitulo && (
                              <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                                {result.subtitulo}
                              </span>
                            )}
                          </span>

                          {/* `codigo` llega en `null` para cotización: se omite
                              sin marcador de posición. */}
                          {result.codigo && (
                            <span className="shrink-0 font-mono text-xs text-slate-400 dark:text-slate-500">
                              {result.codigo}
                            </span>
                          )}
                          {result.estatus && (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-300">
                              {result.estatus}
                            </span>
                          )}

                          {/* Entidad que el backend ya devuelve pero el frontend
                              todavía no sabe abrir: se dice, en vez de dejar que
                              Enter no haga nada sin explicación. */}
                          {!canOpen && (
                            <span className="shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:border-white/10 dark:text-slate-500">
                              No disponible
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {group.hay_mas && (
                      <p
                        role="presentation"
                        className="px-3 pb-1 pt-1.5 text-[11px] text-slate-400 dark:text-slate-500"
                      >
                        Hay más resultados en este grupo. Afina la búsqueda.
                      </p>
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>

          {/* ── Pie: ayudas de teclado ── */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-200/70 px-4 py-2.5 text-[11px] text-slate-400 dark:border-white/10 dark:text-slate-500">
            <span>
              <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd>{" "}
              navegar · <kbd className="font-sans">Enter</kbd> abrir ·{" "}
              <kbd className="font-sans">Esc</kbd> cerrar
            </span>
            {/* El backend solo busca en los campos de NOMBRE a partir de
                `longitud_minima_nombre`; por debajo, decirlo evita que el
                usuario crea que el registro no existe. */}
            {isQueryEnabled && debouncedQuery.length < minNameLength && (
              <span className="text-right">
                Con menos de {minNameLength} caracteres solo se buscan códigos y
                folios.
              </span>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/*
        El detalle de cotización NO es una ruta: es este diálogo self-fetching por
        id, el mismo que abre "Documentos relacionados" del pedido 360°. Vive
        FUERA del `Dialog.Root` de la paleta —como hermano— para que nunca haya
        dos diálogos anidados.
      */}
      <QuoteDetailByIdDialog
        orderId={quoteId}
        open={quoteId !== null}
        onOpenChange={(next) => {
          if (!next) setQuoteId(null);
        }}
      />
    </>
  );
}
