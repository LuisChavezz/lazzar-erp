/**
 * Grupo de campos de un formulario con un encabezado ligero (sin tarjeta):
 * título + descripción corta sobre una línea divisoria, para ordenar un alta
 * larga sin recargarla.
 */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2 border-b border-slate-100 dark:border-white/10 pb-1.5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  );
}
