"use client";

import Link from "next/link";
import { MainDialog } from "@/src/components/MainDialog";
import { EmptyLines, LineItemsTable, SectionTitle } from "@/src/components/DetailDialogPrimitives";
import { KpiCurrencyAmount } from "@/src/components/KpiCurrency";
import type {
  CustomerActiveKpiAvailable,
  CustomerCarteraKpiAvailable,
  CustomerKpiClienteRef,
  CustomerKpis,
  CustomerSalesKpiAvailable,
} from "../interfaces/customer-kpis.interface";
import { formatKpiCurrencyAmount, formatKpiDate, formatKpiPct, plural } from "@/src/utils/kpiFormat";

/** Bloques con drill-down (todos los que el backend lista). */
export type CustomerKpiDrillDownKind = "ventas_por_cliente" | "clientes_activos" | "cartera_antiguedad";

const CLIENT_LINK_CLASS =
  "font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer";

const TH_CLASS = "px-3 py-2 font-semibold";
const TD_CLASS = "px-3 py-2 text-slate-600 dark:text-slate-300";
const AMOUNT_TD_CLASS = `${TD_CLASS} text-right tabular-nums whitespace-nowrap`;
const NOTE_CLASS = "mt-2 text-xs text-slate-500 dark:text-slate-400";

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
    const { por_moneda } = data.ventas_por_cliente;
    if (por_moneda.length === 0) return "0 clientes con facturación";
    if (por_moneda.length === 1) {
      const [{ top_clientes, total_clientes_facturados: total }] = por_moneda;
      return `Top ${top_clientes.length} de ${total} ${plural(total, "cliente", "clientes")} con facturación`;
    }
    return "Top de clientes de cada moneda; los importes de monedas distintas no se suman.";
  }
  if (kind === "clientes_activos" && data?.clientes_activos.disponible) {
    const { activos, inactivos, total } = data.clientes_activos;
    return `${activos} ${plural(activos, "activo", "activos")} y ${inactivos} ${plural(inactivos, "inactivo", "inactivos")} de ${total} ${plural(total, "cliente", "clientes")}`;
  }
  if (kind === "cartera_antiguedad" && data?.cartera_antiguedad.disponible) {
    const { drill_down, drill_down_total: total, drill_down_truncado } = data.cartera_antiguedad;
    const cuentas = `${total} ${plural(total, "cuenta vencida", "cuentas vencidas")}`;
    if (drill_down.length === 0) return cuentas;
    // El backend corta la lista en 20, ordenada por vencimiento ascendente.
    if (drill_down_truncado) {
      return `Mostrando las ${drill_down.length} de vencimiento más antiguo de ${cuentas}`;
    }
    return `Mostrando ${drill_down.length} de ${cuentas}`;
  }
  return "Indicador no disponible por ahora.";
}

/** Un top por moneda: los porcentajes son sobre el total de ESA moneda. */
function SalesContent({ kpi }: { kpi: CustomerSalesKpiAvailable }) {
  if (kpi.por_moneda.length === 0) {
    return <EmptyLines>Sin clientes facturados para mostrar.</EmptyLines>;
  }
  return (
    <div className="space-y-5">
      {kpi.por_moneda.map((moneda) => (
        <section key={moneda.moneda} aria-label={`Facturación en ${moneda.moneda}`}>
          <SectionTitle>
            {moneda.moneda} · Total {formatKpiCurrencyAmount(moneda.total_facturado, moneda.moneda)} ·{" "}
            {moneda.total_clientes_facturados}{" "}
            {plural(moneda.total_clientes_facturados, "cliente", "clientes")}
          </SectionTitle>
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
            {moneda.top_clientes.map((cliente) => (
              <tr key={cliente.cliente_id}>
                <td className={TD_CLASS}>
                  <ClienteLink clienteId={cliente.cliente_id} nombre={cliente.cliente_nombre} />
                </td>
                <td className={AMOUNT_TD_CLASS}>{formatKpiCurrencyAmount(cliente.monto, moneda.moneda)}</td>
                <td className={`${TD_CLASS} text-right tabular-nums`}>{formatKpiPct(cliente.pct_del_total)}</td>
                <td className={`${TD_CLASS} text-right tabular-nums`}>{formatKpiPct(cliente.pct_acumulado)}</td>
              </tr>
            ))}
          </LineItemsTable>
        </section>
      ))}
    </div>
  );
}

