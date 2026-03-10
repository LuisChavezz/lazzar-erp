'use client'

import { useMemo, useState } from "react";
import { compareAsc, parseISO } from "date-fns";
import { PlusIcon } from "../../../components/Icons";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import UpcomingTaskForm from "./UpcomingTaskForm";
import { useUpcomingTasksStore } from "../stores/upcoming-tasks.store";
import { formatTaskTime } from "../utils/formatTaskTime";
import { getTaskStyles } from "../utils/getTaskStyles";


export const UpcomingTasks = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Estado para controlar la apertura del diálogo
  const tasks = useUpcomingTasksStore((state) => state.tasks); // Obtener las tareas del store

  // Filtrar y ordenar las tareas futuras
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .map((task) => {
        const parsed = parseISO(task.dueDate);
        return { task, parsed };
      })
      .filter((item) => !Number.isNaN(item.parsed.getTime()) && item.parsed >= now)
      .sort((a, b) => compareAsc(a.parsed, b.parsed))
      .slice(0, 3);
  }, [tasks]); // Recalcular cuando cambian las tareas

  return (
    <section className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Próximas Tareas</h3>
        <button
          type="button"
          aria-label="Agregar tarea"
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-500 transition-colors bg-slate-50 dark:bg-white/5 rounded-md"
          onClick={() => setIsDialogOpen(true)}
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-6">
        {upcomingTasks.map(({ task, parsed }, index) => {
          const styles = getTaskStyles(index);
          return (
            <div key={task.id} className="relative group">
              <div
                className={`absolute -left-5.25 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-black transition-colors ${styles.dotClassName}`}
              />
              <div className="flex flex-col">
                <span className={`text-xs font-semibold mb-0.5 ${styles.accentClassName}`}>
                  {formatTaskTime(parsed)}
                </span>
                <h4 className={`text-sm transition-colors cursor-pointer ${styles.titleClassName}`}>
                  {task.title}
                </h4>
                {task.shortDescription ? (
                  <p className="text-xs text-slate-500 mt-1">{task.shortDescription}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Ver calendario completo"
        className="w-full cursor-pointer mt-6 py-2 text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors border border-dashed border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"
      >
        Ver calendario completo
      </button>

      <MainDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        maxWidth="720px"
        title={
          <DialogHeader
            title="Nueva tarea"
            subtitle="Seguimiento CRM y ventas"
            statusColor="sky"
          />
        }
      >
        <UpcomingTaskForm onSuccess={() => setIsDialogOpen(false)} />
      </MainDialog>
    </section>
  );
};
