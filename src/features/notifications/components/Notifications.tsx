"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { QuoteDetailByIdDialog } from "@/src/features/quotes/components/QuoteDetailByIdDialog";
import { BellIcon } from "../../../components/Icons";
import type { Notificacion } from "../interfaces/notification.interface";
import {
  resolveNotificationTarget,
  type NotificationTarget,
} from "../constants/notificationTargets";
import { useNotificaciones } from "../hooks/useNotificaciones";
import { useNotificacionesSinLeer } from "../hooks/useNotificacionesSinLeer";
import { useMarcarNotificacionLeida } from "../hooks/useMarcarNotificacionLeida";
import { useMarcarTodasLeidas } from "../hooks/useMarcarTodasLeidas";
import { NotificationItem } from "./NotificationItem";
import { NotificationsDialog } from "./NotificationsDialog";
import { NotificationsListStatus } from "./NotificationsListStatus";
import { refocusOnUnmount } from "../utils/refocusOnUnmount";

/**
 * Cuántas notificaciones muestra el dropdown.
 *
 * En escritorio (`md` y más) el panel mide `w-80` (320px) y la lista
 * `max-h-96` (384px). Con el mensaje limitado a dos líneas cada fila queda en
 * ~96px, así que 4 caben completas y la quinta asoma: es el corte que llena el
 * panel y deja visible que hay más, empujando a "Ver todas" sin que la lista se
 * vuelva un scroll largo dentro de un dropdown. Bajo `md` el ancho sigue al
 * viewport (288–382px) y el alto de la lista lo acota el viewport (hasta ~179px
 * en horizontal), así que pueden caber menos filas completas. El recorte es
 * del cliente —el endpoint no tiene parámetro de límite—.
 */
const DROPDOWN_LIMIT = 5;

interface NotificationsProps {
  /**
   * Cierra el panel cada vez que pasa a `true`. `MobileSidebar` le pasa el
   * estado de su cajón: el cajón (`z-60`) tapa el panel, que se quedaba abierto
   * debajo cuando el menú se abría sin un `mousedown` fuera (teclado). El
   * header de escritorio no lo pasa.
   */
  closeWhen?: boolean;
}

