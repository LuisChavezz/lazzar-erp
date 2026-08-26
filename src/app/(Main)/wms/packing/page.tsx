import { PackingView } from "@/src/features/packing/components/PackingView";

export default function PackingPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Empaque de mercancía surtida por picking: registro de cajas, peso y
          volumen previo al envío.
        </p>
      </div>

      <PackingView />
    </div>
  );
}
