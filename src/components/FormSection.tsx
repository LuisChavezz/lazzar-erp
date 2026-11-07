/**
 * Grupo de campos de un formulario con un encabezado ligero (sin tarjeta):
 * título + descripción corta (opcional) sobre una línea divisoria, para
 * ordenar un alta larga sin recargarla.
 *
 * `action` (opcional) se pinta a la derecha del título, en la misma línea: un
 * botón o unos controles que actúan sobre la sección entera (p. ej. "Agregar
 * nuevo cliente"). Sin él, el encabezado queda exactamente como siempre.
 */
export function FormSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const heading = (
    <>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h3>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
    </>
  );
  return (
    <section className="space-y-3">
      {action ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-white/10 pb-1.5">
          <div className="flex items-baseline gap-2">{heading}</div>
          <div className="flex flex-wrap items-center gap-3">{action}</div>
        </div>
      ) : (
        <div className="flex items-baseline gap-2 border-b border-slate-100 dark:border-white/10 pb-1.5">
          {heading}
        </div>
      )}
      {children}
    </section>
  );
}
