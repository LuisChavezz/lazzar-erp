"use client";

import { SliceIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import {
  CORTE_MANGA_ORDER_PRIORITY_CONFIG,
  CORTE_MANGA_ORDER_STATUS_CONFIG,
  corteMangaOrderPriorityFallback,
} from "../constants/corteMangaOrderStatus";
import type {
  CorteMangaOrder,
  CorteMangaOrderLine,
} from "../interfaces/corte-manga-order.interface";

/**
 * `configuracion` es un `JSONField` LIBRE (`unknown` en el tipo, `nullable` sin
 * `type` en el esquema OpenAPI), así que no puede pintarse a ciegas: un
 * `String(objeto)` daría "[object Object]" y un acceso directo a `.tipo`
 * reventaría si algún día llega un arreglo o un escalar.
 *
 * Se resuelve en tres ramas, de la más específica a la más defensiva:
 *  1. `null`/`undefined` → guion largo. ES EL CASO DE HOY para el 100% de los
 *     renglones: la única ruta de alta viva (`OrdenCorteMangaService.save`) no
 *     escribe este campo. No es un error ni un dato faltante — ver la nota de
 *     `CorteMangaOrderLine`.
 *  2. Objeto con un `tipo` string no vacío → ese valor. Es la ÚNICA forma que
 *     alguna vez se escribió aquí (`corte_manga_config` de ventas, hoy
 *     deshabilitada), así que solo puede aparecer en filas históricas.
 *  3. Cualquier otra forma → su JSON crudo, truncado por CSS y completo en el
 *     `title`. No se inventa un formato, pero tampoco se descarta el dato en
 *     silencio: un valor desconocido se ve, y quien lo vea sabrá que el
 *     contrato cambió.
 */
const describeConfiguracion = (configuracion: unknown): { text: string; title?: string } => {
  if (configuracion == null) return { text: "—" };

  if (typeof configuracion === "object" && !Array.isArray(configuracion)) {
    const tipo = (configuracion as Record<string, unknown>).tipo;
    if (typeof tipo === "string" && tipo.trim() !== "") {
      return { text: tipo, title: tipo };
    }
  }

  const raw = JSON.stringify(configuracion);
  // `JSON.stringify` devuelve `undefined` para valores no serializables
  // (`function`, `symbol`) — imposible viniendo de JSON, pero el tipo lo admite.
  return raw ? { text: raw, title: raw } : { text: "—" };
};

/**
 * Columnas de `detalles`. Se pinta el shape COMPLETO con `"—"` por renglón, que
 * es la convención de Packing/Dispatch/Picking y la que ya sigue el diálogo de
 * reflejante — NO la excepción de bordado, que omite las columnas
 * estructuralmente vacías.
 *
 * El criterio para elegir una u otra es si la columna está vacía por
 * CONSTRUCCIÓN o por ORIGEN de la fila. Aquí es por origen: `color` y
 * `configuracion` los poblaba la generación automática desde ventas (`color=
 * pedido_detalle.color`, `configuracion=talla.corte_manga_config`), que está
 * deshabilitada desde el 2026-07-31 pero dejó filas históricas; la ruta viva no
 * los escribe. Así que hoy se verán en `"—"` para todo lo que se cree desde
 * este módulo, y con valor en lo que quede de antes. Ese guion es un dato
 * legítimo ("esta orden no trae configuración de corte"), no un estado de error.
 */
const LineasTable = ({ items }: { items: CorteMangaOrderLine[] }) => {
  if (items.length === 0) {
    return <EmptyLines>Esta orden no tiene artículos registrados.</EmptyLines>;
  }

  return (
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Producto</th>
          <th className="px-3 py-2 font-medium">Talla</th>
          <th className="px-3 py-2 font-medium">Color</th>
          <th className="px-3 py-2 font-medium">Configuración</th>
          <th className="px-3 py-2 font-medium text-right">Cantidad</th>
        </>
      }
    >
      {items.map((linea) => {
        const configuracion = describeConfiguracion(linea.configuracion);
        return (
          <tr
            key={linea.id}
            className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <td
              className="px-3 py-2 text-slate-700 dark:text-slate-200 max-w-40 truncate"
              title={linea.producto_nombre ?? undefined}
            >
              {textOrDash(linea.producto_nombre)}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
              {textOrDash(linea.talla_nombre)}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
              {textOrDash(linea.color_nombre)}
            </td>
            <td
              className="px-3 py-2 max-w-40 truncate text-slate-600 dark:text-slate-300"
              title={configuracion.title}
            >
              {configuracion.text}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums font-semibold text-slate-800 dark:text-white">
              {formatQuantityValue(linea.cantidad)}
            </td>
          </tr>
        );
      })}
    </LineItemsTable>
  );
};

