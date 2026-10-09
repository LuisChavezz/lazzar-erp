"use client";

import Link from "next/link";
import { MainDialog } from "@/src/components/MainDialog";
import { EmptyLines, LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import type { CustomerKpis } from "../interfaces/customer-kpis.interface";
import { formatKpiDate, formatKpiMonto, formatKpiPct, plural } from "../utils/customerKpiFormat";

/** Bloques con drill-down (`clientes_activos` no lo tiene: el backend no dice cuáles). */
export type CustomerKpiDrillDownKind = "ventas_por_cliente" | "cartera_antiguedad";

const CLIENT_LINK_CLASS =
  "font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer";

const TH_CLASS = "px-3 py-2 font-semibold";
const TD_CLASS = "px-3 py-2 text-slate-600 dark:text-slate-300";


/** Nombre del cliente que navega a su detalle (enlace real: clic central abre pestaña nueva). */
function ClienteLink({ clienteId, nombre }: { clienteId: number; nombre: string }) {
  return (
    <Link href={`/sales/customers/${clienteId}`} className={CLIENT_LINK_CLASS} title="Ver detalle del cliente">
      {nombre || `#${clienteId}`}
    </Link>
  );
}

/**
 * Descripción del diálogo: el CONTEO de lo que se muestra. Sin filas solo da el
 * total (o que el indicador no está disponible); el "Sin … para mostrar" lo
 * dice el cuerpo (`EmptyLines`), para no repetir la misma frase dos veces.
 */
function getDescription(kind: CustomerKpiDrillDownKind | null, data: CustomerKpis | undefined): string {
  if (kind === "ventas_por_cliente" && data?.ventas_por_cliente.disponible) {
    const { top_clientes, total_clientes_facturados: total } = data.ventas_por_cliente;
    const clientes = `${total} ${plural(total, "cliente", "clientes")} con facturación`;
    return top_clientes.length === 0 ? clientes : `Top ${top_clientes.length} de ${clientes}`;
  }
  if (kind === "cartera_antiguedad" && data?.cartera_antiguedad.disponible) {
    const { drill_down, total_cuentas_vencidas: total } = data.cartera_antiguedad;
    const cuentas = `${total} ${plural(total, "cuenta vencida", "cuentas vencidas")}`;
    if (drill_down.length === 0) return cuentas;
    // El backend corta la lista en 20, ordenada por vencimiento ascendente.
    if (drill_down.length < total) {
      return `Mostrando las ${drill_down.length} de vencimiento más antiguo de ${cuentas}`;
    }
    return `Mostrando ${drill_down.length} de ${cuentas}`;
  }
  return "Indicador no disponible por ahora.";
}

function SalesContent({ kpi }: { kpi: CustomerKpis["ventas_por_cliente"] }) {
  if (!kpi.disponible || kpi.top_clientes.length === 0) {
    return <EmptyLines>Sin clientes facturados para mostrar.</EmptyLines>;
  }
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Cliente</th>
          <th className={`${TH_CLASS} text-right`}>Monto</th>
          <th className={`${TH_CLASS} text-right`}>% del total</th>
          <th className={`${TH_CLASS} text-right`}>% acumulado</th>
        </>
      }
    >
      {kpi.top_clientes.map((cliente) => (
        <tr key={cliente.cliente_id}>
          <td className={TD_CLASS}>
            <ClienteLink clienteId={cliente.cliente_id} nombre={cliente.cliente_nombre} />
          </td>
          <td className={`${TD_CLASS} text-right tabular-nums whitespace-nowrap`}>{formatKpiMonto(cliente.monto)}</td>
          <td className={`${TD_CLASS} text-right tabular-nums`}>{formatKpiPct(cliente.pct_del_total)}</td>
          <td className={`${TD_CLASS} text-right tabular-nums`}>{formatKpiPct(cliente.pct_acumulado)}</td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

function CarteraContent({ kpi }: { kpi: CustomerKpis["cartera_antiguedad"] }) {
  if (!kpi.disponible || kpi.drill_down.length === 0) {
    return <EmptyLines>Sin cuentas vencidas para mostrar.</EmptyLines>;
  }
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Cliente</th>
          <th className={`${TH_CLASS} text-right`}>Saldo</th>
          <th className={TH_CLASS}>Vencimiento</th>
          <th className={`${TH_CLASS} text-right`}>Días vencida</th>
        </>
      }
    >
      {/* La CxC no tiene ruta de detalle en el frontend: solo el cliente enlaza. */}
      {kpi.drill_down.map((cuenta) => (
        <tr key={cuenta.id}>
          <td className={TD_CLASS}>
            <ClienteLink clienteId={cuenta.cliente_id} nombre={cuenta.cliente__nombre} />
          </td>
          <td className={`${TD_CLASS} text-right tabular-nums whitespace-nowrap`}>{formatKpiMonto(cuenta.saldo)}</td>
          <td className={`${TD_CLASS} tabular-nums`}>{formatKpiDate(cuenta.fecha_vencimiento)}</td>
          <td className={`${TD_CLASS} tabular-nums text-right font-medium text-red-600 dark:text-red-400`}>
            {cuenta.dias_vencida}
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

const TITLES: Record<CustomerKpiDrillDownKind, string> = {
  ventas_por_cliente: "Clientes con más facturación",
  cartera_antiguedad: "Cuentas por cobrar vencidas",
};

interface CustomerKpiDrillDownDialogProps {
  open: boolean;
  /**
   * ÚLTIMO bloque abierto (estado de la sección). Se conserva al cerrar, así
   * que el título y las filas siguen ahí durante la animación de salida;
   * `null` solo antes de la primera apertura.
   */
  kind: CustomerKpiDrillDownKind | null;
  data: CustomerKpis | undefined;
  onClose: () => void;
}

/**
 * Drill-down de un indicador de clientes: las filas que ya trae el payload (sin
 * fetch propio), con enlace al detalle del cliente. Lee siempre los datos
 * ACTUALES de la consulta, así que un refetch con el diálogo abierto se refleja
 * sin reabrirlo.
 */
export function CustomerKpiDrillDownDialog({ open, kind, data, onClose }: CustomerKpiDrillDownDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={kind ? TITLES[kind] : ""}
      description={getDescription(kind, data)}
      maxWidth="720px"
    >
      {kind === "ventas_por_cliente" && data && <SalesContent kpi={data.ventas_por_cliente} />}
      {kind === "cartera_antiguedad" && data && <CarteraContent kpi={data.cartera_antiguedad} />}
    </MainDialog>
  );
}
