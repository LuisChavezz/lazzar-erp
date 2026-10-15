/**
 * Banner de error dentro de un diálogo de formulario: el motivo de un rechazo
 * del backend que no pertenece a un campo. No pinta nada sin `message`.
 * Extraído del diálogo de estatus de OP (`ProductionOrderStatusDialog`) sin
 * cambiar su markup; lo usa también el traslado de picking.
 */
export const FormErrorBanner = ({ message }: { message: string | null }) =>
  message ? (
    <p
      role="alert"
      className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/5 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-400"
    >
      {message}
    </p>
  ) : null;
