"use client";

import { useState } from "react";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { ScissorsIcon, InfoIcon } from "@/src/components/Icons";

// Opciones de surtido (reemplaza tipo de recibo)
const TIPO_SURTIDO_OPTIONS = [
  { value: 'completa', label: 'Surtido Completo' },
  { value: 'parcial', label: 'Surtido Parcial' },
];

const CLASIFICACION_OPTIONS = [
  { value: 'clasificacion_b', label: 'Clasificación B' },
  { value: 'ponchado_arreglo', label: 'Ponchado / Arreglo' },
  { value: 'externo', label: 'Externo' },
  { value: 'serigrafia', label: 'Serigrafía' },
];

const ESTATUS_HOJA_OPTIONS = [
  { value: 'sin_liberar', label: 'Sin Liberar' },
  { value: 'liberada', label: 'Liberada' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'terminada', label: 'Terminada' },
];

const BORDADORA_OPTIONS = [
  { value: 'Máquina 1', label: 'Máquina 1' },
  { value: 'Máquina 2', label: 'Máquina 2' },
  { value: 'Máquina 3', label: 'Máquina 3' },
  { value: 'Máquina 4', label: 'Máquina 4' },
  { value: 'Máquina 5', label: 'Máquina 5' },
  { value: 'Máquina 6', label: 'Máquina 6' },
];

const NIVEL_RACK_OPTIONS = [
  { value: 'superior', label: 'Nivel Superior (2 cabezas)' },
  { value: 'medio', label: 'Nivel Medio (4 cabezas)' },
  { value: 'inferior', label: 'Nivel Inferior (6 cabezas)' },
];

const MASUILERO_OPTIONS = [
  { value: 'Entretela fusionable 30g', label: 'Entretela fusionable 30g' },
  { value: 'Entretela tejida 50g', label: 'Entretela tejida 50g' },
  { value: 'Entretela no tejida 25g', label: 'Entretela no tejida 25g' },
  { value: 'Tela de corte libre', label: 'Tela de corte libre' },
  { value: 'Organza de estabilización', label: 'Organza de estabilización' },
];

// Lista predeterminada de artículos del pedido que llevan bordado
// En producción estos vendrían de la configuración del pedido
const ARTICULOS_PREDETERMINADOS = [
  { clave: 'A11665M', descripcion: 'Chamarra dama con bordado pecho', color: 'NEGRO', talla: 'M', cantidad: 24, bordados: 1, distribucion: 'Pecho izquierdo' },
  { clave: 'A10961GR', descripcion: 'Playera cuello redondo logotipo', color: 'GRIS', talla: 'L', cantidad: 48, bordados: 2, distribucion: 'Pecho izq. + Espalda' },
  { clave: 'B22301N', descripcion: 'Blusa manga larga bordada', color: 'BLANCO', talla: 'S', cantidad: 12, bordados: 1, distribucion: 'Pecho derecho' },
];

interface EmbroideryOrderMockFormProps {
  onSuccess: () => void;
}

