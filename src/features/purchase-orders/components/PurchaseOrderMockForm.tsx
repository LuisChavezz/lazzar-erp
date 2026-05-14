"use client";

import { useState } from "react";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { MaterialSelectorPanel } from "./MaterialSelectorPanel";
import { ScissorsIcon, ComprasIcon } from "@/src/components/Icons";

// Opciones estáticas para el formulario demo
const PROVEEDORES_OPTIONS = [
  { value: "1", label: "Textiles del Norte S.A. de C.V." },
  { value: "2", label: "Confecciones Monterrey S.A." },
  { value: "3", label: "Industrial Uniformes del Bajío" },
  { value: "4", label: "Importaciones Tela Plus S.A." },
  { value: "5", label: "Global Fabrics México S.A. de C.V." },
  { value: "6", label: "Distribuidora Norteña de Insumos" },
  { value: "7", label: "Proveedora Nacional de Ropa S.A." },
];

const MONEDA_OPTIONS = [
  { value: "1", label: "MXN — Peso Mexicano" },
  { value: "2", label: "USD — Dólar Americano" },
];

// Formateador de moneda compartido
const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

interface PurchaseOrderMockFormProps {
  onSuccess: () => void;
}

export function PurchaseOrderMockForm({ onSuccess }: PurchaseOrderMockFormProps) {
  const [isPending, setIsPending] = useState(false);
  // Total derivado de los materiales seleccionados en el panel
  const [totalMateriales, setTotalMateriales] = useState(0);
  const today = new Date().toISOString().split("T")[0];

  // Simula el guardado con un pequeño delay visual
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setTimeout(() => {
      setIsPending(false);
      onSuccess();
    }, 700);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Sección: Proveedor y fechas ───────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <ComprasIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Datos Generales
            </h3>
            <p className="text-xs text-slate-500">Proveedor, fechas, moneda y referencia</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Proveedor */}
          <FormSelect
            label="Proveedor"
            name="proveedor"
            options={PROVEEDORES_OPTIONS}
            defaultValue=""
          >
            <option value="" disabled>
              Seleccionar proveedor...
            </option>
          </FormSelect>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Fecha OC"
              name="fecha_oc"
              type="date"
              defaultValue={today}
            />
            <FormInput
              label="Fecha Entrega Estimada"
              name="fecha_entrega_estimada"
              type="date"
              min={today}
            />
          </div>

          {/* Moneda y Referencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Moneda"
              name="moneda"
              options={MONEDA_OPTIONS}
              defaultValue="1"
            />
            <FormInput
              label="Referencia (OC del proveedor)"
              name="referencia"
              placeholder="Ej: REF-AB12CD34"
            />
          </div>

          {/* Observaciones */}
          <FormTextarea
            label="Observaciones"
            name="observaciones"
            placeholder="Notas adicionales sobre esta orden de compra..."
            rows={2}
          />
        </div>
      </section>

      {/* ── Sección: Materiales a comprar ─────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <ScissorsIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Materiales a Comprar
            </h3>
            <p className="text-xs text-slate-500">
              Selecciona materia prima e indica las cantidades requeridas
            </p>
          </div>
        </div>
        <div className="p-4">
          <MaterialSelectorPanel
            onLinesChange={(_, total) => setTotalMateriales(total)}
          />
        </div>
      </section>

      {/* ── Acciones + resumen de total ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 pt-1">
        {/* Total estimado de la orden */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total estimado
          </span>
          <span
            className={`text-lg font-bold tabular-nums transition-colors ${
              totalMateriales > 0 ? "text-sky-700 dark:text-sky-300" : "text-slate-300 dark:text-slate-600"
            }`}
          >
            {MXN.format(totalMateriales)}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <FormCancelButton onClick={onSuccess} label="Cancelar" />
          <FormSubmitButton isPending={isPending}>Guardar Orden</FormSubmitButton>
        </div>
      </div>
    </form>
  );
}
