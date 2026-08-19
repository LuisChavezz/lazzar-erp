"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { useCreateAvance } from "../hooks/useCreateAvance";
import {
  CreateAvanceFormSchema,
  type CreateAvanceFormField,
} from "../schemas/embroidery-avance.schema";
import { buildEmbroiderySkuLabel } from "../utils/embroiderySkuLabel";
import type {
  EmbroideryOrderDetailLine,
  ResumenAvancePorDetalle,
} from "../interfaces/embroidery.interface";

type FieldErrors = Partial<Record<CreateAvanceFormField, string>>;

interface EmbroideryCreateAvanceDialogProps {
  /** OB contra la que se registra el avance (va en el payload). */
  obId: number;
  /** Renglones de la orden — fuente de las opciones del selector de talla/SKU. */
  detalles: EmbroideryOrderDetailLine[];
  /** Desglose por renglón — da el contexto "programado / bordado" del selector. */
  porDetalle: ResumenAvancePorDetalle[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo de alta de un avance de bordado. El PRIMER campo es el renglón
 * (talla/SKU) contra el que se borda; los otros tres son piezas, puntadas y un
 * comentario opcional. El `usuario` NO se captura (backend lo inyecta) y
 * `pedido_detalle_talla` tampoco (backend lo autovincula desde el renglón).
 *
 * Inputs controlados + validación con `CreateAvanceFormSchema` en el submit. El
 * toast de éxito/error y la invalidación del detalle los hace `useCreateAvance`;
 * aquí solo se cierra y limpia al éxito, y se conserva abierto al error.
 */
export function EmbroideryCreateAvanceDialog({
  obId,
  detalles,
  porDetalle,
  open,
  onOpenChange,
}: EmbroideryCreateAvanceDialogProps) {
  const [ordenBordadoDetalle, setOrdenBordadoDetalle] = useState("");
  const [cantidadBordada, setCantidadBordada] = useState("");
  const [puntadasRealizadas, setPuntadasRealizadas] = useState("");
  const [comentario, setComentario] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const { mutate, isPending } = useCreateAvance();

  const reset = () => {
    setOrdenBordadoDetalle("");
    setCantidadBordada("");
    setPuntadasRealizadas("");
    setComentario("");
    setErrors({});
  };

  const handleOpenChange = (next: boolean) => {
    // Limpia al cerrar (X, Escape o Cancelar) para no arrastrar el borrador a
    // la próxima apertura.
    if (!next) reset();
    onOpenChange(next);
  };

  const clearFieldError = (field: CreateAvanceFormField) =>
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  // Las cantidades solo tienen sentido referidas a un renglón: sin uno elegido
  // no hay techo que respetar ni contexto que enseñar, así que sus campos
  // quedan inhabilitados hasta que se selecciona la talla/SKU.
  const hasSelectedLine = ordenBordadoDetalle !== "";

  // Contexto del renglón elegido: lo programado (del renglón) y lo ya bordado
  // (del desglose por detalle). El desglose incluye todos los renglones, así
  // que la búsqueda por id resuelve para cualquier opción seleccionada.
  const selectedId = Number(ordenBordadoDetalle);
  const selectedResumen = ordenBordadoDetalle
    ? porDetalle.find((row) => row.orden_bordado_detalle_id === selectedId)
    : undefined;
  const selectedDetalle = ordenBordadoDetalle
    ? detalles.find((linea) => linea.id === selectedId)
    : undefined;
  const programado =
    selectedResumen?.cantidad_programada ?? selectedDetalle?.cantidad ?? null;
  const bordado = selectedResumen?.cantidad_bordada ?? 0;

  // Piezas que aún caben en el renglón. `null` cuando no se conoce lo
  // programado (ningún renglón elegido, o uno sin cantidad): sin techo no hay
  // nada que bloquear. El tope es UNA REGLA DEL FRONTEND — el backend no la
  // impone, pero registrar más de lo programado nunca es correcto.
  const remaining = programado !== null ? programado - bordado : null;

  /**
   * Techo efectivo del input, con PISO y acotado a 0.
   *
   *  - Piso, porque las piezas son enteras: `OrdenBordadoDetalle.cantidad` es un
   *    `FloatField` y el pipeline de picking deja restantes fraccionarios (hay
   *    un 9.6 real). Sin el `Math.floor`, el clamp del `onChange` escribiría
   *    "8.6" en un campo `step="1"`: el navegador marcaría `stepMismatch` y se
   *    negaría a enviar el formulario con su tooltip genérico, sin que
   *    `handleSubmit` llegue a correr —ni error de Zod, ni toast—.
   *  - Acotado a 0, porque `remaining` sale NEGATIVO si un registro previo ya
   *    excedió lo programado, y un `max` negativo no admite ningún valor.
   */
  const remainingCap =
    remaining !== null ? Math.floor(Math.max(0, remaining)) : null;

  // Se compara contra el techo ENTERO, no contra `remaining`: un saldo de 0.6
  // no da ni para una prenda, así que la talla está completa a efectos
  // prácticos y el envío debe quedar bloqueado igual que con 0.
  const isLineComplete = remainingCap !== null && remainingCap < 1;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = CreateAvanceFormSchema.safeParse({
      orden_bordado_detalle: ordenBordadoDetalle,
      cantidad_bordada: cantidadBordada,
      puntadas_realizadas: puntadasRealizadas,
      comentario,
    });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as CreateAvanceFormField;
        if (field && !next[field]) next[field] = issue.message;
      }
      setErrors(next);
      return;
    }

