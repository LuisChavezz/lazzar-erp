import { CollectionStats } from "@/src/features/collections/components/CollectionStats";
import { CollectionList } from "@/src/features/collections/components/CollectionList";

export default function CollectionsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Cobros de clientes aplicados contra cuentas por cobrar.
        </p>
      </div>

      <CollectionStats />

      <div className="space-y-6">
        <CollectionList />
      </div>
    </div>
  );
}
