"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QuoteDetailByIdDialog } from "@/src/features/quotes/components/QuoteDetailByIdDialog";
import { BellIcon } from "../../../components/Icons";
import type { Notificacion } from "../interfaces/notification.interface";
import {
  resolveNotificationTarget,
  type NotificationTarget,
} from "../constants/notificationTargets";
import { useNotificaciones } from "../hooks/useNotificaciones";
import { useMarcarNotificacionLeida } from "../hooks/useMarcarNotificacionLeida";
import { useMarcarTodasLeidas } from "../hooks/useMarcarTodasLeidas";
import { NotificationItem } from "./NotificationItem";
import { NotificationsDialog } from "./NotificationsDialog";
import { NotificationsListStatus } from "./NotificationsListStatus";

/**
 * Cuántas notificaciones muestra el dropdown.
 *
 * El panel mide `w-80` (320px) y la lista `max-h-96` (384px). Con el mensaje
 * limitado a dos líneas cada fila queda en ~96px, así que 4 caben completas y
 * la quinta asoma: es el corte que llena el panel y deja visible que hay más,
 * empujando a "Ver todas" sin que la lista se vuelva un scroll largo dentro de
 * un dropdown. El recorte es del cliente —el endpoint no tiene parámetro de
 * límite—.
 */
const DROPDOWN_LIMIT = 5;

