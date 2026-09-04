"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { SearchInput } from "@/src/components/SearchInput";
import { ChevronUpIcon, ChevronDownIcon, CheckCircleIcon } from "../../../components/Icons";
import type { Notificacion } from "../interfaces/notification.interface";
import {
  resolveNotificationIconVariant,
  resolveNotificationTarget,
} from "../constants/notificationTargets";
import type { NotificacionesListState } from "../hooks/useNotificaciones";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { NotificationIcon } from "./NotificationIcon";
import { NotificationsListStatus } from "./NotificationsListStatus";

interface NotificationsDialogBodyProps {
  notificaciones: Notificacion[];
  nowMs: number;
  /** Discriminador único del hook — ver `NotificacionesListState`. */
  listState: NotificacionesListState;
  error: unknown;
  onRetry: () => void;
  /** Marca una sola como leída, sin abrir su destino. */
  onMarkRead: (notificacion: Notificacion) => void;
  onMarkAllRead: () => void;
  isMarkingAll: boolean;
  /**
   * Abre el destino de la notificación. El padre es quien decide CUÁNDO
   * aplicarlo: este diálogo solo se cierra y le avisa, porque el destino de
   * `cotizacion_en_revision` es otro diálogo y no pueden encadenarse en el
   * mismo commit (ver `onCloseAutoFocus` en `Notifications`).
   */
  onActivate: (notificacion: Notificacion) => void;
}

interface NotificationsDialogProps extends NotificationsDialogBodyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
}

/**
 * Cuerpo del modal, separado del envoltorio a propósito.
 *
 * `NotificationsDialog` se monta una sola vez —el padre lo renderiza siempre,
 * con `open={false}`—, así que si el término de búsqueda y el orden vivieran
 * ahí sobrevivirían al cierre y la siguiente apertura arrancaría filtrada sin
 * motivo aparente. Aquí no: `Dialog.Content` de Radix desmonta a sus hijos al
 * cerrar, de modo que este estado se reinicia solo, venga el cierre de
 * "Cerrar", de Escape o de una activación programática. Mismo recurso que
 * `StockMovementPedidoSelectorDialog`.
 */
function NotificationsDialogBody({
  notificaciones,
  nowMs,
  listState,
  error,
  onRetry,
  onMarkRead,
  onMarkAllRead,
  isMarkingAll,
  onActivate,
}: NotificationsDialogBodyProps) {
  const [search, setSearch] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const hasUnread = notificaciones.some((notificacion) => !notificacion.leido);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? notificaciones.filter(
        (notificacion) =>
          notificacion.titulo.toLowerCase().includes(query) ||
          notificacion.mensaje.toLowerCase().includes(query) ||
          notificacion.modulo.toLowerCase().includes(query),
      )
    : notificaciones;

  const filteredAndSorted = [...filtered].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
  });

  const isReady = listState === "ready";
  const showList = isReady && filteredAndSorted.length > 0;

  /*
    Los controles se ocultan SOLO ante un resultado confirmado (`ready`), y se
    miden contra `notificaciones` SIN FILTRAR: `filteredAndSorted` también queda
    vacío cuando la búsqueda no encontró nada, y con él se ocultaría el campo en
    el que el usuario está escribiendo. Mientras carga o si la carga falló
    siguen montados, porque en esos estados la lista es `[]` y ocultarlos
    disfrazaría el fallo de bandeja vacía.
  */

  // Sin nada en el historial no hay qué buscar ni qué ordenar.
  const showControles = !isReady || notificaciones.length > 0;

  /*
    Sin no leídas la mutación no cambiaría nada. `isMarkingAll` lo mantiene
    montado mientras vuela: el optimista ya dejó todo en leído, así que sin esta
    condición el botón se desmontaría en el mismo commit del clic y su estado
    deshabilitado sería inalcanzable.
  */
  const showMarcarTodas = !isReady || hasUnread || isMarkingAll;

  return (
    <div className="space-y-4 mt-2">
      {/* Controles de búsqueda y orden */}
      {showControles && (
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por título o mensaje..."
            />
          </div>
          <button
            type="button"
            onClick={() =>
              setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
            }
            aria-label={
              sortDirection === "desc"
                ? "Ordenar de más antiguas a más recientes"
                : "Ordenar de más recientes a más antiguas"
            }
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            Ordenar:{" "}
            {sortDirection === "desc" ? (
              <ChevronDownIcon className="w-4 h-4 inline-block ml-1" aria-hidden="true" />
            ) : (
              <ChevronUpIcon className="w-4 h-4 inline-block ml-1" aria-hidden="true" />
            )}
          </button>
          {showMarcarTodas && (
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={!hasUnread || isMarkingAll}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      <div
        className="max-h-100 overflow-y-auto custom-scrollbar space-y-2"
        role="list"
        aria-label="Todas las notificaciones"
      >
        <NotificationsListStatus
          listState={listState}
          error={error}
          isEmpty={filteredAndSorted.length === 0}
          emptyMessage={
            query
              ? "No se encontraron notificaciones."
              : "No tienes notificaciones."
          }
          onRetry={onRetry}
        />

        {showList &&
          filteredAndSorted.map((notificacion) => {
            const isActionable =
              resolveNotificationTarget(notificacion) !== null;

            return (
              <div
                key={notificacion.id}
                className={`p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 flex gap-3 items-start${
                  notificacion.leido ? " opacity-60" : ""
                }`}
                role="listitem"
              >
                <NotificationIcon
                  variant={resolveNotificationIconVariant(notificacion.tipo)}
                />
                <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-2">
                  <div className="min-w-0">
                    {isActionable ? (
                      <button
                        type="button"
                        onClick={() => onActivate(notificacion)}
                        title="Ver detalle"
                        className="text-left text-sm font-semibold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer truncate max-w-full block"
                      >
                        {notificacion.titulo}
                      </button>
                    ) : (
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {notificacion.titulo}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 line-clamp-2">
                      {notificacion.mensaje}
                    </p>
                  </div>
                  <div className="flex items-end flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {!notificacion.leido ? (
                        <span
                          className="inline-block w-2 h-2 bg-red-500 rounded-full"
                          aria-hidden="true"
                        ></span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                          Leída
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {formatRelativeTime(notificacion.created_at, nowMs)}
                      </span>
                    </div>
                    {!notificacion.leido && (
                      <button
                        type="button"
                        onClick={() => onMarkRead(notificacion)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-700 px-2 py-1 rounded-full cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
                      >
                        <CheckCircleIcon className="w-3 h-3" aria-hidden="true" />
                        Marcar leída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/**
 * Lista completa de notificaciones ("Ver todas").
 *
 * La búsqueda y el orden son CLIENTE: `?search=` y `?ordering=` los acepta DRF
 * pero no hacen nada, y el endpoint devuelve el historial entero de una sola
 * vez, así que filtrar en memoria es lo correcto aquí. Ese estado vive en
 * `NotificationsDialogBody` para que Radix lo reinicie al cerrar.
 */
export function NotificationsDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
  ...bodyProps
}: NotificationsDialogProps) {
  return (
    <MainDialog
      maxWidth="720px"
      title="Todas las notificaciones"
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <NotificationsDialogBody {...bodyProps} />
    </MainDialog>
  );
}
