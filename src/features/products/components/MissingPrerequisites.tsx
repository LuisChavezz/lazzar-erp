import { InfoIcon } from "../../../components/Icons";

export default function MissingPrerequisites({ items }: { items: string[] }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm p-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <InfoIcon className="w-6 h-6" />
        </div>
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Faltan configuraciones para registrar productos
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Antes de crear un producto, registra los siguientes elementos:
            </p>
          </div>
          <ul className="list-disc pl-5 text-sm text-amber-700 dark:text-amber-300 space-y-1">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
