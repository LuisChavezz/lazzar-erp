
// Obtiene los estilos de una tarea basado en su índice
export function getTaskStyles(index: number) {
  if (index === 0) {
    return {
      accentClassName: "text-sky-600 dark:text-sky-400",
      dotClassName: "bg-sky-500",
      titleClassName:
        "font-bold text-slate-800 dark:text-white group-hover:text-sky-500 transition-colors",
    };
  }
  return {
    accentClassName: "text-slate-400",
    dotClassName: "bg-slate-300 dark:bg-slate-600 group-hover:bg-sky-500 transition-colors",
    titleClassName:
      "font-medium text-slate-700 dark:text-slate-300 group-hover:text-sky-500 transition-colors",
  };
};