interface CorteMangaOrderDetailDialogProps {
  /**
   * La orden ya resuelta por el padre, o `null` si el id abierto no existe en
   * la lista cargada.
   *
   * El disparador sigue siendo un `id` (`openOrderId` en
   * `CorteMangaOrdersView`), para poder abrirse desde puntos que solo tienen un
   * id a la mano —el 409 de duplicado, `orden_corte_manga_existente.id`, ver
   * `parseCorteMangaOrderError.ts`— y no únicamente desde una fila a la vista.
   * Pero la BÚSQUEDA vive en el padre, que ya tiene el arreglo: si se
   * resolviera aquí con otro `useCorteMangaOrders()`, el diálogo abriría una
   * segunda suscripción a la misma query y volvería a copiar y ordenar la lista
   * completa en cada render, solo para localizar un renglón que el padre ya
   * tiene.
   *
   * SIN fetch propio, y verificado para OCM en concreto (no por analogía con
   * reflejante/bordado). `retrieve` devuelve EXACTAMENTE el mismo objeto que un
   * renglón del listado:
   *  - `OrdenesCorteMangaViewSet` fija `serializer_class =
   *    OrdenesCorteMangaSerializer` una sola vez, a nivel de clase.
   *  - No hay `get_serializer_class` en TODO `produccion/api/views.py`, así que
   *    nada lo desvía por acción.
   *  - El ViewSet no sobreescribe `list` ni `retrieve`: hereda
   *    `ListModelMixin`/`RetrieveModelMixin` sin tocarlos.
   *  - `get_queryset()` NO ramifica por `self.action`: es un solo camino, con
   *    el mismo `select_related`/`prefetch_related` para ambas acciones, de modo
   *    que ni siquiera los `detalles` prefetcheados pueden diferir.
   *  - El esquema OpenAPI desplegado lo corrobora: el listado responde
   *    `array of #/components/schemas/OrdenesCorteManga` y el detalle responde
   *    `#/components/schemas/OrdenesCorteManga` — el MISMO componente, no dos
   *    parecidos.
   * Por eso la fila del listado ES el detalle completo, y el hook de detalle que
   * la fase 1 dejó preparado (`useCorteMangaOrder`) se eliminó por innecesario.
   */
  order: CorteMangaOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CorteMangaOrderDetailDialog({
  order,
  open,
  onOpenChange,
}: CorteMangaOrderDetailDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="880px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <SliceIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Orden de Corte de Manga
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {order ? order.folio_ocm : "No disponible"}
            </p>
          </div>
        </div>
      }
    >
      {/*
       * SIN fetch propio: sin llamada de red que pueda devolver un 404 real.
       * El equivalente aquí es que el padre no haya encontrado el id en la
       * lista — y como el listado usa el MISMO `get_queryset()` acotado por
       * empresa/sucursal que `retrieve` (confirmado arriba), esa ausencia cubre
       * exactamente los dos casos que el backend fusiona en un 404 real: la
       * orden no existe, o existe pero fuera del alcance del usuario. Un solo
       * estado genérico para ambos, igual que pide el contrato del endpoint.
       */}
      {!order ? (
        <ErrorState
          title="Orden de corte de manga no encontrada"
          message="No existe o no tienes acceso a esta orden de corte de manga."
        />
      ) : (
        <div className="space-y-5">
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
            {/* SOLO LECTURA: `estatus_corte` es `read_only` en el serializer y
                no existe `PUT`/`PATCH` (405), así que este badge informa y no
                ofrece ninguna transición. Reutiliza la misma config de 7
                valores del listado. */}
            <InfoField label="Estatus">
              <StatusBadge
                status={String(order.estatus_corte)}
                config={CORTE_MANGA_ORDER_STATUS_CONFIG}
              />
            </InfoField>
            <InfoField label="Prioridad">
              <StatusBadge
                status={String(order.prioridad)}
                config={CORTE_MANGA_ORDER_PRIORITY_CONFIG}
                defaultConfig={corteMangaOrderPriorityFallback(order.prioridad)}
              />
            </InfoField>
            <InfoField label="Pedido">{textOrDash(order.pedido_folio)}</InfoField>
            {/* `usuario_nombre` viene ya resuelto por el serializer
                (`get_full_name()` o el email). Llega `null` solo en las filas
                históricas de la generación automática desde ventas, que no
                asignaba usuario. */}
            <InfoField label="Operador">{textOrDash(order.usuario_nombre)}</InfoField>
            {/* `empresa_nombre`/`sucursal_nombre` están DESPLEGADOS para OCM y
                el esquema los declara `string` requerido sobre FKs no nulables,
                así que —a diferencia de reflejante— aquí no hay hueco temporal
                que cubrir. Se usa `textOrDash` igual, por la misma convención
                de la rejilla, no por desconfianza del contrato. */}
            <InfoField label="Empresa">{textOrDash(order.empresa_nombre)}</InfoField>
            <InfoField label="Sucursal">{textOrDash(order.sucursal_nombre)}</InfoField>
            <InfoField label="Inicio">
              <span className="tabular-nums">
                {formatShortDate(order.fecha_inicio)} · {formatShortTime(order.fecha_inicio)}
              </span>
            </InfoField>
            {/* `fecha_fin` es SIEMPRE `null` hoy (ningún endpoint la fija) — se
                muestra igual, sin ocultar el campo: `formatShortDate`/
                `formatShortTime` ya resuelven `null` al guion largo del
                proyecto, así que no hace falta un `if` especial. */}
            <InfoField label="Fin">
              <span className="tabular-nums">
                {formatShortDate(order.fecha_fin)} · {formatShortTime(order.fecha_fin)}
              </span>
            </InfoField>
            <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
              {textOrDash(order.observaciones)}
            </InfoField>
          </div>

          {/* Artículos */}
          <div>
            <SectionTitle>Artículos de la orden</SectionTitle>
            <LineasTable items={order.detalles} />
          </div>
        </div>
      )}
    </MainDialog>
  );
}
