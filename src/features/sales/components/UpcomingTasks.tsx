import { PlusIcon } from "../../../components/Icons";

type Task = {
  time: string;
  title: string;
  note?: string;
  accentClassName: string;
  dotClassName: string;
  titleClassName: string;
};

const TASKS: Task[] = [
  {
    time: "14:00 PM",
    title: "Llamada con Cliente X",
    note: "Revisión de requerimientos fase 2",
    accentClassName: "text-sky-600 dark:text-sky-400",
    dotClassName: "bg-sky-500",
    titleClassName: "font-bold text-slate-800 dark:text-white group-hover:text-sky-500 transition-colors",
  },
  {
    time: "Mañana, 09:30",
    title: "Revisar propuesta final",
    accentClassName: "text-slate-400",
    dotClassName: "bg-slate-300 dark:bg-slate-600 group-hover:bg-sky-500 transition-colors",
    titleClassName: "font-medium text-slate-700 dark:text-slate-300 group-hover:text-sky-500 transition-colors",
  },
  {
    time: "Jueves, 11:00",
    title: "Demo de producto",
    accentClassName: "text-slate-400",
    dotClassName: "bg-slate-300 dark:bg-slate-600 group-hover:bg-blue-500 transition-colors",
    titleClassName: "font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-500 transition-colors",
  },
];

export const UpcomingTasks = () => {
  return (
    <section className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Próximas Tareas</h3>
        <button
          type="button"
          aria-label="Agregar tarea"
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-500 transition-colors bg-slate-50 dark:bg-white/5 rounded-md"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-6">
        {TASKS.map((task) => (
          <div key={task.title} className="relative group">
            <div
              className={`absolute -left-5.25 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-black transition-colors ${task.dotClassName}`}
            />
            <div className="flex flex-col">
              <span className={`text-xs font-semibold mb-0.5 ${task.accentClassName}`}>{task.time}</span>
              <h4 className={`text-sm transition-colors cursor-pointer ${task.titleClassName}`}>{task.title}</h4>
              {task.note ? <p className="text-xs text-slate-500 mt-1">{task.note}</p> : null}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Ver calendario completo"
        className="w-full cursor-pointer mt-6 py-2 text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors border border-dashed border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"
      >
        Ver calendario completo
      </button>
    </section>
  );
};