/** Lista de clientes activos o inactivos, con aviso cuando el backend la corta. */
function ClienteList({
  title,
  clientes,
  total,
  truncado,
  emptyMessage,
}: {
  title: string;
  clientes: CustomerKpiClienteRef[];
  total: number;
  truncado: boolean;
  emptyMessage: string;
}) {
  return (
    <section aria-label={title}>
      <SectionTitle>
        {title} ({total})
      </SectionTitle>
      {clientes.length === 0 ? (
        <EmptyLines>{emptyMessage}</EmptyLines>
      ) : (
        <>
          <LineItemsTable head={<th className={TH_CLASS}>Cliente</th>}>
            {clientes.map((cliente) => (
              <tr key={cliente.cliente_id}>
                <td className={TD_CLASS}>
                  <ClienteLink clienteId={cliente.cliente_id} nombre={cliente.cliente_nombre} />
                </td>
              </tr>
            ))}
          </LineItemsTable>
          {truncado ? (
            <p className={NOTE_CLASS}>
              Mostrando {clientes.length} de {total}, en orden alfabético.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function ActiveContent({ kpi }: { kpi: CustomerActiveKpiAvailable }) {
  return (
    <div className="space-y-5">
      <ClienteList
        title="Activos"
        clientes={kpi.drill_down.activos}
        total={kpi.activos}
        truncado={kpi.drill_down.activos_truncado}
        emptyMessage="Sin clientes activos."
      />
      <ClienteList
        title="Inactivos"
        clientes={kpi.drill_down.inactivos}
        total={kpi.inactivos}
        truncado={kpi.drill_down.inactivos_truncado}
        emptyMessage="Sin clientes inactivos."
      />
    </div>
  );
}

function CarteraContent({ kpi }: { kpi: CustomerCarteraKpiAvailable }) {
  return (
    <div className="space-y-5">
      {kpi.drill_down.length === 0 ? (
        <EmptyLines>Sin cuentas vencidas para mostrar.</EmptyLines>
      ) : (
        // El "Mostrando X de N" de una lista cortada ya va en la descripción.
        <div>
          <LineItemsTable
            head={
              <>
                <th className={TH_CLASS}>Cliente</th>
                <th className={TH_CLASS}>Moneda</th>
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
                <td className={TD_CLASS}>{cuenta.moneda}</td>
                <td className={AMOUNT_TD_CLASS}>{formatKpiCurrencyAmount(cuenta.saldo, cuenta.moneda)}</td>
                <td className={`${TD_CLASS} tabular-nums`}>{formatKpiDate(cuenta.fecha_vencimiento)}</td>
                <td className={`${TD_CLASS} tabular-nums text-right font-medium text-red-600 dark:text-red-400`}>
                  {cuenta.dias_vencida}
                </td>
              </tr>
            ))}
          </LineItemsTable>
        </div>
      )}
      {kpi.sin_vencimiento.length > 0 ? (
        <section aria-label="Saldo sin fecha de vencimiento">
          <SectionTitle>Sin fecha de vencimiento</SectionTitle>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {kpi.sin_vencimiento.map((fila) => (
              <li key={fila.moneda} className="flex items-baseline justify-between gap-3 tabular-nums">
                <span>
                  {fila.total} {plural(fila.total, "cuenta", "cuentas")}
                </span>
                <span className="whitespace-nowrap">
                  <KpiCurrencyAmount value={fila.monto} moneda={fila.moneda} />
                </span>
              </li>
            ))}
          </ul>
          <p className={NOTE_CLASS}>Saldo pendiente sin fecha de vencimiento: no se cuenta como vencido.</p>
        </section>
      ) : null}
    </div>
  );
}

const TITLES: Record<CustomerKpiDrillDownKind, string> = {
  ventas_por_cliente: "Clientes con más facturación",
  clientes_activos: "Clientes activos e inactivos",
  cartera_antiguedad: "Cuentas por cobrar vencidas",
};

const UNAVAILABLE = <EmptyLines>Indicador no disponible por ahora.</EmptyLines>;

function DrillDownBody({ kind, data }: { kind: CustomerKpiDrillDownKind; data: CustomerKpis }) {
  switch (kind) {
    case "ventas_por_cliente":
      return data.ventas_por_cliente.disponible ? <SalesContent kpi={data.ventas_por_cliente} /> : UNAVAILABLE;
    case "clientes_activos":
      return data.clientes_activos.disponible ? <ActiveContent kpi={data.clientes_activos} /> : UNAVAILABLE;
    case "cartera_antiguedad":
      return data.cartera_antiguedad.disponible ? <CarteraContent kpi={data.cartera_antiguedad} /> : UNAVAILABLE;
  }
}

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
 * fetch propio), con enlace al detalle del cliente. Los importes van con la
 * moneda de cada uno y nunca se suman entre monedas. Lee siempre los datos
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
      {kind && data ? <DrillDownBody kind={kind} data={data} /> : null}
    </MainDialog>
  );
}