export function EmbroideryOrderMockForm({ onSuccess }: EmbroideryOrderMockFormProps) {
  const [isPending, setIsPending] = useState(false);
  const today = new Date().toISOString().split('T')[0];

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

      {/* ── Sección: Datos Generales ────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <ScissorsIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Datos Generales
            </h3>
            <p className="text-xs text-slate-500">Pedido, cliente, clasificación y lote</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Pedido y cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Número de Pedido"
              name="pedido"
              placeholder="Ej: P98299"
            />
            <FormInput
              label="Cliente"
              name="cliente"
              placeholder="Ej: LIVERPOOL S.A. DE C.V."
            />
          </div>

          {/* Clasificación del pedido y masuilero */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Clasificación del Pedido"
              name="clasificacion_pedido"
              options={CLASIFICACION_OPTIONS}
              defaultValue="clasificacion_b"
            />
            <FormSelect
              label="Masuilero / Entretela"
              name="masuilero"
              options={MASUILERO_OPTIONS}
              defaultValue=""
            >
              <option value="" disabled>Seleccionar masuilero...</option>
            </FormSelect>
          </div>

          {/* Lote */}
          <FormInput
            label="Número de Lote"
            name="lote"
            placeholder="Ej: LOTE-AB12CD"
          />
        </div>
      </section>

      {/* ── Sección: Recepción desde Almacén ───────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            Recepción desde Almacén
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Surtido, prendas recibidas y fechas de entrega</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Tipo de surtido y total prendas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Surtido"
              name="tipo_surtido"
              options={TIPO_SURTIDO_OPTIONS}
              defaultValue="completa"
            />
            <FormInput
              label="Total Prendas Recibidas"
              name="total_prendas_recibidas"
              type="number"
              placeholder="Ej: 150"
              min="1"
            />
          </div>

          {/* Fechas de recibo y entrega del pedido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Fecha de Recibo"
              name="fecha_recibo"
              type="date"
              defaultValue={today}
            />
            <FormInput
              label="Fecha Entrega del Pedido"
              name="fecha_entrega_pedido"
              type="date"
            />
          </div>

          {/* Fecha entrega parcialidad */}
          <FormInput
            label="Fecha Entrega Parcialidad (si aplica)"
            name="fecha_entrega_parcialidad"
            type="date"
          />
        </div>
      </section>

      {/* ── Sección: Acomodo en Rack y OTB ─────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            Acomodo en Rack · Orden de Trabajo
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Nivel de rack, bordadora asignada y datos de la OTB
          </p>
        </div>
        <div className="p-5 space-y-4">
          {/* Nivel de rack y bordadora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Nivel de Rack"
              name="nivel_rack"
              options={NIVEL_RACK_OPTIONS}
              defaultValue=""
            >
              <option value="">Sin asignar</option>
            </FormSelect>
            <FormSelect
              label="Bordadora Asignada"
              name="numero_bordadora"
              options={BORDADORA_OPTIONS}
              defaultValue=""
            >
              <option value="">Sin asignar</option>
            </FormSelect>
          </div>

          {/* OTB y fecha OTB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Clave OTB"
              name="orden_trabajo_bordado"
              placeholder="Ej: OTB-1304"
            />
            <FormInput
              label="Fecha de OTB"
              name="fecha_otb"
              type="date"
            />
          </div>

          {/* Estatus hoja y fecha liberación cuadre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Estatus Hoja de Bordado"
              name="estatus_hoja"
              options={ESTATUS_HOJA_OPTIONS}
              defaultValue="sin_liberar"
            />
            <FormInput
              label="Fecha Liberación Cuadre"
              name="fecha_liberacion_cuadre"
              type="date"
            />
          </div>

          {/* Fin bordado estimado y fecha entrega a deshebrado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Fin de Bordado (estimado)"
              name="fin_bordado_estimado"
              type="date"
            />
            <FormInput
              label="Fecha Entrega a Deshebrado"
              name="fecha_entrega_deshebrado"
              type="date"
            />
          </div>
        </div>
      </section>

      {/* ── Sección: Artículos del Pedido (Cuadre de Prendas) ──────────── */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            Cuadre de Prendas
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Artículos del pedido que llevan bordado — predeterminados desde la configuración del pedido
          </p>
        </div>

        {/* Aviso informativo */}
        <div className="mx-5 mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20">
          <InfoIcon className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed">
            Los artículos se cargan automáticamente desde la configuración del pedido.
            Solo aquellos con servicio de bordado asignado aparecen aquí.
          </p>
        </div>

        {/* Tabla de artículos predeterminados — solo lectura */}
        <div className="p-5">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            {/* Encabezado de la tabla */}
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50 dark:bg-white/3 border-b border-slate-200 dark:border-white/10">
              <span className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Clave</span>
              <span className="col-span-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Descripción</span>
              <span className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Color / Talla</span>
              <span className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Piezas</span>
              <span className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Bordados</span>
            </div>

            {/* Filas de artículos */}
            {ARTICULOS_PREDETERMINADOS.map((art, idx) => (
              <div
                key={art.clave}
                className={`grid grid-cols-12 gap-3 px-4 py-3 items-center ${
                  idx < ARTICULOS_PREDETERMINADOS.length - 1
                    ? 'border-b border-slate-100 dark:border-white/5'
                    : ''
                }`}
              >
                <span className="col-span-2 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {art.clave}
                </span>
                <div className="col-span-4">
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-tight">{art.descripcion}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{art.distribucion}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300">{art.color}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{art.talla}</p>
                </div>
                <span className="col-span-2 text-xs font-semibold tabular-nums text-slate-800 dark:text-white text-right">
                  {art.cantidad}
                </span>
                <span className="col-span-2 text-right">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 text-xs font-bold">
                    {art.bordados}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Observaciones ───────────────────────────────────────────────── */}
      <FormTextarea
        label="Observaciones"
        name="observaciones"
        placeholder="Notas adicionales sobre esta orden de bordado..."
        rows={3}
      />

      {/* ── Acciones del formulario ─────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <FormCancelButton onClick={onSuccess} label="Cancelar" />
        <FormSubmitButton isPending={isPending}>
          Guardar Orden
        </FormSubmitButton>
      </div>
    </form>
  );
}
