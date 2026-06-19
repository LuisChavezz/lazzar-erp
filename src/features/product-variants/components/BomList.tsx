"use client";

import { useBom } from "@/src/features/bom/hooks/useBom";
import type { BomDetalle } from "@/src/features/bom/interfaces/bom.interface";
import { ErrorState } from "../../../components/ErrorState";

/** Píldora booleana con el mismo estilo que el badge "Estado" de las variantes */
const BoolBadge = ({
  value,
  trueLabel,
  falseLabel,
}: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) => {
  const styles = value
    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
    : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
    >
      {value ? trueLabel : falseLabel}
    </span>
  );
};

/** Tabla con los renglones de materia prima de la lista de materiales */
const DetalleTable = ({ detalles }: { detalles: BomDetalle[] }) => {
  if (detalles.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 italic px-1 py-8 text-center">
        Esta variante no tiene materiales registrados.
      </p>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 dark:bg-zinc-800/90 backdrop-blur">
          <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">Componente</th>
            <th className="px-3 py-2 font-medium text-right">Cantidad</th>
            <th className="px-3 py-2 font-medium">Unidad</th>
            <th className="px-3 py-2 font-medium text-right">Desperdicio</th>
            <th className="px-3 py-2 font-medium text-center">Obligatorio</th>
            <th className="px-3 py-2 font-medium text-center">Activo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {detalles.map((item) => (
            <tr
              key={item.bom_detalle_id}
              className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                {item.componente_nombre ?? "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {item.cantidad}
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {item.unidad_clave ?? "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {item.desperdicio}
              </td>
              <td className="px-3 py-2 text-center">
                <BoolBadge value={item.obligatorio} trueLabel="Sí" falseLabel="No" />
              </td>
              <td className="px-3 py-2 text-center">
                <BoolBadge value={item.activo} trueLabel="Activo" falseLabel="Inactivo" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface BomListProps {
  /** Identificador de la variante de producto cuya lista de materiales se consulta. */
  productoVarianteId: number;
}

/**
 * Vista de solo lectura de la lista de materiales (BOM) de una variante de
 * producto. Pensada para usarse como contenido de `MainDialog`.
 */
export default function BomList({ productoVarianteId }: BomListProps) {
  const { bom, isLoading, isError, error } = useBom(productoVarianteId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-sm text-slate-500">
          Cargando lista de materiales...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar la lista de materiales"
        message={(error as Error)?.message}
      />
    );
  }

  // El endpoint devuelve un arreglo de BOM; se aplanan sus renglones de detalle.
  const detalles = bom.flatMap((b) => b.materia_prima_detalle);

  return <DetalleTable detalles={detalles} />;
}