    // Tope por renglón, ENCIMA de las reglas base del esquema: el saldo depende
    // del renglón elegido, así que no puede vivir en un Zod estático. Bloqueo
    // duro, sin escape: registrar más de lo programado no es un caso válido.
    const cantidad = Number(parsed.data.cantidad_bordada);
    if (remaining !== null && cantidad > remaining) {
      setErrors({
        cantidad_bordada: `No puede exceder las ${formatQuantityValue(remaining)} piezas restantes`,
      });
      return;
    }

    mutate(
      {
        ob: obId,
        orden_bordado_detalle: Number(parsed.data.orden_bordado_detalle),
        cantidad_bordada: Number(parsed.data.cantidad_bordada),
        puntadas_realizadas: Number(parsed.data.puntadas_realizadas),
        ...(parsed.data.comentario ? { comentario: parsed.data.comentario } : {}),
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  const fieldError = (field: CreateAvanceFormField) =>
    errors[field] ? { message: errors[field] } : undefined;

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="460px"
      showCloseButton={false}
      title="Registrar avance"
      description="Registra las piezas y puntadas bordadas en esta tanda."
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <div>
          <FormSelect
            label="Talla / SKU"
            value={ordenBordadoDetalle}
            disabled={isPending}
            error={fieldError("orden_bordado_detalle")}
            onChange={(event) => {
              setOrdenBordadoDetalle(event.target.value);
              clearFieldError("orden_bordado_detalle");
              // Las cantidades son de la tanda bordada en ESE renglón: al
              // cambiar de talla dejan de aplicar, así que se vacían junto con
              // sus errores (el techo del renglón anterior ya no rige). El
              // comentario NO se toca: puede ser una nota general del turno,
              // escrita antes de elegir la línea.
              setCantidadBordada("");
              setPuntadasRealizadas("");
              clearFieldError("cantidad_bordada");
              clearFieldError("puntadas_realizadas");
            }}
          >
            <option value="" disabled>
              Selecciona una talla o SKU
            </option>
            {detalles.map((linea) => (
              <option key={linea.id} value={linea.id}>
                {buildEmbroiderySkuLabel(linea)}
              </option>
            ))}
          </FormSelect>
          {selectedDetalle && (
            <p className="mt-1.5 ml-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Programado:{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                {programado !== null ? formatQuantityValue(programado) : "—"}
              </strong>{" "}
              · Bordado hasta ahora:{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                {formatQuantityValue(bordado)}
              </strong>{" "}
              · Restante:{" "}
              <strong
                className={
                  isLineComplete
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-700 dark:text-slate-200"
                }
              >
                {remainingCap !== null ? formatQuantityValue(remainingCap) : "—"}
              </strong>
            </p>
          )}
          {isLineComplete && (
            <p
              role="note"
              className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-300"
            >
              Esta talla ya está completa. No se pueden registrar más piezas.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Piezas bordadas"
            type="number"
            min="0"
            max={remainingCap ?? undefined}
            // Las piezas son ENTERAS: no se borda media prenda. El techo
            // (`remainingCap`) va con piso por lo mismo — ver su cálculo.
            step="1"
            inputMode="numeric"
            placeholder="0"
            value={cantidadBordada}
            disabled={isPending || !hasSelectedLine}
            error={fieldError("cantidad_bordada")}
            onChange={(event) => {
              const raw = event.target.value;
              // Recorta al restante en cuanto se teclea, para que el campo no
              // llegue a mostrar una cifra que el envío va a rechazar. Se
              // respeta la cadena vacía (el usuario está borrando o a medio
              // escribir) y cualquier valor no numérico que deja `type=number`
              // en estados intermedios. La validación del submit se conserva
              // como red de seguridad.
              const value = Number(raw);
              const next =
                raw !== "" &&
                remainingCap !== null &&
                Number.isFinite(value) &&
                value > remainingCap
                  ? String(remainingCap)
                  : raw;
              setCantidadBordada(next);
              clearFieldError("cantidad_bordada");
            }}
          />
          <FormInput
            label="Puntadas realizadas"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="0"
            value={puntadasRealizadas}
            disabled={isPending || !hasSelectedLine}
            error={fieldError("puntadas_realizadas")}
            onChange={(event) => {
              setPuntadasRealizadas(event.target.value);
              clearFieldError("puntadas_realizadas");
            }}
          />
        </div>
        <FormTextarea
          label="Comentario (opcional)"
          rows={3}
          placeholder="Turno, incidencias, notas…"
          value={comentario}
          disabled={isPending}
          error={fieldError("comentario")}
          onChange={(event) => {
            setComentario(event.target.value);
            clearFieldError("comentario");
          }}
        />
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton
            label="Cancelar"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          />
          {/* `disabled` DEBE incluir `isPending`: `FormSubmitButton` esparce
              `{...props}` después de su `disabled` interno, así que un
              `disabled` propio lo sobrescribe. */}
          <FormSubmitButton
            isPending={isPending}
            disabled={isPending || isLineComplete}
            loadingLabel="Registrando…"
          >
            Registrar avance
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}