export const Notifications = () => {
  const router = useRouter();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [quoteId, setQuoteId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  /**
   * Destino pendiente de aplicar cuando la activación viene del modal: el
   * destino de `cotizacion_en_revision` es otro diálogo y abrirlo en el mismo
   * commit en que se cierra el modal deja a Radix con dos `Dialog.Root`
   * solapados. Se aplica en `onCloseAutoFocus`, ya desmontado el modal.
   */
  const pendingTargetRef = useRef<NotificationTarget | null>(null);

  // La consulta solo existe mientras alguna superficie está abierta: montar la
  // campana en el header no dispara ningún fetch.
  const { notificaciones, listState, error, dataUpdatedAt, refetch } =
    useNotificaciones(isNotifOpen || isDialogOpen);

  const marcarLeida = useMarcarNotificacionLeida();
  const marcarTodas = useMarcarTodasLeidas();

  const hasUnread = notificaciones.some((notificacion) => !notificacion.leido);
  const visibles = notificaciones.slice(0, DROPDOWN_LIMIT);
  const isReady = listState === "ready";
  const showList = isReady && visibles.length > 0;

  /*
    Los controles que operan sobre la lista se ocultan SOLO ante un resultado
    confirmado (`ready`). Mientras carga o si la carga falló siguen montados: en
    esos estados `notificaciones` es `[]` y ocultarlos convertiría un fallo en
    un falso "no tienes notificaciones" sin salida.
  */

  // Con la lista vacía no hay nada que ver en el modal.
  const showVerTodas = !isReady || notificaciones.length > 0;

  /*
    Sin no leídas la mutación no cambiaría nada. `marcarTodas.isPending` lo
    mantiene montado mientras vuela: el optimista de `onMutate` ya dejó todo en
    leído, así que sin esta condición el botón se desmontaría en el mismo commit
    del clic y su estado deshabilitado sería inalcanzable.
  */
  const showMarcarTodas = !isReady || hasUnread || marcarTodas.isPending;

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const applyTarget = (target: NotificationTarget) => {
    if (target.kind === "route") {
      router.push(target.href);
      return;
    }
    // La cotización no tiene ruta de detalle: se abre el mismo diálogo
    // self-fetching que usan la paleta global y el pedido 360°.
    setQuoteId(target.quoteId);
  };

  /**
   * Marca como leída y abre el destino, en ese orden y SIN esperar a la
   * mutación: el optimista ya atenuó la fila, así que la navegación no tiene
   * por qué bloquearse contra la red.
   */
  const markThenGo = (
    notificacion: Notificacion,
    apply: (target: NotificationTarget) => void,
  ) => {
    const target = resolveNotificationTarget(notificacion);
    if (!target) return; // `tipo` sin destino conocido: no navega.

    if (!notificacion.leido) marcarLeida.mutate(notificacion.id);
    apply(target);
  };

  const handleActivateFromDropdown = (notificacion: Notificacion) => {
    markThenGo(notificacion, (target) => {
      setIsNotifOpen(false);
      applyTarget(target);
    });
  };

  const handleActivateFromDialog = (notificacion: Notificacion) => {
    markThenGo(notificacion, (target) => {
      pendingTargetRef.current = target;
      setIsDialogOpen(false);
    });
  };

  const handleDialogCloseAutoFocus = () => {
    const pending = pendingTargetRef.current;
    if (!pending) return;
    pendingTargetRef.current = null;
    applyTarget(pending);
  };

  return (
    <div className="relative">
      <NotificationsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        notificaciones={notificaciones}
        nowMs={dataUpdatedAt}
        listState={listState}
        error={error}
        onRetry={() => void refetch()}
        onMarkRead={(notificacion) => marcarLeida.mutate(notificacion.id)}
        onMarkAllRead={() => marcarTodas.mutate()}
        isMarkingAll={marcarTodas.isPending}
        onActivate={handleActivateFromDialog}
        onCloseAutoFocus={handleDialogCloseAutoFocus}
      />

      {/*
        El detalle de cotización vive FUERA del modal —como hermano— para que
        nunca haya dos diálogos anidados.
      */}
      <QuoteDetailByIdDialog
        orderId={quoteId}
        open={quoteId !== null}
        onOpenChange={(next) => {
          if (!next) setQuoteId(null);
        }}
      />

      {/*
        Sin indicador de no leídas: no hay conteo ni polling, y la lista solo se
        trae al abrir, así que cualquier punto en la campana estaría en blanco o
        mentiría hasta la primera apertura.
      */}
      <button
        ref={btnRef}
        type="button"
        aria-label="Abrir panel de notificaciones"
        aria-haspopup="dialog"
        aria-expanded={isNotifOpen}
        aria-controls="notifications-dropdown"
        title="Notificaciones"
        onClick={() => setIsNotifOpen(!isNotifOpen)}
        className="p-2 cursor-pointer text-slate-400 hover:text-sky-600 transition relative outline-none"
      >
        <BellIcon className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Dropdown */}
      {isNotifOpen && (
        <div
          ref={dropdownRef}
          id="notifications-dropdown"
          className="absolute right-0 mt-4 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden transform origin-top-right transition-all duration-200"
          role="dialog"
          aria-label="Notificaciones recientes"
        >
          {/* Encabezado */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2 bg-slate-50/50 dark:bg-black/20">
            <h3 className="font-bold text-slate-800 dark:text-white truncate">
              Notificaciones
            </h3>
            {showMarcarTodas && (
              <button
                type="button"
                aria-label="Marcar todas las notificaciones como leídas"
                className="shrink-0 whitespace-nowrap text-xs font-medium cursor-pointer! text-sky-500 hover:underline bg-transparent disabled:cursor-default disabled:text-slate-400"
                onClick={() => marcarTodas.mutate()}
                disabled={!hasUnread || marcarTodas.isPending}
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div
            className="max-h-96 overflow-y-auto custom-scrollbar"
            role="list"
            aria-label="Lista de notificaciones recientes"
          >
            <NotificationsListStatus
              listState={listState}
              error={error}
              isEmpty={visibles.length === 0}
              emptyMessage="No tienes notificaciones."
              onRetry={() => void refetch()}
            />

            {showList &&
              visibles.map((notificacion) => (
                <NotificationItem
                  key={notificacion.id}
                  notificacion={notificacion}
                  nowMs={dataUpdatedAt}
                  isActionable={resolveNotificationTarget(notificacion) !== null}
                  onActivate={() => handleActivateFromDropdown(notificacion)}
                />
              ))}
          </div>

          {/* Pie — se oculta entero para no dejar una franja vacía */}
          {showVerTodas && (
            <div className="p-3 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20">
              <button
                type="button"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 transition-colors cursor-pointer"
                onClick={() => {
                  setIsDialogOpen(true);
                  setIsNotifOpen(false);
                }}
              >
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
