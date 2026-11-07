/**
 * Botón "Volver" de las páginas de detalle: ámbar para que se encuentre de un
 * vistazo (regresa a la lista o pestaña de donde vino el usuario). Va con un
 * `group`, así la flecha (`BACK_ARROW_CLASS`) se desliza al pasar el mouse.
 */
export const BACK_BUTTON_CLASS =
  "group inline-flex w-fit items-center gap-2 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold " +
  "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/80 " +
  "hover:bg-amber-100 hover:text-amber-800 " +
  "dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20 dark:hover:bg-amber-400/15 dark:hover:text-amber-200 " +
  "transition-colors "+
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900";

export const BACK_ARROW_CLASS = "w-4 h-4 transition-transform group-hover:-translate-x-0.5";
