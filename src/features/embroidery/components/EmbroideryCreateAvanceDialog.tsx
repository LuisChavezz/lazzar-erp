"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { pluralForQuantity } from "@/src/utils/plural";
import { useCreateAvance } from "../hooks/useCreateAvance";
import {
  CreateAvanceFormSchema,
  type CreateAvanceFormField,
} from "../schemas/embroidery-avance.schema";

type FieldErrors = Partial<Record<CreateAvanceFormField, string>>;

interface EmbroideryCreateAvanceDialogProps {
  /** OB contra la que se registra el avance (va en el payload). */
  obId: number;
  /** Piezas programadas en TODA la OB (`resumen_avance.cantidad_programada`). */
  programado: number;
  /** Piezas ya bordadas en TODA la OB (`resumen_avance.cantidad_bordada_total`). */
  bordado: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo de alta de un avance de bordado, capturado POR OB (EC-491): piezas,
 * puntadas POR PIEZA y un comentario opcional, con el total de puntadas
 * anticipado bajo los dos números. No hay renglón (talla/SKU) que elegir: el
 * backend ya no lo persiste. El `usuario` NO se captura (backend lo inyecta) y
 * `puntadas_total` tampoco, porque el backend lo calcula.
 *
 * Inputs controlados + validación con `CreateAvanceFormSchema` en el submit. El
 * toast de éxito/error y la invalidación del detalle los hace `useCreateAvance`;
 * aquí solo se cierra y limpia al éxito, y se conserva abierto al error.
 */
export function EmbroideryCreateAvanceDialog({
  obId,
  programado,
  bordado,
  open,
  onOpenChange,
}: EmbroideryCreateAvanceDialogProps) {
  const [cantidadBordada, setCantidadBordada] = useState("");
  const [puntadasPorPieza, setPuntadasPorPieza] = useState("");
  const [comentario, setComentario] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const { mutate, isPending } = useCreateAvance();

  const reset = () => {
    setCantidadBordada("");
    setPuntadasPorPieza("");
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

  // Piezas que aún caben en la OB: lo programado en TODA la orden menos lo ya
  // bordado. El tope es UNA REGLA DEL FRONTEND — el backend no la impone, pero
  // registrar más de lo programado nunca es correcto.
  const remaining = programado - bordado;

  /**
   * Techo efectivo del input, con PISO y acotado a 0.
   *
   *  - Piso, porque las piezas son enteras: `OrdenBordadoDetalle.cantidad` es un
   *    `FloatField` y el pipeline de picking deja restantes fraccionarios (hay
   *    un 9.6 real). Sin el `Math.floor`, el clamp del `onChange` escribiría
   *    "8.6" en un campo `step="1"`: el navegador marcaría `stepMismatch` y se
   *    negaría a enviar el formulario con su tooltip genérico, sin que
   *    `handleSubmit` llegue a correr —ni error de Zod, ni toast—.
   *  - Acotado a 0, porque `remaining` sale NEGATIVO si los avances ya
   *    excedieron lo programado, y un `max` negativo no admite ningún valor.
   */
  const remainingCap = Math.floor(Math.max(0, remaining));

  // Se compara contra el techo ENTERO, no contra `remaining`: un saldo de 0.6
  // no da ni para una prenda, así que la OB está completa a efectos prácticos y
  // el envío debe quedar bloqueado igual que con 0.
  const isOrderComplete = remainingCap < 1;

  /**
   * Vista previa de `puntadas_total`, la MISMA cuenta que hará el backend
   * (`round(por_pieza × cantidad)`). Es informativa: no viaja en el payload,
   * porque el servidor la calcula. `null` mientras falte cualquiera de los dos
   * factores o alguno sea 0 — un total de 0 puntadas no es un dato que enseñar,
   * es la ausencia de él.
   */
  const puntadasTotalPreview = (() => {
    const porPieza = Number(puntadasPorPieza);
    const piezas = Number(cantidadBordada);
    if (!Number.isFinite(porPieza) || !Number.isFinite(piezas)) return null;
    if (porPieza <= 0 || piezas <= 0) return null;
    return Math.round(porPieza * piezas);
  })();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = CreateAvanceFormSchema.safeParse({
      cantidad_bordada: cantidadBordada,
      puntadas_por_pieza: puntadasPorPieza,
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

    // Tope de la OB, ENCIMA de las reglas base del esquema: el saldo depende de
    // los avances ya registrados, así que no puede vivir en un Zod estático.
    // Bloqueo duro, sin escape: registrar más de lo programado no es un caso
    // válido.
    const cantidad = Number(parsed.data.cantidad_bordada);
    if (cantidad > remainingCap) {
      setErrors({
        cantidad_bordada: `No puede exceder ${formatQuantityValue(remainingCap)} ${pluralForQuantity(remainingCap, "pieza restante", "piezas restantes")} de la orden`,
      });
      return;
    }

    mutate(
      {
        ob: obId,
        cantidad_bordada: cantidad,
        puntadas_por_pieza: Number(parsed.data.puntadas_por_pieza),
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
      description="Registra las piezas bordadas de la orden en esta tanda y las puntadas de cada una."
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <div>
          <p className="ml-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Programado en la orden:{" "}
            <strong className="text-slate-700 dark:text-slate-200">
              {formatQuantityValue(programado)}
            </strong>{" "}
            · Bordado hasta ahora:{" "}
            <strong className="text-slate-700 dark:text-slate-200">
              {formatQuantityValue(bordado)}
            </strong>{" "}
            · Restante:{" "}
            <strong
              className={
                isOrderComplete
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-700 dark:text-slate-200"
              }
            >
              {formatQuantityValue(remainingCap)}
            </strong>
          </p>
          {isOrderComplete && (
            <p
              role="note"
              className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-300"
            >
              Lo bordado ya cubre todas las piezas programadas en esta orden, así que
              aquí no se registran más avances.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Piezas bordadas"
            type="number"
            min="0"
            max={remainingCap}
            // Las piezas son ENTERAS: no se borda media prenda. El techo
            // (`remainingCap`) va con piso por lo mismo — ver su cálculo.
            step="1"
            inputMode="numeric"
            placeholder="0"
            value={cantidadBordada}
            disabled={isPending || isOrderComplete}
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
                raw !== "" && Number.isFinite(value) && value > remainingCap
                  ? String(remainingCap)
                  : raw;
              setCantidadBordada(next);
              clearFieldError("cantidad_bordada");
            }}
          />
          {/* Puntadas de UNA prenda, no de la tanda: el total lo multiplica el
              backend. Sin techo — el ponchado no tiene límite conocido. */}
          <FormInput
            label="Puntadas por pieza"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="0"
            value={puntadasPorPieza}
            disabled={isPending || isOrderComplete}
            error={fieldError("puntadas_por_pieza")}
            onChange={(event) => {
              setPuntadasPorPieza(event.target.value);
              clearFieldError("puntadas_por_pieza");
            }}
          />
        </div>
        {/* Anticipo de `puntadas_total`. Se pinta SIEMPRE que se pueda capturar
            (con guion largo mientras falten factores) y no solo cuando hay
            cifra: apareciendo y desapareciendo movería los campos de abajo a
            cada tecla. */}
        {!isOrderComplete && (
          <p className="-mt-2 ml-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Total:{" "}
            <strong className="text-slate-700 dark:text-slate-200">
              {puntadasTotalPreview !== null
                ? `${formatQuantityValue(puntadasTotalPreview)} ${pluralForQuantity(puntadasTotalPreview, "puntada", "puntadas")}`
                : "—"}
            </strong>{" "}
            <span className="text-slate-400 dark:text-slate-500">
              (puntadas por pieza × piezas bordadas)
            </span>
          </p>
        )}
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
            disabled={isPending || isOrderComplete}
            loadingLabel="Registrando…"
          >
            Registrar avance
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}
