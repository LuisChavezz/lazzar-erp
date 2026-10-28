"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { CheckCircleIcon } from "@/src/components/Icons";
import {
  ESTATUS_PAQUETE_TECNICO_OPTIONS,
  EXISTENCE_FIELDS,
} from "../constants/criticalPathChoices";
import { useCriticalPathForm } from "../hooks/useCriticalPathForm";
import type { ProductionOrderCriticalPath } from "../interfaces/production-order-critical-path.interface";
import type {
  CriticalPathField,
  CriticalPathValues,
} from "../schemas/production-order-critical-path.schema";
import { formatCriticalPathDateTime } from "../utils/criticalPathFormat";
import type { DATE_FIELDS } from "../utils/criticalPathForm";

/** Solo los campos de fecha reales: `renderDate` no acepta otro string. */
type DateField = (typeof DATE_FIELDS)[number];

type BooleanField = {
  [K in CriticalPathField]: CriticalPathValues[K] extends boolean ? K : never;
}[CriticalPathField];

/**
 * Etapas de la ruta crítica, en el orden del backend, con el dato GUARDADO que
 * marca cada una como cumplida. Solo alimentan el resumen de avance y el
 * encabezado de cada sección: no cambian qué se captura ni qué se envía.
 */
const STAGES = [
  { key: "desarrollo", title: "Desarrollo de producto", isDone: (d: ProductionOrderCriticalPath) => Boolean(d.fecha_liberacion_paquete_tecnico) },
  { key: "telas", title: "Telas y avíos", isDone: (d: ProductionOrderCriticalPath) => Boolean(d.kit_completo) },
  { key: "trazo", title: "Trazo", isDone: (d: ProductionOrderCriticalPath) => Boolean(d.fecha_trazo) },
  { key: "corte", title: "Corte", isDone: (d: ProductionOrderCriticalPath) => Boolean(d.fecha_real_corte) },
  { key: "produccion", title: "Producción", isDone: (d: ProductionOrderCriticalPath) => Boolean(d.corte_recibido) },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

const stageId = (key: StageKey) => `ruta-critica-${key}`;

/** Encabezado de una etapa: número (o palomita si ya se cumplió) y nombre. */
function StageHeader({ index, title, done }: { index: number; title: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span
        className={`grid place-items-center w-6 h-6 shrink-0 rounded-full text-[11px] font-bold ${
          done
            ? "bg-emerald-500 text-white"
            : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
        }`}
        aria-hidden="true"
      >
        {done ? <CheckCircleIcon className="w-3.5 h-3.5" /> : index + 1}
      </span>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h3>
      {done && (
        <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
          Completada
        </span>
      )}
    </div>
  );
}

/**
 * Resumen de avance sobre el formulario: cuántas etapas están cumplidas (según
 * lo guardado) y un paso por etapa. Cada paso lleva a su sección.
 */
function StageProgress({ data }: { data: ProductionOrderCriticalPath }) {
  const done = STAGES.filter((stage) => stage.isDone(data)).length;
  const pct = Math.round((done / STAGES.length) * 100);
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Avance de la ruta crítica
        </p>
        <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-800 dark:text-white">{done}</span> de{" "}
          {STAGES.length} etapas · {pct}%
        </p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="grid grid-cols-5 gap-1.5">
        {STAGES.map((stage, index) => {
          const isDone = stage.isDone(data);
          return (
            <li key={stage.key}>
              <button
                type="button"
                onClick={() =>
                  document.getElementById(stageId(stage.key))?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className={`w-full rounded-lg px-1.5 py-1.5 text-center transition-colors cursor-pointer ${
                  isDone
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-black/20 dark:text-slate-400 dark:hover:bg-white/10"
                }`}
                title={`Ir a ${stage.title}`}
              >
                <span className="block text-[10px] font-bold">{isDone ? "✓" : index + 1}</span>
                <span className="block truncate text-[10px] font-medium leading-tight">{stage.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface CriticalPathFormProps {
  opId: number;
  data: ProductionOrderCriticalPath;
  /**
   * Aviso de OP cerrada (Completada o Cancelada), o `null` si se puede editar.
   * Con aviso el formulario es de solo lectura: campos deshabilitados y sin
   * botón de guardar.
   */
  readOnlyNotice: string | null;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (updatedAt: string | null) => void;
  /** El PATCH respondió 409: la OP se cerró con el diálogo abierto. */
  onOpClosed: () => void;
}

/**
 * Captura de la ruta crítica, por subproceso en el orden del backend. Cada
 * subproceso es su propia `<section>`: uno nuevo (p. ej. "Compras", que aún no
 * tiene campos) se agrega como otra sección sin reacomodar las demás.
 *
 * Editable para cualquiera que vea la OP: el permiso lo decide el servidor
 * (400 `permiso`, que se muestra tal cual). Por ESTATUS sí hay restricción: el
 * backend rechaza el PATCH (409) en una OP Completada o Cancelada, así que el
 * diálogo pasa `readOnlyNotice` y el formulario queda de solo lectura (todo
 * deshabilitado, sin guardar). Sin exclusión entre las casillas de existencia: el backend no la
 * aplica.
 */
export function CriticalPathForm({
  opId,
  data,
  readOnlyNotice,
  onClose,
  onDirtyChange,
  onSaved,
  onOpClosed,
}: CriticalPathFormProps) {
  const readOnly = readOnlyNotice !== null;
  const { form, isPending, hasChanges, getError, clearFieldErrors, validateField, handleFormSubmit } =
    useCriticalPathForm({ opId, data, readOnly, onDirtyChange, onSaved, onOpClosed });

  const renderDate = (name: DateField, label: string) => (
    <form.Field key={name} name={name}>
      {(field) => (
        <FormInput
          label={label}
          type="date"
          className="dark:scheme-dark py-2!"
          name={field.name}
          value={field.state.value}
          error={getError(name)}
          onChange={(event) => {
            field.handleChange(event.target.value);
            clearFieldErrors(name);
          }}
          onBlur={() => {
            field.handleBlur();
            validateField(name, form.state.values);
          }}
        />
      )}
    </form.Field>
  );

  // Casilla nativa dentro de un `<label>` en tarjeta (mismo patrón que los
  // roles y sucursales de `UserForm`): toda la tarjeta es clicable y el teclado
  // (Tab + espacio) funciona sin código propio. `footnote` recibe el valor
  // CAPTURADO de la casilla, por si la nota depende de él y no solo de lo
  // guardado. Deshabilitada (envío en curso o solo lectura), la tarjeta deja de
  // verse clicable.
  const renderCheckbox = (
    name: BooleanField,
    label: string,
    footnote?: (checked: boolean) => React.ReactNode
  ) => (
    <form.Field key={name} name={name}>
      {(field) => (
        <div>
          <label className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:border-sky-500 dark:hover:border-sky-500 cursor-pointer transition-colors bg-slate-50/50 dark:bg-white/5 has-disabled:cursor-not-allowed has-disabled:opacity-60 has-disabled:hover:border-slate-200 dark:has-disabled:hover:border-white/10">
            <input
              type="checkbox"
              name={field.name}
              checked={field.state.value as boolean}
              onChange={(event) => {
                field.handleChange(event.target.checked);
                clearFieldErrors(name);
              }}
              onBlur={field.handleBlur}
              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
          </label>
          {footnote?.(field.state.value as boolean)}
          {getError(name) && (
            <p className="ml-1 mt-1 text-xs text-red-600 font-medium">{getError(name)?.message}</p>
          )}
        </div>
      )}
    </form.Field>
  );

  return (
    // `noValidate`: todas las reglas las muestra Zod con su mensaje, nunca el
    // globo nativo del navegador.
    <form onSubmit={handleFormSubmit} noValidate>
      <StageProgress data={data} />
      {/* Solo esta región hace scroll; el pie queda siempre visible. El diálogo
          de Radix no tiene altura máxima (el scroll es del overlay), así que un
          pie `sticky` no tendría contra qué pegarse: la altura se acota aquí.
          El `calc` descuenta título, descripción, "Última actualización", pie
          y márgenes del diálogo. El aviso de solo lectura va DENTRO de la
          región, no encima: así no suma altura que el `calc` no descuenta. */}
      <div className="max-h-[calc(100dvh-25rem)] min-h-32 overflow-y-auto -mx-1 px-1 py-1">
        {readOnlyNotice && (
          <p
            role="status"
            className="mb-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 px-4 py-3 text-xs font-medium text-amber-700 dark:text-amber-400"
          >
            {readOnlyNotice}
          </p>
        )}
        <fieldset disabled={isPending || readOnly} className="space-y-4">
          {/* ── Desarrollo de producto ─────────────────────────────────── */}
          <section id={stageId("desarrollo")} className="scroll-mt-2">
            <StageHeader index={0} title="Desarrollo de producto" done={STAGES[0].isDone(data)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderDate("fecha_liberacion_paquete_tecnico", "Liberación del paquete técnico")}
              <form.Field name="estatus_paquete_tecnico">
                {(field) => (
                  <FormSelect
                    label="Estatus del paquete técnico"
                    className="py-2!"
                    name={field.name}
                    value={field.state.value}
                    error={getError("estatus_paquete_tecnico")}
                    onChange={(event) => {
                      field.handleChange(event.target.value as CriticalPathValues["estatus_paquete_tecnico"]);
                      clearFieldErrors("estatus_paquete_tecnico");
                    }}
                    onBlur={field.handleBlur}
                  >
                    <option value="">Sin estatus</option>
                    {ESTATUS_PAQUETE_TECNICO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>
            </div>
          </section>

          {/* ── Telas y avíos ──────────────────────────────────────────── */}
          <section id={stageId("telas")} className="scroll-mt-2 border-t border-slate-100 dark:border-white/10 pt-4">
            <StageHeader index={1} title="Telas y avíos" done={STAGES[1].isDone(data)} />
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {EXISTENCE_FIELDS.map(({ field, stamp, label }) =>
                  renderCheckbox(
                    field,
                    label,
                    // Sello del servidor de las casillas de EXISTENCIA: cambia
                    // cada vez que la casilla cambia de valor, también al
                    // desmarcarla. Refleja lo GUARDADO; sin sello no se pinta nada.
                    () =>
                      data[stamp] ? (
                        <p className="ml-1 mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                          Último cambio: {formatCriticalPathDateTime(data[stamp])}
                        </p>
                      ) : undefined
                  )
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderDate("fecha_real_surtido_telas", "Surtido real de telas")}
                {renderDate("fecha_real_surtido_avios", "Surtido real de avíos")}
                {renderDate("fecha_embarque_materia_prima", "Embarque de materia prima")}
                {renderDate("fecha_llegada_centro_confeccion", "Llegada al centro de confección")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderCheckbox("corte_externo", "Corte externo")}
                {renderCheckbox("kit_completo", "Kit completo", (checked) => (
                  // Sello del kit, con otra semántica que los de existencia: el
                  // servidor lo pone al marcar y lo BORRA al desmarcar. La nota
                  // refleja lo GUARDADO (un registro anterior al campo puede
                  // estar marcado sin sello); el aviso compara lo capturado
                  // contra lo guardado y se va si se vuelve a marcar.
                  <>
                    {data.kit_completo &&
                      (data.fecha_kit_completo ? (
                        <p className="ml-1 mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                          Completado: {formatCriticalPathDateTime(data.fecha_kit_completo)}
                        </p>
                      ) : (
                        <p className="ml-1 mt-1 text-[11px] italic text-slate-400 dark:text-slate-500">
                          Sin fecha registrada
                        </p>
                      ))}
                    {!checked && data.kit_completo && data.fecha_kit_completo && (
                      <p
                        role="status"
                        className="ml-1 mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400"
                      >
                        Al guardar se borrará la fecha de completado
                      </p>
                    )}
                  </>
                ))}
              </div>
              <form.Field name="comentarios_telas_avios">
                {(field) => (
                  <FormTextarea
                    label="Comentarios de telas y avíos"
                    name={field.name}
                    rows={2}
                    forceUppercase
                    placeholder="Notas sobre telas y avíos (opcional)"
                    value={field.state.value}
                    error={getError("comentarios_telas_avios")}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("comentarios_telas_avios");
                    }}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            </div>
          </section>

          {/* ── Trazo ─────────────────────────────────────────────────── */}
          <section id={stageId("trazo")} className="scroll-mt-2 border-t border-slate-100 dark:border-white/10 pt-4">
            <StageHeader index={2} title="Trazo" done={STAGES[2].isDone(data)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderDate("fecha_trazo", "Fecha de trazo")}
            </div>
          </section>

          {/* ── Corte ─────────────────────────────────────────────────── */}
          <section id={stageId("corte")} className="scroll-mt-2 border-t border-slate-100 dark:border-white/10 pt-4">
            <StageHeader index={3} title="Corte" done={STAGES[3].isDone(data)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderDate("fecha_real_corte", "Fecha real de corte")}
              <form.Field name="cantidad_real_corte">
                {(field) => (
                  <div>
                    <FormInput
                      label="Cantidad real de corte (pzas)"
                      className="py-2!"
                      // Texto y NO `type="number"`: ese input reporta "" ante
                      // texto que no parsea ("12e") —y el PATCH borraba la
                      // cantidad con `null`—, descarta la coma al pegar ("12,5"
                      // → 125) y cambia con la rueda. Aquí lo tecleado se queda
                      // tal cual y el schema lo rechaza si no es un entero.
                      inputMode="numeric"
                      placeholder="0"
                      name={field.name}
                      value={field.state.value}
                      error={getError("cantidad_real_corte")}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("cantidad_real_corte");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("cantidad_real_corte", form.state.values);
                      }}
                    />
                    {/* El PATCH de la ruta crítica guarda la cantidad pero no
                        toca consumos ni inventario; eso lo hace "Recalcular
                        consumos" en el detalle de la OP. */}
                    <p className="ml-1 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      Cambiar esta cantidad no recalcula consumos; hazlo desde el detalle de la OP.
                    </p>
                  </div>
                )}
              </form.Field>
            </div>
          </section>

          {/* ── Producción ────────────────────────────────────────────── */}
          <section id={stageId("produccion")} className="scroll-mt-2 border-t border-slate-100 dark:border-white/10 pt-4">
            <StageHeader index={4} title="Producción" done={STAGES[4].isDone(data)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderCheckbox("corte_recibido", "Corte recibido")}
            </div>
          </section>
        </fieldset>
      </div>

      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <div className="flex justify-end gap-3 pt-4 mt-1 border-t border-slate-100 dark:border-white/10">
            <FormCancelButton label="Cerrar" onClick={onClose} disabled={isPending} />
            {/* Solo lectura: sin botón de guardar, no uno deshabilitado. */}
            {!readOnly && (
              <FormSubmitButton
                isPending={isPending}
                loadingLabel="Guardando…"
                disabled={!hasChanges(values)}
                title={hasChanges(values) ? undefined : "No hay cambios que guardar"}
              >
                Guardar cambios
              </FormSubmitButton>
            )}
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
