"use client";

import { FactoryIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { formatLocalDate } from "@/src/utils/formatDate";
import { useProductionOrderOnboarding } from "@/src/features/production-orders/hooks/useProductionOrderOnboarding";
import type {
  ProductionOrderOnboardingHabilitacion,
  ProductionOrderOnboardingProducto,
  ProductionOrderOnboardingTalla,
} from "@/src/features/production-orders/interfaces/production-order.interface";

// ── Sub-componentes ────────────────────────────────────────────────────────────

/** Campo etiqueta/valor para la rejilla de información de la orden */
const InfoField = ({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <span className="text-slate-400 dark:text-slate-500">{label}</span>
    <div className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">{children}</div>
  </div>
);

/** Tabla de cantidades por talla/color de un producto */
const TallasTable = ({ tallas }: { tallas: ProductionOrderOnboardingTalla[] }) => {
  if (tallas.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 italic px-1 py-3 text-center">
        Sin desglose por talla.
      </p>
    );
  }

  return (
    <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 dark:bg-zinc-800/90 backdrop-blur">
          <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">Talla</th>
            <th className="px-3 py-2 font-medium">Color</th>
            <th className="px-3 py-2 font-medium text-right">Cantidad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {tallas.map((item, index) => (
            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.talla}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.color}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {item.cantidad.toLocaleString("es-MX")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Tabla de materiales (habilitación) necesarios para un producto */
const HabilitacionTable = ({
  habilitacion,
}: {
  habilitacion: ProductionOrderOnboardingHabilitacion[];
}) => {
  if (habilitacion.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 italic px-1 py-3 text-center">
        Este producto no tiene materiales registrados.
      </p>
    );
  }

  return (
    <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 dark:bg-zinc-800/90 backdrop-blur">
          <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">Código</th>
            <th className="px-3 py-2 font-medium">Descripción</th>
            <th className="px-3 py-2 font-medium">Unidad</th>
            <th className="px-3 py-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {habilitacion.map((item, index) => (
            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200">
                {item.codigo}
              </td>
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.descripcion}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.unidad}</td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                {item.total.toLocaleString("es-MX")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Tarjeta de un producto del onboarding: cantidades + materiales */
const ProductoCard = ({ producto }: { producto: ProductionOrderOnboardingProducto }) => (
  <div className="rounded-xl border border-slate-100 dark:border-white/10 p-4 space-y-4">
    {/* Encabezado del producto */}
    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{producto.nombre}</h4>

    {/* Cantidades */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Cantidades
        </h5>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Total:{" "}
          <span className="font-semibold tabular-nums text-slate-800 dark:text-white">
            {producto.cantidades.total.toLocaleString("es-MX")}
          </span>
        </span>
      </div>
      <TallasTable tallas={producto.cantidades.tallas} />
    </div>

    {/* Habilitación */}
    <div className="space-y-2">
      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Habilitación
      </h5>
      <HabilitacionTable habilitacion={producto.habilitacion} />
    </div>
  </div>
);

// ── Componente principal del diálogo ──────────────────────────────────────────

interface ProductionOrderDetailDialogProps {
  /** ID de la orden a consultar. `0` mantiene la consulta deshabilitada. */
  opId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductionOrderDetailDialog({
  opId,
  open,
  onOpenChange,
}: ProductionOrderDetailDialogProps) {
  const { data, isLoading, isError, error } = useProductionOrderOnboarding(opId);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="760px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <FactoryIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Orden de Producción
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {data ? data.folio_op : "Cargando…"}
            </p>
          </div>
        </div>
      }
    >
      {/* ── Estado: cargando ──────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
          <span className="ml-3 text-sm text-slate-500">
            Cargando detalle de la orden...
          </span>
        </div>
      )}

      {/* ── Estado: error ─────────────────────────────────────────────────── */}
      {isError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            Error al cargar el detalle de la orden
          </p>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">
            {(error as Error)?.message ?? "Intenta nuevamente más tarde."}
          </p>
        </div>
      )}

      {/* ── Estado: datos cargados ────────────────────────────────────────── */}
      {!isLoading && !isError && data && (
        <div className="space-y-5">
          {/* Información general de la orden */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
            <InfoField label="Estatus">
              <span className="tabular-nums">{data.estatus_op}</span>
            </InfoField>
            <InfoField label="Prioridad">
              <span className="tabular-nums">{data.prioridad}</span>
            </InfoField>
            <InfoField label="Fecha inicio">{formatLocalDate(data.fecha_inicio)}</InfoField>
            <InfoField label="Fecha fin">{formatLocalDate(data.fecha_fin)}</InfoField>
            <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
              <span className="leading-snug text-slate-600 dark:text-slate-300">
                {data.observaciones?.trim() || "—"}
              </span>
            </InfoField>
          </div>

          {/* Productos */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Productos
            </h3>
            {data.productos.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic px-1 py-4 text-center">
                Esta orden no tiene productos registrados.
              </p>
            ) : (
              <div className="space-y-4">
                {data.productos.map((producto, index) => (
                  <ProductoCard key={index} producto={producto} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </MainDialog>
  );
}