export const Notifications = ({ closeWhen = false }: NotificationsProps) => {
  const router = useRouter();
  const { data: session } = useSession();

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Ajuste durante el render al cambiar la prop (sin efecto ni render extra
  // con el panel visible): solo el flanco a `true` cierra.
  const [prevCloseWhen, setPrevCloseWhen] = useState(closeWhen);
  if (closeWhen !== prevCloseWhen) {
    setPrevCloseWhen(closeWhen);
    if (closeWhen) setIsNotifOpen(false);
  }
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  /*
    El id y el recurso del que se lee viajan JUNTOS, y los decide
    `notificationTargets`, no este componente: el `tipo` y, en
    `cotizacion_en_revision`, también el rol, que elige el orden del respaldo
    entre los dos recursos.
  */
  const [quoteTarget, setQuoteTarget] = useState<Extract<
    NotificationTarget,
    { kind: "quote-dialog" }
  > | null>(null);
  /*
    La apertura va aparte del destino: al cerrar solo se baja `open` y el
    destino se suelta en el `onCloseAutoFocus` del diálogo, ya desmontado.
    Soltarlo antes apaga la consulta y el contenido destella su estado de
    error durante la animación de salida.
  */
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  /*
    Espejo SÍNCRONO de `isQuoteOpen` para la guarda del cierre: si se abre otra
    cotización mientras la anterior aún se desvanece, su `onCloseAutoFocus`
    llega después y soltaría el destino NUEVO. La ref se escribe en el mismo
    manejador que abre o cierra, así que no depende de que React haya vuelto a
    renderizar antes de que llegue ese evento.
  */
  const isQuoteOpenRef = useRef(false);
  const setQuoteOpen = (open: boolean) => {
    isQuoteOpenRef.current = open;
    setIsQuoteOpen(open);
  };
  const dropdownRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  /**
   * Destino pendiente de aplicar cuando la activación viene del modal. Se
   * aplica en `onCloseAutoFocus`, ya desmontado el modal, sea cual sea el
   * destino. Es imprescindible para TODO destino que sea un diálogo
   * (`quote-dialog`: hoy `cotizacion_en_revision` y `cotizacion_rechazada`):
   * abrirlo en el mismo commit en que se cierra el modal deja a Radix con dos
   * `Dialog.Root` solapados.
   */
  const pendingTargetRef = useRef<NotificationTarget | null>(null);

  // La consulta solo existe mientras alguna superficie está abierta: montar la
  // campana en el header no dispara ningún fetch.
  const {
    notificaciones,
    listState,
    isEmpty,
    hasUnread,
    error,
    refetch,
  } = useNotificaciones(isNotifOpen || isDialogOpen);

  const { unreadCount } = useNotificacionesSinLeer();
  const showBadge = unreadCount !== undefined && unreadCount > 0;

  const marcarLeida = useMarcarNotificacionLeida();
  const marcarTodas = useMarcarTodasLeidas();

  // Destino del foco cuando un botón pulsado desaparece (ver `refocusOnUnmount`).
  const listRef = useRef<HTMLDivElement>(null);

  const visibles = notificaciones.slice(0, DROPDOWN_LIMIT);
  const isReady = listState === "ready";
  const showList = isReady && !isEmpty;

  /*
    Los controles que operan sobre la lista existen SOLO en `ready`. Mientras
    carga no hay nada sobre qué actuar, y sin red o con la carga fallida el
    estado ya tiene su propio mensaje y su "Reintentar"
    (`NotificationsListStatus`), así que ocultarlos no se confunde con una
    bandeja vacía. Un refetch en segundo plano sigue en `ready`, por lo que no
    parpadean. `isEmpty` y `hasUnread` ya vienen del hook acotados a `ready`.
  */

  // Con la lista vacía no hay nada que ver en el modal.
  const showVerTodas = isReady && !isEmpty;

  /*
    Sin no leídas la mutación no cambiaría nada. `marcarTodas.isPending` lo
    mantiene montado mientras vuela: el optimista de `onMutate` ya dejó todo en
    leído, así que sin esta condición el botón se desmontaría en el mismo commit
    del clic y su estado deshabilitado sería inalcanzable. Al asentarse se
    desmonta, y `refocusOnUnmount` lleva el foco a la lista.
  */
  const showMarcarTodas = isReady && (hasUnread || marcarTodas.isPending);

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

  /*
    Escape cierra el panel y devuelve el foco a la campana. Solo escucha con
    el panel abierto; abrir "Ver todas" o un destino diálogo cierra antes el
    panel, así que nunca compite con el Escape de esos diálogos. La guarda de
    `defaultPrevented` deja pasar el Escape que otro componente ya atendió, y
    el Escape que cancela una composición IME no cuenta.

    Solo actúa con el foco DENTRO del panel o en la campana: si el usuario salió
    con Tab a la página, ese Escape es de lo que tenga el foco (el panel se
    cierra con el clic fuera). Eso también deja fuera a la instancia oculta
    (el header móvil pasa a `display:none` al crecer la ventana): un elemento
    oculto pierde el foco. Aun así, el foco solo vuelve a la campana si está
    visible.
  */
  useEffect(() => {
    if (!isNotifOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        event.isComposing
      ) {
        return;
      }
      const focused = document.activeElement;
      const isFocusInside =
        focused !== null &&
        (dropdownRef.current?.contains(focused) === true ||
          btnRef.current?.contains(focused) === true);
      if (!isFocusInside) return;

      event.preventDefault();
      setIsNotifOpen(false);
      const bell = btnRef.current;
      if (bell && bell.offsetParent !== null) bell.focus();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotifOpen]);

  const applyTarget = (target: NotificationTarget) => {
    if (target.kind === "route") {
      router.push(target.href);
      return;
    }
    // La cotización no tiene ruta de detalle: se abre el mismo diálogo
    // self-fetching que usan la paleta global y el pedido 360°.
    setQuoteTarget(target);
    setQuoteOpen(true);
  };

  /**
   * Marca como leída y abre el destino, en ese orden y SIN esperar a la
   * mutación: el optimista ya atenuó la fila, así que la navegación no tiene
   * por qué bloquearse contra la red.
   */
  /**
   * ÚNICA fuente de "¿esta fila abre algo?" para el dropdown y el modal: el
   * destino depende de los permisos de la sesión (ver
   * `resolveNotificationTarget`).
   */
  const isActionable = (notificacion: Notificacion) =>
    resolveNotificationTarget(notificacion, session?.user) !== null;

  const markThenGo = (
    notificacion: Notificacion,
    apply: (target: NotificationTarget) => void,
  ) => {
    const target = resolveNotificationTarget(notificacion, session?.user);
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
        listState={listState}
        isEmpty={isEmpty}
        hasUnread={hasUnread}
        error={error}
        onRetry={() => void refetch()}
        onMarkRead={(notificacion) => marcarLeida.mutate(notificacion.id)}
        onMarkAllRead={() => marcarTodas.mutate()}
        isMarkingAll={marcarTodas.isPending}
        onActivate={handleActivateFromDialog}
        isActionable={isActionable}
        onCloseAutoFocus={handleDialogCloseAutoFocus}
      />

      {/*
        El detalle de cotización vive FUERA del modal —como hermano— para que
        nunca haya dos diálogos anidados.
      */}
      {/*
        Solo se monta con destino: id y recurso salen del MISMO objeto. Al
        cerrar, el destino se suelta ya desmontado el contenido (ver arriba).
      */}
      {quoteTarget && (
        <QuoteDetailByIdDialog
          orderId={quoteTarget.quoteId}
          source={quoteTarget.source}
          open={isQuoteOpen}
          onOpenChange={setQuoteOpen}
          onCloseAutoFocus={() => {
            // Guarda: un cierre tardío no suelta la cotización que ya se reabrió.
            if (!isQuoteOpenRef.current) setQuoteTarget(null);
          }}
        />
      )}

      {/*
        El badge sale del contador sondeado (`useNotificacionesSinLeer`), no de
        la lista, que solo se trae con el panel abierto. Oculto con 0 y
        mientras no hay un conteo válido; el número va en el `aria-label`.
      */}
      <button
        ref={btnRef}
        type="button"
        aria-label={
          showBadge
            ? `Abrir panel de notificaciones (${unreadCount} sin leer)`
            : "Abrir panel de notificaciones"
        }
        aria-haspopup="dialog"
        aria-expanded={isNotifOpen}
        aria-controls="notifications-dropdown"
        title="Notificaciones"
        onClick={() => setIsNotifOpen(!isNotifOpen)}
        className="p-2 cursor-pointer text-slate-400 hover:text-sky-600 transition relative outline-none"
      >
        <BellIcon className="w-5 h-5" aria-hidden="true" />
        {showBadge && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-4 text-center tabular-nums"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/*
        Dropdown. Posición por breakpoint (EC-934):
        - Bajo `sm`, `fixed` a 16px de cada lado y a 8px bajo el header móvil
          (`h-16` = 64px → `top-18` = 72px). La campana queda a 88px del borde
          derecho, así que anclado a ella un panel de 320px se salía por la
          izquierda en cualquier ancho menor a 432px. El `backdrop-blur` del
          header lo vuelve el bloque contenedor del `fixed`, pero ese header
          ocupa todo el ancho desde (0,0): las coordenadas son las del viewport.
        - Desde `sm`, 320px anclado a la derecha, sin estirarse en tablets.
        - Desde `md` (header de escritorio), las clases de siempre:
          `absolute right-0 mt-4 w-80`.
        El alto se acota al viewport (`dvh`, por las barras del navegador
        móvil) menos el desplazamiento superior y 16px de margen: 72px en móvil
        y 74px en escritorio (borde inferior de la campana más `mt-4`). Solo la
        lista hace scroll; encabezado y pie quedan fijos. Con alturas de
        ventana normales el tope no se alcanza y el panel mide lo mismo.
      */}
      {isNotifOpen && (
        <div
          ref={dropdownRef}
          id="notifications-dropdown"
          className="fixed left-4 right-4 top-18 max-h-[calc(100dvh-88px)] sm:left-auto sm:w-80 md:absolute md:left-auto md:right-0 md:top-auto md:mt-4 md:max-h-[calc(100dvh-90px)] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden transform origin-top-right transition-all duration-200"
          role="dialog"
          aria-label="Notificaciones recientes"
        >
          {/* Encabezado */}
          <div className="shrink-0 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2 bg-slate-50/50 dark:bg-black/20">
            <h3 className="font-bold text-slate-800 dark:text-white truncate">
              Notificaciones
            </h3>
            {showMarcarTodas && (
              <button
                ref={refocusOnUnmount(listRef)}
                type="button"
                aria-label="Marcar todas las notificaciones como leídas"
                className="shrink-0 whitespace-nowrap text-xs font-medium cursor-pointer! text-sky-500 hover:underline bg-transparent disabled:cursor-default disabled:text-slate-400"
                onClick={() => marcarTodas.mutate()}
                disabled={marcarTodas.isPending}
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/*
            Lista. El contenedor es un `group` enfocable fuera del orden de
            tabulación (destino del foco de `refocusOnUnmount`); el `list` va
            dentro y solo con `listitem` como hijos, porque los mensajes de
            estado no son elementos de la lista.
          */}
          <div
            ref={listRef}
            tabIndex={-1}
            className="max-h-96 min-h-0 overflow-y-auto custom-scrollbar outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500/40"
            role="group"
            aria-label="Lista de notificaciones recientes"
          >
            <NotificationsListStatus
              listState={listState}
              error={error}
              isEmpty={isEmpty}
              emptyMessage="No tienes notificaciones."
              onRetry={() => void refetch()}
              focusFallbackRef={listRef}
            />

            {showList && (
              <div role="list">
                {visibles.map((notificacion) => (
                  <div key={notificacion.id} role="listitem">
                    <NotificationItem
                      notificacion={notificacion}
                      isActionable={isActionable(notificacion)}
                      onActivate={() =>
                        handleActivateFromDropdown(notificacion)
                      }
                      onMarkRead={() => marcarLeida.mutate(notificacion.id)}
                      focusFallbackRef={listRef}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pie — se oculta entero para no dejar una franja vacía */}
          {showVerTodas && (
            <div className="shrink-0 p-3 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20">
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
